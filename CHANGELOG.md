# Notas de versão

Este ficheiro reúne alterações relevantes do PeloNaRoupa. As entradas permanecem em **Não publicado** até serem incluídas numa etiqueta de versão acompanhada por validações de qualidade, testes e, quando aplicável, deployment concluído.

## Não publicado

### Adicionado

- Filtros por segurança no dicionário alimentar, incluindo alimentos seguros, com atenção, perigosos e tóxicos para a espécie selecionada.
- Um bloco de fontes e referências nos registos que já disponibilizam essa informação, com ligações abertas de forma segura.

### Alterado

- O estado vazio da pesquisa agora diferencia uma procura sem resultados de uma categoria de segurança sem correspondências.

### Qualidade

- A funcionalidade foi validada com lint Biome, testes do router alimentar com ambiente Supabase simulado e compilação de produção.

## Limites da funcionalidade alimentar

> O dicionário é um apoio informativo e não substitui a avaliação de um médico veterinário. Em caso de ingestão potencialmente tóxica, sintomas ou emergência, a prioridade é contactar um profissional ou serviço veterinário.

## Política de versões

| Tipo de alteração | Próxima versão recomendada |
|---|---|
| Correção compatível, conteúdo ou documentação | Patch (`x.y.Z`) |
| Funcionalidade compatível e testada | Minor (`x.Y.0`) |
| Migração de dados ou alteração incompatível de API | Major (`X.0.0`) |

Antes de uma release, devem passar os testes determinísticos, a verificação Biome, a compilação e o workflow de deployment aplicável.
