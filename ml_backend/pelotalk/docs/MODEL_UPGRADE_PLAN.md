# Existing AnimalMind model upgrade plan

The existing dog/cat breed classifiers should be upgraded independently from PeloTalk.

## V2 evaluation gate
- Group-aware train/validation/test split where animal identity is available.
- Hold-out set with unseen images from the same supported breed set and, separately, an unseen-breed/source evaluation set.
- Standard hold-out metrics: Macro-F1, balanced accuracy and per-class recall alongside accuracy, using only classes represented in training.
- OOD / zero-shot metrics: report results for breeds or sources intentionally absent from training as a separate protocol; do not mix these results into standard hold-out Macro-F1 or per-class recall.
- Calibration: reliability diagram, ECE and Brier score.
- Review preprocessing/normalization against the model's pretrained backbone.
- Add early stopping and best-checkpoint selection.
- Compare augmentation and class-weighting changes through controlled experiments.
- Remove secrets/tokens from notebooks and model repositories.

Do not publish a V2 metric as an improvement unless it beats the prior model on the same, clearly documented evaluation protocol.
