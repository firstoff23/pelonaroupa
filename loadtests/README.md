# Testes de carga AnimalMind

Os cenários são deliberadamente opt-in e não correm contra produção sem um `IMAGE_PATH` e um `AUTH_TOKEN` fornecidos no ambiente do processo. O fixture versionado `loadtests/fixtures/test-dog-synthetic.jpg` é uma ilustração sintética criada exclusivamente para testar o transporte multipart; não deve ser usado para medir a accuracy do modelo.

Para reproduzir o benchmark local simulado, inicia `loadtests.mock_backend:app` em `127.0.0.1:8765` e executa os comandos com `--host=http://127.0.0.1:8765`. Os resultados guardados em `loadtests/results/` são preliminares e não representam o Hugging Face Space.

## Instalação

```bash
python -m pip install -r loadtests/requirements.txt
```

## Classificação visual

Usa uma imagem não sensível e começa com uma carga pequena:

```bash
IMAGE_PATH=/secure/dog-test.jpg \
AUTH_TOKEN="$ANIMALMIND_TEST_TOKEN" \
locust -f loadtests/locustfile.py \
  --headless --host=https://firstoff-animalmind-backend.hf.space \
  -u 1 -r 1 -t 1m --tags classify
```

Executa depois, em corridas separadas, 2, 4, 8 e 16 utilizadores. Regista P50/P95/P99, throughput, 4xx/5xx, CPU, RAM e cold start. Repete com uma imagem normal, uma imagem pesada e um ficheiro próximo do limite de upload.

## SSE

```bash
AUTH_TOKEN="$ANIMALMIND_TEST_TOKEN" \
locust -f loadtests/locustfile.py \
  --headless --host=https://firstoff-animalmind-backend.hf.space \
  -u 10 -r 2 -t 5m --tags sse
```

Repete com 25, 50, 75 e 100 clientes. Confirma heartbeats, eventos, desconexões, reconexões, memória e o comportamento do cliente 101. Não combines inicialmente carga SSE com classificação pesada.

## Segurança

Nunca coloques `AUTH_TOKEN`, uma imagem real ou respostas do modelo no repositório, nos logs do CI ou em URLs. Usa um token de teste de curta duração e revoga-o depois da campanha.
