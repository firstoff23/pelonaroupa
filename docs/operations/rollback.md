# Runbook de rollback do AnimalMind

## Quando fazer rollback

Faz rollback quando uma versão publicada provocar aumento sustentado de erros 5xx, readiness 503 após o período de warm-up, latência fora do SLO, classificações claramente inválidas, consumo anormal de memória ou incompatibilidade entre código e pesos.

## O que registar antes de publicar

Guarda o SHA do commit GitHub, o SHA da revisão do Space, os IDs/revisões dos modelos Hugging Face, o hash dos pesos, a imagem do container e os resultados do smoke test. O rollback deve restaurar um conjunto compatível de código, dependências, configuração e modelos; reverter apenas `app.py` pode deixar o runtime inconsistente.

## Rollback normal via GitHub

1. Identifica o último commit saudável e o commit defeituoso.
2. Usa `git revert <commit-defeituoso>` em vez de reescrever `main`.
3. Abre um pull request e aguarda os gates de backend e segurança.
4. Faz merge quando os checks passarem.
5. Executa o workflow `Deploy ML backend to Hugging Face`.
6. Confirma `/health` HTTP 200, `/v1/ready` HTTP 200 e uma classificação controlada.
7. Regista o incidente e a revisão restaurada.

## Rollback de emergência

Se o serviço estiver indisponível e não for possível aguardar um pull request, restaura a última revisão saudável do Space através da interface/API do Hugging Face, usando o SHA previamente registado. Assim que o serviço estabilizar, cria o `git revert` correspondente no GitHub para que o estado remoto volte a ser auditável.

## Verificação pós-rollback

```bash
curl -fsS https://firstoff-animalmind-backend.hf.space/health
curl -fsS https://firstoff-animalmind-backend.hf.space/v1/ready
```

O segundo comando só deve devolver sucesso quando `vision_model_loaded` for `true` e `warmup_status` for `ready`. Não promover uma versão apenas porque `/health` está acessível.

## Critério de encerramento

O incidente pode ser encerrado quando os erros 5xx e a latência regressarem aos limites normais, o modelo carregar sem `warmup_error`, uma classificação de teste passar e o SHA restaurado estiver documentado no relatório de operação.
