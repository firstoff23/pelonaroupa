# AnimalMind Body Language data sources

This directory separates pose data from behavioral annotations. Restricted or non-commercial sources must remain research/benchmark inputs until their terms are reviewed.

## Current sources

- `Dog-Pose` (Ultralytics): pose/keypoint reference with 24 canine keypoints. Research-only according to the current Ultralytics dataset documentation. Do not use as a production/commercial corpus until licensing is cleared.
- `Pawgaze`: canine behavior benchmark/reference. Keep source media separate until its terms are reviewed.
- `K9Bench`: canine action/video benchmark under CC BY-NC 4.0. Benchmark/research only for this project unless terms change.
- `firstoff/animalmind-oxford-pet`: project-normalized dog/cat image dataset used for breed/species reference; it is not a body-language dataset.

## Rule

Never label behavior automatically from breed or pose-only data. Behavioral labels must come from explicit annotations or a documented annotation policy.