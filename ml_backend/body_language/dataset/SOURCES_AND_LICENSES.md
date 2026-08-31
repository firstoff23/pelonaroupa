# AnimalMind Body Language — Data Sources and Licenses

## Primary posture source: Multi-Pose Dog Dataset (MPDD)

- Source: Mendeley Data, Zhimin He, Version 1
- DOI: `10.17632/v5j6m8dzhv.1`
- Size: 1,657 images from 192 individual dogs
- License: CC BY 4.0
- AnimalMind use: posture baseline and identity-disjoint validation

MPDD does not provide all five AnimalMind labels. It can supervise compatible posture labels only; unavailable labels are left blank and ignored by the masked training loss.

## Pose source: Ultralytics Dog-Pose

- 24 canine keypoints in `(x, y, visibility)` format
- Source images originate from Stanford Dogs/ImageNet
- Current Ultralytics documentation states the dataset is restricted to research use
- AnimalMind use: development/research pose parsing unless licensing for deployment is cleared

## Behavioral research benchmarks

### Pawgaze
`pawgaze/pawgaze` contains curated canine behavior videos and 7,120 multiple-choice annotations. It is useful for research and evaluation design, but its linked source videos require rights review before any commercial training use.

### K9Bench
`K9Bench/K9Bench` contains 4,744 test examples for canine video QA. Its dataset card explicitly restricts use to non-commercial scientific/academic/research purposes and notes that referenced YouTube media belong to their original rights holders. Do not use it for production/commercial training without appropriate permission.

## Production dataset policy

For a production AnimalMind model, prioritize:

1. first-party PeloNaRoupa recordings and annotations with appropriate consent/terms;
2. datasets with licenses compatible with the intended deployment;
3. per-sample provenance and license metadata;
4. identity-disjoint train/validation/test splits.
