# Contribuir

Obrigado pelo interesse em melhorar este projeto. O objetivo é manter cada alteração **pequena, verificável e bem documentada**, para que o repositório continue útil tanto para quem o utiliza como para quem aprende com o seu desenvolvimento.

## Antes de começar

Lê o `README.md` do repositório para conhecer a finalidade do projeto, os pré-requisitos e os comandos de validação. Para alterações maiores, abre primeiro uma *issue* com o problema, a proposta e os critérios de aceitação. Isto evita trabalho duplicado e ajuda a manter o âmbito claro.

Nunca publiques palavras-passe, tokens, dados pessoais, capturas com informação privada ou ficheiros de ambiente. As vulnerabilidades devem seguir o processo indicado em [`SECURITY.md`](./SECURITY.md).

## Processo de contribuição

| Etapa | O que fazer |
|---|---|
| **1. Planear** | Pesquisa *issues* existentes e descreve claramente o problema ou a melhoria. |
| **2. Criar uma alteração isolada** | Trabalha numa branch com um nome descritivo, por exemplo `feat/pesquisa-acessivel` ou `fix/erro-de-upload`. |
| **3. Validar** | Executa os comandos de formatação, lint, testes e build aplicáveis ao projeto. |
| **4. Documentar** | Atualiza README, testes, variáveis de ambiente ou notas de arquitetura sempre que o comportamento público mudar. |
| **5. Abrir pull request** | Explica a motivação, o que mudou, como foi validado e quaisquer limitações conhecidas. |

## Qualidade esperada

Uma contribuição deve manter a coerência de estilo do código existente, incluir testes proporcionais ao risco da alteração e preservar a acessibilidade da interface. Mudanças em integrações externas devem prever falhas, limites de utilização e mensagens úteis para o utilizador.

As alterações que envolvam autenticação, permissões, dados pessoais, pagamentos, saúde, IA ou serviços externos devem incluir uma nota explícita sobre riscos e validação. Funcionalidades com impacto potencialmente sensível devem ser apresentadas de forma clara, sem promessas que o projeto não consegue demonstrar.

## Pull requests

Mantém cada pull request focado numa intenção. Evita misturar refatorações extensas com funcionalidades novas, exceto quando uma depende diretamente da outra. Antes de pedir revisão, confirma que a checklist do template foi preenchida e que o CI está verde.

Ao sugerires uma melhoria, explica o efeito esperado para o utilizador final. Para correções, inclui passos de reprodução e evidência de que a regressão está coberta.

## Conduta

Espera-se comunicação respeitosa, objetiva e inclusiva. Discordâncias técnicas devem ser discutidas com base em evidência, impacto e alternativas, nunca em ataques pessoais.
