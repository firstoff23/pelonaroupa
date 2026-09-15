# Body Language dataset pipeline

This directory separates **pose extraction** from **behavior annotation**.

## Source pose dataset

The initial pose source is Ultralytics Dog-Pose. It provides 24 dog keypoints in
YOLO pose format. The current Ultralytics documentation lists 6,773 training and
1,703 validation images and the following keypoint order:

`front_left_paw, front_left_knee, front_left_elbow, rear_left_paw, rear_left_knee,
rear_left_elbow, front_right_paw, front_right_knee, front_right_elbow,
rear_right_paw, rear_right_knee, rear_right_elbow, tail_start, tail_end,
left_ear_base, right_ear_base, nose, chin, left_ear_tip, right_ear_tip,
left_eye, right_eye, withers, throat`.

The source is restricted to research use in the current Ultralytics distribution.
It must therefore be treated as an experimentation dependency until licensing is
reviewed for the intended PeloNaRoupa deployment.

## Important distinction

Dog-Pose supplies **geometry**, not the behavioral labels needed by the
BodyLanguageModel. Do not infer `ears=forward`, `tail=high`, or emotion labels
from the dataset automatically. Those labels must come from a dedicated
annotation source or a human-annotated PeloNaRoupa dataset.

## Proposed data flow

```text
Dog-Pose / licensed pose source
        -> pose_manifest.csv
        -> .npy keypoints

Human annotation / behavior dataset
        -> behavior_labels.csv

pose_manifest + behavior_labels
        -> train.csv / val.csv / test.csv
        -> BodyLanguageModel
```

`prepare_manifest.py` only extracts pose geometry. It intentionally does not
invent behavior labels.
