# Existing AnimalMind model upgrade plan

The existing dog/cat breed classifiers should be upgraded independently from PeloTalk.

## V2 evaluation gate
- Group-aware train/validation/test split where animal identity is available.
- Standard hold-out metrics must use only breeds seen during training (closed-set protocol).
- Unseen breeds/sources should be evaluated in a separate OOD/zero-shot protocol and reported independently.
- Macro-F1, balanced accuracy and per-class recall alongside accuracy for the standard hold-out protocol.
- Calibration: reliability diagram, ECE and Brier score.
- Review preprocessing/normalization against the model's pretrained backbone.
- Add early stopping and best-checkpoint selection.
- Compare augmentation and class-weighting changes through controlled experiments.
- Remove secrets/tokens from notebooks and model repositories.

Do not publish a V2 metric as an improvement unless it beats the prior model on the same, clearly documented evaluation protocol.
