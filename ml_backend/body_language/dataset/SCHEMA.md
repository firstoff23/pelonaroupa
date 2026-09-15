# AnimalMind behavior annotation schema

This schema separates observable body-language labels from higher-level interpretation.

## Fields

- `sample_id`: stable sample identifier
- `animal_id`: stable animal identifier; all images/frames of one known animal share the same ID
- `image`: source image path
- `keypoints`: path to a 24x3 `(x, y, visibility)` pose array
- `posture`: `standing | sitting | lying | crouching | unknown`
- `head`: `raised | neutral | lowered | unknown`
- `ears`: `forward | neutral | backward | asymmetric | unknown`
- `tail`: `high | neutral | low | tucked | unknown`
- `movement`: `still | walking | running | shaking | unknown`
- `source`: dataset/provenance identifier
- `license`: provenance/license identifier

## Partial-label policy

A label cell may be blank when that source does not annotate the corresponding head. Blank means **not supervised**, not `unknown`. During training, masked loss ignores blank labels. Use `unknown` only when the source/annotator explicitly establishes that the signal was unobservable or ambiguous.

## Annotation policy

Use `unknown` when a body part is occluded, ambiguous, outside the frame, or otherwise not reliably annotatable. Never infer emotional state from a single body-language label.

## Split policy

When `animal_id` is available, all samples from the same animal must remain in exactly one split. This prevents identity leakage between training and validation/test sets.
