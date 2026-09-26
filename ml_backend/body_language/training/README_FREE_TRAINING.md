# AnimalMind Body-Pose pretraining — free GPU

## Objetivo

Treinar, em Kaggle ou Google Colab gratuitos, um estimador de pose canina com os 24 keypoints do Dog-Pose. Este checkpoint é a camada de perceção; ainda não é o classificador de comportamento.

## Dados

Use o dataset Dog-Pose definido pelo `dog-pose.yaml` oficial da Ultralytics. O conjunto tem 24 keypoints `(x, y, visibility)` por cão.

A origem do dataset é Stanford Dogs/ImageNet e a página atual da Ultralytics indica restrição de uso para investigação. Rever licença antes de qualquer utilização comercial ou distribuição do modelo.

## Kaggle

1. Criar um Notebook novo no Kaggle.
2. Ativar `Settings -> Accelerator -> GPU`.
3. Colar o conteúdo de `kaggle_dog_pose_pretrain.py` ou executar:

```bash
pip install -U ultralytics
python ml_backend/body_language/training/kaggle_dog_pose_pretrain.py
```

4. O checkpoint esperado fica em:

```text
runs/animalmind/dog-pose-24kp/weights/best.pt
```

Também pode ser executado diretamente no notebook `AnimalMind_DogPose_Kaggle.ipynb`.

## Google Colab

```python
!pip -q install -U ultralytics
!git clone https://github.com/firstoff23/pelonaroupa.git
%cd pelonaroupa
!python ml_backend/body_language/training/kaggle_dog_pose_pretrain.py --device 0
```

Ativar primeiro `Runtime -> Change runtime type -> T4 GPU` quando estiver disponível.

## Configuração inicial

- model: `yolo26n-pose.pt`
- data: `dog-pose.yaml`
- epochs: 100
- image size: 640
- batch: 16
- patience: 15
- AMP: true
- cache: false
- workers: 2

Se a memória da GPU ficar curta, usar `--batch 8`.

## Validação

Depois do treino, validar o melhor checkpoint:

```python
from ultralytics import YOLO
model = YOLO("runs/animalmind/dog-pose-24kp/weights/best.pt")
metrics = model.val(data="dog-pose.yaml")
print(metrics.pose.map)
print(metrics.pose.map50)
```

Guardar também os resultados completos de `runs/animalmind/dog-pose-24kp/`.

## Critério para passar à etapa seguinte

Não publicar o checkpoint como modelo final apenas porque o treino terminou. Primeiro verificar:

- pose mAP50-95;
- pose mAP50;
- exemplos visuais de keypoints;
- falhas em oclusões e poses difíceis;
- compatibilidade exata da ordem dos 24 keypoints com `config.yaml` do AnimalMind.

Só depois usar o `best.pt` no pipeline `features.py -> BodyLanguageModel`.
