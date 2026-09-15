# Hugging Face release plan

Keep production and experimental artifacts separated.

Suggested repositories:

- `firstoff/animalmind-breed-classifier` — current stable dog model.
- `firstoff/animalmind-breed-classifier-v2` — future validated revision.
- `firstoff/animalmind-cat-classifier` — current stable cat model.
- `firstoff/animalmind-cat-classifier-v2` — future validated revision.
- `firstoff/pelotalk-dog-v1` — future calibrated vocalization model.
- `firstoff/pelotalk-cat-v1` — future calibrated vocalization model.
- `firstoff/animalmind-sounds` — project audio corpus; keep private/non-public data private.

Every public model should include: intended use, limitations, datasets, preprocessing, metrics, calibration status, known failure modes and licensing notes.
