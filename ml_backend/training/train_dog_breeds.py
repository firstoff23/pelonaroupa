"""
AnimalMind — ViT Dog Breed Classifier Training & Temperature Scaling Pipeline
================================================================================
Target Accuracy: > 90%

Improvements v2:
  - Class-weighted CrossEntropyLoss to handle breed imbalance
  - Gradual ViT unfreezing (--unfreeze-epoch N)
  - Weights & Biases experiment tracking (--use-wandb)
  - Reliability diagram / calibration curve saved to output_dir
  - MixUp augmentation (--mixup-alpha 0.4)

Usage:
  python -m training.train_dog_breeds --batch-size 32 --epochs 50
  python -m training.train_dog_breeds --dry-run
  python -m training.train_dog_breeds --push-to-hub firstoff/animalmind-breed-classifier
  python -m training.train_dog_breeds --use-wandb --wandb-project animalmind-dogs
"""

import argparse
import copy
import json
import os
import pathlib
import sys
import time
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms


# --- Temperature Scaling Model ---
class ModelWithTemperature(nn.Module):
    """
    A thin decorator box around a classification model to calibrate its probabilities
    using Temperature Scaling (Platt Scaling extension).
    """

    def __init__(self, model: nn.Module):
        super().__init__()
        self.model = model
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, input):
        logits = self.model(input)
        if hasattr(logits, "logits"):
            logits = logits.logits
        return self.scale_logits(logits)

    def scale_logits(self, logits):
        temperature = self.temperature.unsqueeze(1).expand(logits.size(0), logits.size(1))
        return logits / temperature

    def set_temperature(self, valid_loader, device="cpu"):
        """
        Tunes the temperature of the model (using L-BFGS) on the validation set.
        """
        self.to(device)
        nll_criterion = nn.CrossEntropyLoss().to(device)

        # Collect all validation logits and labels
        logits_list = []
        labels_list = []
        with torch.no_grad():
            for input, label in valid_loader:
                input = input.to(device)
                logits = self.model(input)
                if hasattr(logits, "logits"):
                    logits = logits.logits
                logits_list.append(logits)
                labels_list.append(label)

        logits = torch.cat(logits_list).to(device)
        labels = torch.cat(labels_list).to(device)

        # Optimize temperature
        optimizer = torch.optim.LBFGS([self.temperature], lr=0.01, max_iter=50)

        def eval_loss():
            optimizer.zero_grad()
            loss = nll_criterion(self.scale_logits(logits), labels)
            loss.backward()
            return loss

        optimizer.step(eval_loss)
        calibrated_temp = float(self.temperature.item())
        print(f"[Calib] Calibrated Temperature parameter T = {calibrated_temp:.4f}")
        return calibrated_temp


# --- Expected Calibration Error (ECE) ---
def compute_ece(preds: np.ndarray, labels: np.ndarray, n_bins: int = 15) -> float:
    """Computes Expected Calibration Error (ECE)."""
    confidences = np.max(preds, axis=1)
    predictions = np.argmax(preds, axis=1)
    accuracies = predictions == labels

    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        in_bin = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(accuracies[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(accuracy_in_bin - avg_confidence_in_bin) * prop_in_bin

    return float(ece)


def save_reliability_diagram(preds: np.ndarray, labels: np.ndarray, output_path: pathlib.Path, n_bins: int = 15):
    """Saves a reliability diagram (calibration curve) as a PNG image."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        confidences = np.max(preds, axis=1)
        predictions = np.argmax(preds, axis=1)
        accuracies_arr = predictions == labels

        bin_boundaries = np.linspace(0, 1, n_bins + 1)
        bin_centers = (bin_boundaries[:-1] + bin_boundaries[1:]) / 2
        bin_accs, bin_confs = [], []

        for i in range(n_bins):
            in_bin = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
            if np.mean(in_bin) > 0:
                bin_accs.append(float(np.mean(accuracies_arr[in_bin])))
                bin_confs.append(float(np.mean(confidences[in_bin])))
            else:
                bin_accs.append(0.0)
                bin_confs.append(float(bin_centers[i]))

        fig, ax = plt.subplots(figsize=(6, 6))
        ax.plot([0, 1], [0, 1], linestyle="--", color="grey", label="Perfect calibration")
        ax.bar(bin_centers, bin_accs, width=1 / n_bins, alpha=0.7, edgecolor="black", label="Model accuracy")
        ax.set_xlabel("Confidence")
        ax.set_ylabel("Accuracy")
        ax.set_title("Reliability Diagram — Dog Breed Classifier")
        ax.legend()
        plt.tight_layout()
        plt.savefig(str(output_path), dpi=150)
        plt.close()
        print(f"[Calib] Reliability diagram saved to {output_path}")
    except ImportError:
        print("[Calib] matplotlib not available — skipping reliability diagram. Install with: pip install matplotlib")


# --- Model Exponential Moving Average (EMA) ---
class ModelEMA:
    """Maintains moving averages of model parameters."""

    def __init__(self, model: nn.Module, decay: float = 0.9999):
        self.decay = decay
        self.ema_model = copy.deepcopy(model).eval()
        for p in self.ema_model.parameters():
            p.requires_grad_(False)

    def update(self, model: nn.Module):
        with torch.no_grad():
            for ema_param, param in zip(self.ema_model.parameters(), model.parameters()):
                ema_param.data.mul_(self.decay).add_(param.data, alpha=1 - self.decay)


# --- MixUp augmentation ---
def mixup_data(x: torch.Tensor, y: torch.Tensor, alpha: float = 0.4):
    """Returns mixed inputs, pairs of targets, and lambda for MixUp."""
    lam = float(np.random.beta(alpha, alpha)) if alpha > 0 else 1.0
    index = torch.randperm(x.size(0), device=x.device)
    mixed_x = lam * x + (1 - lam) * x[index]
    return mixed_x, y, y[index], lam


def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)


# --- Class weight computation ---
def compute_class_weights(dataset, num_classes: int, device: torch.device) -> torch.Tensor:
    """Computes inverse-frequency class weights to handle breed imbalance."""
    counts = torch.zeros(num_classes)
    for _, label in dataset:
        lbl = int(label) if not isinstance(label, int) else label
        if 0 <= lbl < num_classes:
            counts[lbl] += 1
    counts = counts.clamp(min=1)  # avoid division by zero for unseen classes
    weights = 1.0 / counts
    weights = weights / weights.sum() * num_classes  # normalize: mean weight ≈ 1
    print(f"[ClassWeight] Min={weights.min():.3f}, Max={weights.max():.3f}, Mean={weights.mean():.3f}")
    return weights.to(device)


# --- Synthetic Dataset Fallback (Dry-Run / Validation) ---
class SyntheticDogBreedDataset(Dataset):
    def __init__(self, num_samples=100, num_classes=120, transform=None):
        self.num_samples = num_samples
        self.num_classes = num_classes
        self.transform = transform

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        from PIL import Image

        img_arr = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
        img = Image.fromarray(img_arr)
        label = idx % self.num_classes
        if self.transform:
            img = self.transform(img)
        return img, label


def get_transforms():
    """Returns state-of-the-art augmentation transforms for ViT training."""
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.RandAugment(num_ops=2, magnitude=9),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return train_transform, val_transform


def train_pipeline(args):
    print("==========================================================================")
    print(" AnimalMind — Fine-Tuning ViT Dog Breed Classifier Pipeline (>90% target)")
    print("==========================================================================")
    print(f"Model Backbone  : {args.model_name}")
    print(f"Batch Size      : {args.batch_size}")
    print(f"Epochs          : {args.epochs}")
    print(f"Learning Rate   : {args.lr}")
    print(f"Dry Run         : {args.dry_run}")
    print(f"W&B Tracking    : {getattr(args, 'use_wandb', False)}")
    print(f"MixUp Alpha     : {getattr(args, 'mixup_alpha', 0.0)}")
    print(f"Unfreeze Epoch  : {getattr(args, 'unfreeze_epoch', 0)}")
    print("==========================================================================")

    # --- W&B setup ---
    wandb_run = None
    if getattr(args, "use_wandb", False):
        try:
            import wandb
            wandb_run = wandb.init(
                project=getattr(args, "wandb_project", "animalmind-dogs"),
                name=f"dog-vit-{int(time.time())}",
                config=vars(args),
            )
            print(f"[W&B] Run initialized: {wandb_run.url}")
        except ImportError:
            print("[W&B] wandb not installed — skipping. Install with: pip install wandb")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Device] Running on: {device}")

    output_dir = pathlib.Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    train_transform, val_transform = get_transforms()

    # Load Dataset
    if args.dry_run:
        print("[Dataset] Dry-run mode: generating synthetic Stanford Dogs data...")
        train_dataset = SyntheticDogBreedDataset(num_samples=128, num_classes=120, transform=train_transform)
        val_dataset = SyntheticDogBreedDataset(num_samples=32, num_classes=120, transform=val_transform)
        test_dataset = SyntheticDogBreedDataset(num_samples=32, num_classes=120, transform=val_transform)
    else:
        try:
            from datasets import load_dataset

            print("[Dataset] Loading Stanford Dogs dataset from Hugging Face Datasets...")
            hf_ds = None
            for ds_id in ["huggan/stanford-dogs", "wesleyac/stanford-dogs", "thoxub/stanford_dogs"]:
                try:
                    hf_ds = load_dataset(ds_id)
                    print(f"[Dataset] Successfully loaded dataset: {ds_id}")
                    break
                except Exception:
                    continue
            if hf_ds is None:
                raise RuntimeError("No Stanford Dogs dataset repository accessible.")
            # Split train into 70% train, 15% val, 15% test
            splits = hf_ds["train"].train_test_split(test_size=0.3, seed=42)
            val_test = splits["test"].train_test_split(test_size=0.5, seed=42)

            train_ds_raw = splits["train"]
            val_ds_raw = val_test["train"]
            test_ds_raw = val_test["test"]
            print(f"[Dataset] Train: {len(train_ds_raw)}, Val: {len(val_ds_raw)}, Test: {len(test_ds_raw)}")
        except Exception as exc:
            print(f"[Dataset] Warning: Could not load Stanford Dogs remotely ({exc}). Using synthetic fallback.")
            train_dataset = SyntheticDogBreedDataset(num_samples=128, num_classes=120, transform=train_transform)
            val_dataset = SyntheticDogBreedDataset(num_samples=32, num_classes=120, transform=val_transform)
            test_dataset = SyntheticDogBreedDataset(num_samples=32, num_classes=120, transform=val_transform)

    # --- Class weights ---
    print("[ClassWeight] Computing class weights from training distribution...")
    class_weights = compute_class_weights(train_dataset, num_classes=120, device=device)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False)

    # Initialize ViT Model
    from transformers import ViTForImageClassification, ViTImageProcessor

    try:
        model = ViTForImageClassification.from_pretrained(
            args.model_name,
            num_labels=120,
            ignore_mismatched_sizes=True,
        )
        processor = ViTImageProcessor.from_pretrained(args.model_name)
    except Exception as exc:
        print(f"[Model] Warning: Could not download {args.model_name} weights ({exc}). Using mock backbone.")
        class MockViT(nn.Module):
            def __init__(self):
                super().__init__()
                self.classifier = nn.Linear(768, 120)
            def forward(self, pixel_values):
                B = pixel_values.shape[0]
                feats = torch.randn(B, 768, device=pixel_values.device)
                return type("Out", (), {"logits": self.classifier(feats)})()

        model = MockViT()
        processor = None

    model.to(device)
    ema = ModelEMA(model, decay=0.999)

    # Gradual unfreezing: freeze ViT backbone until unfreeze_epoch
    unfreeze_epoch = getattr(args, "unfreeze_epoch", 0)
    if unfreeze_epoch > 0 and hasattr(model, "vit"):
        print(f"[Unfreeze] Freezing ViT backbone for first {unfreeze_epoch} epochs...")
        for param in model.vit.parameters():
            param.requires_grad = False

    # Weighted loss for class imbalance + label smoothing
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1, weight=class_weights)
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
        weight_decay=1e-4,
    )
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer,
        max_lr=args.lr,
        steps_per_epoch=max(len(train_loader), 1),
        epochs=args.epochs,
    )

    history: List[Dict[str, float]] = []
    best_val_acc = 0.0
    patience_counter = 0
    PATIENCE = 5
    all_val_preds: Optional[np.ndarray] = None
    all_val_labels: Optional[np.ndarray] = None

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()

        # Gradual unfreezing: unlock backbone at the configured epoch
        if unfreeze_epoch > 0 and epoch == unfreeze_epoch and hasattr(model, "vit"):
            print(f"[Unfreeze] Epoch {epoch}: Unfreezing ViT backbone — full fine-tuning starts.")
            for param in model.vit.parameters():
                param.requires_grad = True
            # Re-create optimizer with reduced LR for the backbone
            optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr * 0.1, weight_decay=1e-4)

        model.train()
        train_loss = 0.0
        correct_train = 0
        total_train = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()

            mixup_alpha = getattr(args, "mixup_alpha", 0.0)
            if mixup_alpha > 0:
                images, labels_a, labels_b, lam = mixup_data(images, labels, alpha=mixup_alpha)
                outputs = model(images)
                logits = outputs.logits if hasattr(outputs, "logits") else outputs
                loss = mixup_criterion(criterion, logits, labels_a, labels_b, lam)
            else:
                outputs = model(images)
                logits = outputs.logits if hasattr(outputs, "logits") else outputs
                loss = criterion(logits, labels)

            loss.backward()

            optimizer.step()
            scheduler.step()
            ema.update(model)

            train_loss += loss.item() * len(labels)
            preds = logits.argmax(dim=-1)
            correct_train += int((preds == labels).sum())
            total_train += len(labels)

        train_loss /= max(total_train, 1)
        train_acc = correct_train / max(total_train, 1)

        # Validation phase with EMA model
        ema.ema_model.eval()
        val_loss = 0.0
        correct_val = 0
        total_val = 0
        val_preds_list = []
        val_labels_list = []

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = ema.ema_model(images)
                logits = outputs.logits if hasattr(outputs, "logits") else outputs
                loss = criterion(logits, labels)

                val_loss += loss.item() * len(labels)
                probs = F.softmax(logits, dim=-1).cpu().numpy()
                preds = logits.argmax(dim=-1)

                correct_val += int((preds == labels).sum())
                total_val += len(labels)

                val_preds_list.append(probs)
                val_labels_list.append(labels.cpu().numpy())

        val_loss /= max(total_val, 1)
        val_acc = correct_val / max(total_val, 1)

        all_val_preds = np.vstack(val_preds_list)
        all_val_labels = np.concatenate(val_labels_list)
        ece_score = compute_ece(all_val_preds, all_val_labels)

        dt = time.time() - t0
        print(
            f"Epoch {epoch:02d}/{args.epochs:02d} [{dt:.1f}s] - "
            f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2%} | "
            f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2%}, ECE: {ece_score:.4f}"
        )

        epoch_metrics = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_loss": round(val_loss, 4),
            "val_acc": round(val_acc, 4),
            "ece": round(ece_score, 4),
        }
        history.append(epoch_metrics)

        # W&B per-epoch logging
        if wandb_run is not None:
            wandb_run.log(epoch_metrics)

        # Early stopping check
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            # Save best checkpoint
            if not args.dry_run and hasattr(model, "save_pretrained"):
                model.save_pretrained(str(output_dir / "best_model"))
                if processor:
                    processor.save_pretrained(str(output_dir / "best_model"))
                print(f" -> Best model saved with Val Acc: {val_acc:.2%}")
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                print(f"[EarlyStopping] Triggered at epoch {epoch}. Best Val Acc: {best_val_acc:.2%}")
                break

    # Temperature Scaling Calibration
    print("\n[Calib] Performing Temperature Scaling calibration on validation logits...")
    calibrated_model = ModelWithTemperature(ema.ema_model)
    calibrated_temp = calibrated_model.set_temperature(val_loader, device=device)

    # Save reliability diagram using the last epoch's val predictions
    if all_val_preds is not None and all_val_labels is not None:
        save_reliability_diagram(
            all_val_preds, all_val_labels, output_dir / "reliability_diagram.png"
        )

    # Save Temperature parameter T
    models_dir = pathlib.Path(__file__).parent.parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    temp_save_path = models_dir / "temperature.pt"
    torch.save({"temperature": calibrated_temp}, str(temp_save_path))
    print(f"[Calib] Saved temperature parameter T={calibrated_temp:.4f} to {temp_save_path}")

    # Save Training Metrics History
    metrics_path = pathlib.Path(__file__).parent / "training_metrics.json"
    summary_report = {
        "model_name": args.model_name,
        "epochs_trained": len(history),
        "best_val_accuracy": round(best_val_acc, 4),
        "calibrated_temperature": round(calibrated_temp, 4),
        "history": history,
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2, ensure_ascii=False)
    print(f"[Metrics] Training report saved to {metrics_path}")

    # Push to Hugging Face Hub (if requested and token available)
    if args.push_to_hub:
        hf_token = os.environ.get("HF_TOKEN")
        if not hf_token:
            print("[HF Hub] Warning: HF_TOKEN is not set in environment. Skipping upload.")
        else:
            try:
                print(f"[HF Hub] Uploading fine-tuned model to Hugging Face: {args.push_to_hub}...")
                model.push_to_hub(args.push_to_hub, use_auth_token=hf_token)
                if processor:
                    processor.push_to_hub(args.push_to_hub, use_auth_token=hf_token)
                print(f"[HF Hub] Model successfully published to https://huggingface.co/{args.push_to_hub}")
            except Exception as hf_err:
                print(f"[HF Hub] Error uploading to Hugging Face: {hf_err}")

    if wandb_run is not None:
        wandb_run.finish()
        print("[W&B] Run finished and synced.")

    print("\n==========================================================================")
    print(f" Training Pipeline Completed! Best Validation Accuracy: {best_val_acc:.2%}")
    print("==========================================================================")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train AnimalMind ViT Dog Breed Classifier")
    parser.add_argument("--epochs", type=int, default=50, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    parser.add_argument("--model-name", type=str, default="google/vit-base-patch16-224", help="Base ViT model")
    parser.add_argument("--output-dir", type=str, default="models/animalmind-breed-classifier", help="Output dir")
    parser.add_argument("--push-to-hub", type=str, default="", help="Repo ID on HF Hub (e.g. firstoff/animalmind-breed-classifier)")
    parser.add_argument("--dry-run", action="store_true", help="Run 1-epoch dry-run test with synthetic data")
    # v2 improvements
    parser.add_argument("--use-wandb", action="store_true", help="Enable Weights & Biases experiment tracking")
    parser.add_argument("--wandb-project", type=str, default="animalmind-dogs", help="W&B project name")
    parser.add_argument("--mixup-alpha", type=float, default=0.0, help="MixUp alpha (0=disabled, 0.4=recommended)")
    parser.add_argument("--unfreeze-epoch", type=int, default=0, help="Epoch to unfreeze ViT backbone (0=always unfrozen)")

    args = parser.parse_args()
    train_pipeline(args)
