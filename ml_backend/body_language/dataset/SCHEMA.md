# AnimalMind behavior annotation schema

This schema separates observable body-language labels from higher-level interpretation.

## Required fields

- `sample_id`: stable sample identifier
- `animal_id`: stable animal identifier when known; do not use frame-level IDs for the same animal
- `keypoints`: path to a 24x3 `(x, y, visibility)` pose array
- `posture`: `standing | sitting | lying | crouching | unknown`
- `head`: `raised | neutral | lowered | unknown`
- `ears`: `forward | neutral | backward | asymmetric | unknown`
- `tail`: `high | neutral | low | tucked | unknown`
- `movement`: `still | walking | running | shaking | unknown`
- `source`: dataset or provenance identifier
- `license`: provenance/license identifier

## Annotation policy

Use `unknown` when the body part is occluded, ambiguous, outside the frame, or otherwise not reliably annotatable. Never infer emotional state from a single body-language label.

## Split policy

When `animal_id` is available, all samples from the same animal must remain in exactly one split. This prevents identity leakage between training and validation/test sets.
