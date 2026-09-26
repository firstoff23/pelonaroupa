# PeloTalk Data Readiness

## Pre-training gate
Training must not start until these checks pass:

- Every training row has a valid audio path and source provenance.
- `animal_id` is available for the primary supervised datasets.
- Train/validation/test are grouped by animal (and recording session when available).
- Cross-dataset animal overlap is explicitly audited.
- Direct labels are distinguished from context-derived labels.
- Licenses are recorded per source and commercial redistribution is not assumed.
- Empty/corrupt/unsupported audio is excluded or quarantined.
- Class counts and duration distributions are reviewed before choosing loss weighting.

## Label policy
`vocalization` is the first supervised target. `emotion`, `arousal` and `intent` are only enabled where the source actually supports them. Context such as “waiting for food” is retained as context/evidence and must not silently become a ground-truth intent label.

## Release policy
No model weights are published from a dataset unless the source license permits the intended use. The project keeps source provenance in the manifest so model cards can document what was used.
