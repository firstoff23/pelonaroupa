# Load Tests – PeloNaRoupa ML Backend

Testes de carga Locust para os endpoints `/v1/classify-breed` e `/sse` do backend ML (HF Space / Fly.io).

## Pré-requisitos

```bash
pip install locust Pillow
```

## Configuração

```bash
# Gerar fixture de imagem sintética (apenas uma vez)
python loadtests/generate_fixture.py

# Definir variáveis de ambiente
export IMAGE_PATH=./loadtests/fixtures/test-dog-synthetic.jpg
export AUTH_TOKEN=<valor de TEST_AUTH_TOKEN no GitHub Secrets>
```

## Campanhas de Teste

### 1. Classificação de Raças (`classify`)

| Cenário | Utilizadores | Ramp-up | Duração | Comando |
|---------|-------------|---------|---------|---------|
| Normal  | 1  | 1/s | 2 min | `locust -f loadtests/locustfile.py --headless --host=https://firstoff-animalmind-backend.hf.space -u 1 -r 1 -t 2m --tags classify` |
| Médio   | 4  | 1/s | 2 min | `-u 4 -r 1` |
| Pesado  | 8  | 2/s | 2 min | `-u 8 -r 2` |
| Stress  | 16 | 4/s | 2 min | `-u 16 -r 4` |

### 2. SSE Connections (`sse`)

| Cenário   | Utilizadores | Ramp-up | Duração | Comando |
|-----------|-------------|---------|---------|---------|
| Baseline  | 10  | 1/s | 2 min | `locust -f loadtests/locustfile.py --headless --host=... -u 10 -r 1 -t 2m --tags sse` |
| Normal    | 25  | 2/s | 2 min | `-u 25 -r 2` |
| Médio     | 50  | 5/s | 2 min | `-u 50 -r 5` |
| Alto      | 75  | 5/s | 2 min | `-u 75 -r 5` |
| Máximo    | 100 | 10/s | 2 min | `-u 100 -r 10` |

## Guardar Resultados em CSV

```bash
locust -f loadtests/locustfile.py --headless \
    --host=https://firstoff-animalmind-backend.hf.space \
    -u 8 -r 2 -t 2m --tags classify \
    --csv=loadtests/results/classify-$(date +%Y-%m-%d)
```

Os ficheiros CSV são guardados em `loadtests/results/`. Não estão incluídos no git (ver `.gitignore`).

## Interface Web (modo interativo)

```bash
locust -f loadtests/locustfile.py --host=https://firstoff-animalmind-backend.hf.space
# Abrir: http://localhost:8089
```

## Métricas a Recolher

- **P50 / P95 / P99** de latência de resposta
- **Throughput** (req/s)
- **Taxa de erros** (%)
- **Erros 429** (rate limiting esperado sob carga alta)
- **SSE**: eventos recebidos por conexão / 30s

## Notas de Segurança

- O `AUTH_TOKEN` nunca deve ser commitado. Guardar apenas como GitHub Secret.
- O utilizador `test+load@pelonaroupa.app` tem acesso mínimo (role: `load_test`).
- O token JWT expira em ~1 hora. Para campanhas longas, regenerar com:
  ```bash
  npx tsx scripts/create-load-test-user.ts
  ```
