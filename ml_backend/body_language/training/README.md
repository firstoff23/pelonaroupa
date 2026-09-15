# AnimalMind Body-Pose Training — Free GPU

## Recommended platform: Kaggle

Kaggle currently documents free NVIDIA P100 GPU notebooks, with up to 12 hours execution per notebook session and a weekly GPU quota that is commonly 30 hours. Availability and quotas can vary. Google Colab also provides free GPUs, but explicitly states that GPU availability and limits are dynamic and not guaranteed.

## Goal

Train the canine 24-keypoint pose estimator used by AnimalMind. This is a separate perception model from the downstream Body Language classifier.

```text
Dog-Pose images + 24 keypoints
            ↓
      pretrained pose model
            ↓
     AnimalMind pose model
            ↓
      24 canine keypoints
            ↓
   geometric body features
            ↓
 Body Language classifier
```

## Kaggle

1. Create a new Kaggle Notebook.
2. Enable `Settings -> Accelerator -> GPU`.
3. Install dependencies:

```bash
pip install -U ultralytics
```

4. Clone this repository:

```bash
git clone https://github.com/firstoff23/pelonaroupa.git
cd pelonaroupa
```

5. Run the training script:

```bash
python ml_backend/body_language/training/kaggle_dog_pose_pretrain.py \
  --model yolo26n-pose.pt \
  --data dog-pose.yaml \
  --epochs 100 \
  --imgsz 640 \
  --batch 16
```

Ultralytics' current Dog-Pose documentation uses the same general workflow: load a pretrained pose checkpoint and train it against `dog-pose.yaml`; the dataset defines 24 keypoints with visibility.

## Important licensing

The Dog-Pose dataset is research-use restricted. Separately, Ultralytics states that using its YOLO software/models, including custom-trained or fine-tuned models, in proprietary/commercial products may require an Enterprise license. Free GPU compute does not remove those licensing obligations.

For a production/commercial PeloNaRoupa stack, this experiment should therefore be treated as research only unless licensing is resolved or the pose stack is replaced with a suitably licensed alternative.
