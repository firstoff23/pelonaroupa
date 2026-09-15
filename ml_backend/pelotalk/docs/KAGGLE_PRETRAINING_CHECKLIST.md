# PeloTalk — Kaggle pre-training checklist

## Gate 0: environment
- [ ] CUDA available
- [ ] GPU and VRAM recorded
- [ ] Python/PyTorch/Transformers versions recorded
- [ ] Reproducibility seed configured

## Gate 1: ingestion
- [ ] Candidate datasets mounted/downloaded
- [ ] Audio files discovered
- [ ] Metadata parsed without invented labels
- [ ] Source provenance retained
- [ ] License recorded per source

## Gate 2: quality
- [ ] Empty files: 0
- [ ] Unsupported/corrupt files quarantined
- [ ] Duration distribution reviewed
- [ ] Sampling-rate distribution reviewed
- [ ] Duplicate hashes reviewed

## Gate 3: leakage
- [ ] Stable animal/group identifiers available for primary supervised data
- [ ] Train/validation/test split is group-aware
- [ ] Cross-dataset animal overlap audited
- [ ] No test examples used for model selection

## Gate 4: label readiness
- [ ] Vocalization labels normalized
- [ ] Direct and derived labels remain distinct
- [ ] Class distribution reviewed
- [ ] Loss weighting chosen from observed distribution

## Gate 5: only then train
Start with the smallest supervised smoke test. Do not spend a full GPU run until the above gates pass.
