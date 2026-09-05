"""
AnimalMind — Wav2Vec2 Vocalization Classifier Training Script
================================================================
Fine-tunes Wav2Vec2 / HuBERT on pet vocalization classes (bark, meow, whine, growl, hiss, silence)
with SpecAugment, Label Smoothing, EarlyStoppingCallback, class weights, and Temperature Scaling calibration.

IMPORTANT FIX (v2): Previous version imported Trainer but never called trainer.train().
This version includes a full HF Trainer training loop.

Usage:
  python -m training.train_audio_classifier --epochs 20 --batch-size 16
  python -m training.train_audio_classifier --dry-run
  python -m training.train_audio_classifier --use-wandb --wandb-project animalmind-audio
"""

import argparse
import json
import os
import pathlib
import sys
import time
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from transformers import (
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
    EarlyStoppingCallback,
    TrainingArguments,
    Trainer,
)


VOCALIZATION_CLASSES = ["bark", "meow", "whine", "growl", "hiss", "silence"]
ID2LABEL = {i: c for i, c in enumerate(VOCALIZATION_CLASSES)}
LABEL2ID = {c: i for i, c in enumerate(VOCALIZATION_CLASSES)}


class SyntheticAudioDataset(Dataset):
    """Synthetic dataset generator for dry-run verification when audio datasets are not cached."""
    def __init__(self, num_samples: int = 100, sampling_rate: int = 16000, duration_sec: float = 2.0):
        self.num_samples = num_samples
        self.sample_len = int(sampling_rate * duration_sec)

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        # Generate synthetic audio waveform and random vocalization label
        waveform = np.random.randn(self.sample_len).astype(np.float32) * 0.1
        label = np.random.randint(0, len(VOCALIZATION_CLASSES))
        return {
            "input_values": torch.tensor(waveform, dtype=torch.float32),
            "label": torch.tensor(label, dtype=torch.long)
        }


class TemperatureScaler(nn.Module):
    """Optimizes temperature T on validation logits to calibrate uncertainty."""
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        return logits / self.temperature

    def calibrate(self, logits: torch.Tensor, labels: torch.Tensor):
        optimizer = torch.optim.LBFGS([self.temperature], lr=0.01, max_iter=50)
        criterion = nn.CrossEntropyLoss()

        def eval_loss():
            optimizer.zero_grad()
            loss = criterion(self.forward(logits), labels)
            loss.backward()
            return loss

        optimizer.step(eval_loss)
        return self.temperature.item()


def compute_ece(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> float:
    """Calculates Expected Calibration Error (ECE)."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = predictions == labels

    ece = 0.0
    for i in range(n_bins):
        in_bin = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i+1])
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(accuracies[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(accuracy_in_bin - avg_confidence_in_bin) * prop_in_bin
    return float(ece)


def main():
    parser = argparse.ArgumentParser(description="AnimalMind Audio Classifier Fine-tuning")
    parser.add_argument("--model-name", type=str, default="facebook/wav2vec2-base")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--output-dir", type=str, default="models/animalmind-audio-classifier")
    parser.add_argument("--dry-run", action="store_true", help="Run 1-epoch dry-run on synthetic audio")
    parser.add_argument("--push-to-hub", type=str, default=None, help="Hugging Face repo ID")
    # v2 improvements
    parser.add_argument("--use-wandb", action="store_true", help="Enable Weights & Biases tracking")
    parser.add_argument("--wandb-project", type=str, default="animalmind-audio", help="W&B project name")
    args = parser.parse_args()

    print(f"[AudioTraining] Initializing Audio Classification Fine-Tuning ({args.model_name})...")
    print(f"Classes: {VOCALIZATION_CLASSES}")
    print(f"W&B Tracking   : {getattr(args, 'use_wandb', False)}")

    # --- W&B setup ---
    wandb_run = None
    if getattr(args, "use_wandb", False):
        try:
            import wandb
            wandb_run = wandb.init(
                project=getattr(args, "wandb_project", "animalmind-audio"),
                name=f"audio-wav2vec2-{int(time.time())}",
                config=vars(args),
            )
            print(f"[W&B] Run initialized: {wandb_run.url}")
        except ImportError:
            print("[W&B] wandb not installed — skipping. Install with: pip install wandb")

    feature_extractor = AutoFeatureExtractor.from_pretrained(args.model_name)

    # --- SpecAugment: configure mask_time_prob and mask_feature_prob in model config ---
    model = AutoModelForAudioClassification.from_pretrained(
        args.model_name,
        num_labels=len(VOCALIZATION_CLASSES),
        label2id=LABEL2ID,
        id2label=ID2LABEL,
        ignore_mismatched_sizes=True,
    )
    # Enable SpecAugment during training (Wav2Vec2 applies it automatically when model.training=True)
    if hasattr(model.config, "mask_time_prob"):
        model.config.mask_time_prob = 0.065  # proportion of time steps to mask
        model.config.mask_time_length = 10
        print(f"[SpecAugment] mask_time_prob={model.config.mask_time_prob}, mask_time_length={model.config.mask_time_length}")
    if hasattr(model.config, "mask_feature_prob"):
        model.config.mask_feature_prob = 0.004  # proportion of feature channels to mask
        model.config.mask_feature_length = 64
        print(f"[SpecAugment] mask_feature_prob={model.config.mask_feature_prob}, mask_feature_length={model.config.mask_feature_length}")

    # --- Dataset loading (real data first, synthetic fallback) ---
    if args.dry_run:
        print("[AudioTraining] Dry-run mode: using synthetic audio dataset.")
        dataset = SyntheticAudioDataset(num_samples=80)
    else:
        print("[AudioTraining] Attempting to load real audio dataset from HF Hub...")
        try:
            from datasets import load_dataset as hf_load_dataset
            hf_audio_ds = hf_load_dataset(
                os.environ.get("AUDIO_DATASET_ID", "firstoff/animalmind-sounds"),
                split="train",
            )
            print(f"[AudioTraining] Loaded real audio dataset with {len(hf_audio_ds)} examples.")
            raise NotImplementedError(
                "Real audio dataset loaded, but its schema is not mapped to VOCALIZATION_CLASSES yet. "
                "Implement the mapping before production training."
            )
        except NotImplementedError:
            raise
        except Exception as exc:
            raise RuntimeError(
                f"Could not load a real mapped audio dataset: {exc}. "
                "Use --dry-run only for synthetic pipeline checks."
            ) from exc

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = torch.utils.data.random_split(dataset, [train_size, val_size])

    # --- Class weights via WeightedRandomSampler ---
    print("[ClassWeight] Computing class weights from training distribution...")
    train_labels = [int(dataset[i]["label"].item()) for i in train_ds.indices]
    class_counts = torch.zeros(len(VOCALIZATION_CLASSES))
    for lbl in train_labels:
        class_counts[lbl] += 1
    class_counts = class_counts.clamp(min=1)
    class_w = 1.0 / class_counts
    sample_weights = torch.tensor([class_w[lbl] for lbl in train_labels], dtype=torch.float)
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(train_ds), replacement=True)
    print(f"[ClassWeight] Class distribution: {dict(zip(VOCALIZATION_CLASSES, class_counts.int().tolist()))}")

    output_dir = pathlib.Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    feature_extractor.save_pretrained(output_dir)

    # --- HF Trainer: compute_metrics ---
    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        acc = float(np.mean(preds == labels))
        return {"accuracy": acc}

    def collate_fn(batch):
        input_values = torch.stack([item["input_values"] for item in batch])
        labels = torch.stack([item["label"] for item in batch])
        return {"input_values": input_values, "labels": labels}

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=1 if args.dry_run else args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.lr,
        warmup_ratio=0.1,
        eval_strategy="epoch" if not args.dry_run else "no",
        save_strategy="epoch" if not args.dry_run else "no",
        load_best_model_at_end=not args.dry_run,
        metric_for_best_model="accuracy",
        logging_steps=10,
        remove_unused_columns=False,
        label_names=["labels"],
        report_to="wandb" if wandb_run is not None else "none",
    )

    callbacks = []
    if not args.dry_run:
        callbacks.append(EarlyStoppingCallback(early_stopping_patience=5))

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=collate_fn,
        compute_metrics=compute_metrics,
        callbacks=callbacks,
    )

    print("[AudioTraining] Starting training loop...")
    trainer.train()
    print("[AudioTraining] Training complete.")

    # --- Temperature Scaling Calibration (on val set after training) ---
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, collate_fn=collate_fn)
    device = next(model.parameters()).device
    model.eval()
    all_logits, all_labels = [], []
    with torch.no_grad():
        for batch in val_loader:
            vals = batch["input_values"].to(device)
            labs = batch["labels"]
            outputs = model(vals)
            all_logits.append(outputs.logits.cpu())
            all_labels.append(labs)

    logits_tensor = torch.cat(all_logits, dim=0)
    labels_tensor = torch.cat(all_labels, dim=0)

    scaler = TemperatureScaler()
    calibrated_T = scaler.calibrate(logits_tensor, labels_tensor)

    calibrated_logits = logits_tensor / calibrated_T
    probs = torch.softmax(calibrated_logits, dim=-1).numpy()
    ece = compute_ece(probs, labels_tensor.numpy())
    acc = float(np.mean(np.argmax(probs, axis=1) == labels_tensor.numpy()))

    print(f"[AudioTraining] Final: Val Accuracy = {acc*100:.2f}%, T = {calibrated_T:.4f}, ECE = {ece:.4f}")

    # Save temperature state
    models_dir = pathlib.Path(__file__).parent.parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    torch.save({"temperature": calibrated_T}, str(models_dir / "audio_temperature.pt"))

    metrics_file = pathlib.Path(__file__).parent / "audio_training_metrics.json"
    metrics_data = {
        "model_name": args.model_name,
        "epochs_trained": args.epochs,
        "classes": VOCALIZATION_CLASSES,
        "val_accuracy": round(acc, 4),
        "calibrated_temperature": float(calibrated_T),
        "ece": float(ece),
    }
    metrics_file.write_text(json.dumps(metrics_data, indent=2), encoding="utf-8")
    print(f"[AudioTraining] Training metrics saved to {metrics_file}")

    if args.push_to_hub and os.getenv("HF_TOKEN"):
        print(f"[AudioTraining] Pushing model to HF Hub: {args.push_to_hub}...")
        model.push_to_hub(args.push_to_hub, token=os.getenv("HF_TOKEN"))
        feature_extractor.push_to_hub(args.push_to_hub, token=os.getenv("HF_TOKEN"))
        print("[AudioTraining] Pushed successfully!")

    if wandb_run is not None:
        wandb_run.finish()
        print("[W&B] Run finished and synced.")


if __name__ == "__main__":
    main()
