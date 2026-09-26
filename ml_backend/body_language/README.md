# AnimalMind Body Language V1

First implementation of the PeloNaRoupa body-language pipeline.

## Goal

Convert an animal image into observable, structured body-language features that can later be fused with audio, context and per-animal history.

V1 deliberately avoids direct emotion claims. The model targets observable signals such as posture, head orientation, ear position, tail position and movement.

## Pipeline

```text
image
  -> pose/keypoint estimator
  -> normalized keypoints
  -> geometric features
  -> multi-label classifier
  -> structured JSON
```

## V1 labels

- posture: standing, sitting, lying, crouching
- head: raised, neutral, lowered
- ears: forward, neutral, backward, unknown
- tail: high, neutral, low, tucked, unknown
- movement: still, walking, running, shaking, unknown

The `unknown` state is intentional: a partially occluded or low-quality image must not be forced into a confident label.

## Repository layout

- `config.yaml`: label schema and training defaults
- `features.py`: normalized keypoint geometry
- `model.py`: compact multi-head classifier
- `inference.py`: model output contract
- `train.py`: training entry point

Dataset preparation and pose extraction will be added next, after the source datasets are validated.
