# Testes de Carga – PeloNaRoupa / AnimalMind ML Backend

Testes de carga Locust para os endpoints `/v1/classify-breed` e `/sse` do backend ML (HF Space / Local Mock).

Os cenários são deliberadamente opt-in e não correm contra produção sem um `IMAGE_PATH` e um `AUTH_TOKEN` (ou `ANIMALMIND_TEST_TOKEN` / `API_KEY`) fornecidos no ambiente do processo. O fixture versionado `loadtests/fixtures/test-dog-synthetic.jpg` é uma fixture calibrada para testar o transporte multipart e a inferência ViT.

---

## 📦 Instalação e Pré-requisitos

```bash
python -m pip install -r loadtests/requirements.txt
# Ou instalando diretamente:
pip install locust Pillow
```

---

## ⚙️ Configuração do Ambiente

```bash
# Definir variáveis de ambiente
export IMAGE_PATH=./loadtests/fixtures/test-dog-synthetic.jpg
export AUTH_TOKEN=<valor de TEST_AUTH_TOKEN no GitHub Secrets ou gerado via script>
# Ou usar API Key:
export API_KEY=<tua_api_key>
```

Para gerar um novo token JWT de teste com o Supabase:
```bash
npx tsx scripts/create-load-test-user.ts
```

---

## 🚀 Campanhas de Teste

### 1. Classificação de Raças (`classify`)

Executa o cenário de classificação (1, 2, 4, 8 e 16 utilizadores):

```bash
locust -f loadtests/locustfile.py --headless \
  --host=https://firstoff-animalmind-backend.hf.space \
  -u 1 -r 1 -t 2m --tags classify \
  --csv=loadtests/results/classify-u1
```

| Cenário | Utilizadores | Ramp-up | Duração | Comando |
|---------|-------------|---------|---------|---------|
| Baseline | 1  | 1/s | 2 min | `-u 1 -r 1 -t 2m --tags classify` |
| Leve     | 2  | 1/s | 2 min | `-u 2 -r 1 -t 2m --tags classify` |
| Médio    | 4  | 1/s | 2 min | `-u 4 -r 1 -t 2m --tags classify` |
| Pesado   | 8  | 2/s | 2 min | `-u 8 -r 2 -t 2m --tags classify` |
| Stress   | 16 | 4/s | 2 min | `-u 16 -r 4 -t 2m --tags classify` |

### 2. Conexões Persistentes SSE (`sse`)

Executa o cenário de conexões de streaming SSE (10, 25, 50, 75 e 100 clientes concorrentes):

```bash
locust -f loadtests/locustfile.py --headless \
  --host=https://firstoff-animalmind-backend.hf.space \
  -u 10 -r 2 -t 2m --tags sse \
  --csv=loadtests/results/sse-u10
```

| Cenário   | Conexões | Ramp-up | Duração | Comando |
|-----------|----------|---------|---------|---------|
| Baseline  | 10  | 1/s  | 2 min | `-u 10 -r 1 -t 2m --tags sse` |
| Normal    | 25  | 2/s  | 2 min | `-u 25 -r 2 -t 2m --tags sse` |
| Médio     | 50  | 5/s  | 2 min | `-u 50 -r 5 -t 2m --tags sse` |
| Alto      | 75  | 5/s  | 2 min | `-u 75 -r 5 -t 2m --tags sse` |
| Máximo    | 100 | 10/s | 2 min | `-u 100 -r 10 -t 2m --tags sse` |

---

## 🧪 Benchmark Local com Mock Backend

Para reproduzir os testes localmente sem enviar pedidos para o Hugging Face Space:

1. Inicia o mock backend:
   ```bash
   python -m uvicorn loadtests.mock_backend:app --host 127.0.0.1 --port 8765
   ```
2. Executa o Locust apontando para o mock:
   ```bash
   IMAGE_PATH=loadtests/fixtures/test-dog-synthetic.jpg AUTH_TOKEN="mock-token" \
     locust -f loadtests/locustfile.py --headless --host=http://127.0.0.1:8765 -u 4 -r 1 -t 1m --tags classify
   ```

---

## 📊 Automação das Campanhas

Para executar automaticamente todas as campanhas em sequência no Windows PowerShell:
```powershell
./loadtests/run_campaigns.ps1
```

E para compilar os resultados CSV em Markdown (`loadtests/results/real-YYYY-MM-DD.md`):
```bash
python loadtests/compile_results.py
```

---

## 🔒 Segurança

- O `AUTH_TOKEN`, `ANIMALMIND_TEST_TOKEN` e chaves privadas nunca devem ser commitados no git.
- O utilizador `test+load@pelonaroupa.app` tem permissões estritamente limitadas para testes.
- Os resultados CSV brutos em `loadtests/results/*.csv` são ignorados pelo `.gitignore`.
