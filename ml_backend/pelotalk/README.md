# PeloTalk — Data & Model Readiness V1

This directory contains the pre-training foundation for PeloTalk. It does not ship trained weights and does not change the production audio classifier.

## Goals
- Audit candidate dog/cat audio datasets before GPU training.
- Normalize metadata into one manifest schema.
- Split by `animal_id` / recording group to prevent leakage.
- Keep direct, derived and inferred labels distinct.
- Prepare reproducible training configurations for Kaggle/Colab.
- Define a safe path for later model upgrades and Hugging Face releases.

## Order
1. `data_sources.yaml` — source registry and intended role.
2. `audit.py` — inspect available local datasets.
3. `manifest.py` — normalize rows into the common schema.
4. `split.py` — group-aware train/validation/test split.
5. `quality.py` — audio QC checks.

Training is intentionally out of scope for this PR.
