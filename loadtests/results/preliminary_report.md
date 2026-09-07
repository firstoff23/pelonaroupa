# Resultados preliminares da campanha Locust

## Âmbito

A campanha foi executada em **7 de Setembro de 2026** contra um backend FastAPI local controlado em `127.0.0.1:8765`. O serviço local foi criado apenas para validar o harness de carga, o transporte HTTP/SSE e a recolha de métricas; não carregou os modelos AnimalMind nem representa o hardware do Hugging Face Space.

> Estes números não são benchmarks do modelo, não são SLOs de produção e não devem ser comparados directamente com o Space.

Foi usada a imagem sintética não sensível `loadtests/fixtures/test-dog-synthetic.jpg`, com 512×512 px e cerca de 22 KB. O fixture contém uma ilustração determinística e está explicitamente marcado como material de teste, não como amostra para medir accuracy.

## Resultados

| Cenário | Requests | Falhas | Mediana | Média | P95 aprox. | Máximo | Throughput |
|---|---:|---:|---:|---:|---:|---:|---:|
| Classificação, 1 utilizador | 10 | 0 | 14 ms | 15,8 ms | 33 ms | 33 ms | 0,53 req/s |
| Classificação, 8 utilizadores | 116 | 0 | 14 ms | 14,0 ms | 16 ms | 34 ms | 4,01 req/s |
| SSE, 10 utilizadores | 182 | 0 | 3 ms | 3,8 ms | 40 ms | 45 ms | 6,29 req/s |

Os resultados mostram que o cenário Locust, a imagem multipart, o endpoint de classificação simulado, o streaming SSE e a recolha CSV funcionam sem falhas nesta máquina. A corrida SSE mede requests/streams concluídos pelo cliente Locust, não a capacidade máxima sustentada do Space.

## Interpretação

A classificação simulada apresentou latência mediana estável entre uma e oito ligações concorrentes, com throughput a crescer de aproximadamente 0,53 para 4,01 requests por segundo. Isto valida o arnes de teste e o caminho HTTP, mas não inclui descodificação real, inferência PyTorch, warm-up, memória do modelo ou limites de CPU do Space.

O cenário SSE abriu ligações, recebeu o evento inicial e heartbeats e terminou sem erros. O máximo de 45 ms reflecte o ciclo de estabelecimento/religação do mock. Ainda é necessário testar o comportamento do backend real com autenticação, clientes mantidos durante 5–15 minutos, desconexões abruptas, reconexões e concorrência de 10 a 100 clientes.

## Próximo teste necessário

Para obter resultados representativos, executar uma campanha separada contra staging ou o Space com uma imagem não sensível e um token temporário de teste injectado apenas no processo. Repetir classificação com imagens normal, pesada e próxima do limite de upload; medir P50/P95/P99, 4xx/5xx, CPU, RAM e cold start. Para SSE, medir clientes activos, heartbeats, reconexões, filas e comportamento no limite de 100 clientes.
