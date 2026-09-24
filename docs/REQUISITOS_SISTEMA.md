# Especificação de Requisitos de Software (SRS)
## Sistema: PeloNaRoupa / AnimalMind
**Unidade Curricular:** Análise de Requisitos | CTeSP TPSI  
**Docente:** Prof.ª Natércia Santos | ESTCB  

---

## 1. Introdução e Âmbito

### 1.1 Objetivo do Sistema
O **PeloNaRoupa** (AnimalMind) é uma plataforma inteligente de monitorização contínua do bem-estar e saúde emocional de animais de companhia (cães e gatos). O sistema efetua a recolha de sinais sonoros (ladros, miados, gemidos), processa-os digitalmente para extração de características bioacústicas, e recorre a modelos probabilísticos (POMDP - *Partially Observable Markov Decision Process*) e de Machine Learning para estimar o estado emocional do animal, apoiar a coordenação familiar de cuidados e fornecer relatórios preditivos a médicos veterinários.

### 1.2 Fronteira do Sistema
- **Ambiente:** Dispositivos móveis e computadores dos tutores, microfone para captura acústica analógica, e infraestrutura em nuvem.
- **Entradas (Inputs):** Sinal sonoro digitalizado, dados biométricos do animal, registo de tarefas diárias de cuidados, relatos de sintomas com fotografia e ajustes manuais de personalidade.
- **Saídas (Outputs):** Classificação do estado emocional com confiança, representação visual do Companheiro Emocional, narrativa semanal em linguagem natural, quadro de coordenação diária e radar de personalidade em 5 dimensões.

---

## 2. Atores do Sistema

| Ator | Tipo | Descrição |
| :--- | :--- | :--- |
| **Tutor Primário (Owner)** | Humano | Proprietário legal do animal; possui permissões totais de leitura e escrita sobre os registos do pet, convida familiares e autoriza o médico veterinário. |
| **Co-tutor / Família** | Humano | Membro do agregado familiar com permissão partilhada para consultar o estado do animal e registar tarefas de cuidados (alimentação, passeios, medicação). |
| **Médico Veterinário (Vet)** | Humano | Profissional de saúde animal com autorização concedida para consultar o historial bioacústico, checkup holístico de sintomas e perfil comportamental. |
| **Motor de Inferência Bioacústica** | Sistema Externo | Serviço computacional de processamento de sinal e IA (YAMNet/PyTorch) que classifica os ficheiros sonoros recebidos. |

---

## 3. Requisitos Funcionais (RF)

### 3.1 Gestão de Utilizadores e Animais
- **[RF01] Autenticação e Perfis:** O sistema deve permitir a autenticação segura de utilizadores e atribuição de papéis (`owner`, `member`, `vet`).
- **[RF02] Registo de Animais:** O sistema deve permitir o registo de animais com espécie (cão/gato), raça, idade, peso e fotografia de perfil.
- **[RF03] Partilha Familiar:** O tutor primário deve poder convidar familiares para acederem e colaborarem na gestão dos animais da família.

### 3.2 Captura Bioacústica e Estado Emocional
- **[RF04] Gravação e Conversão Digital de Áudio:** O sistema deve capturar áudio através do microfone com taxa de amostragem mínima de 16 kHz (cumprindo o Teorema de Nyquist para frequências vocais de animais de estimação).
- **[RF05] Validação de Sinal:** O sistema deve validar a qualidade do sinal (rejeitar silêncio excessivo ou áudio vazio e alertar saturação digital/clipping).
- **[RF06] Classificação Bioacústica:** O sistema deve classificar o áudio num dos estados discretos (`relaxed`, `distress`, `attention`, `excitement`, `hunger`, `alert`) acompanhado de um grau de confiança probabilística ($0.0 \le C \le 1.0$).
- **[RF07] Consolidação POMDP:** O sistema deve manter um vetor de crença atualizado sobre o humor consolidado do animal através de um modelo markoviano de decisão parcialmente observável.

### 3.3 Experiência do Utilizador (5 Inspirações UX)
- **[RF08] Narrativa Semanal (Inspiração 1):** O sistema deve gerar relatórios em linguagem natural estruturada que resumem os padrões emocionais e comportamentais dos últimos 7 dias.
- **[RF09] Checkup Holístico e Registo de Sintomas (Inspiração 2):** O sistema deve fornecer uma lista categorizada de sintomas clínicos (pele, digestivo, respiratório, etc.) com níveis de severidade (`low`, `medium`, `high`), notas e fotografia de apoio.
- **[RF10] Companheiro Emocional (Inspiração 3):** O sistema deve apresentar no Dashboard um avatar animado que reflete visualmente e em tempo real o estado de humor do animal, governado por uma Máquina de Estados Finitos (FSM).
- **[RF11] Quadro de Cuidados Diários (Inspiração 4):** O sistema deve permitir aos membros da família registar tarefas cumpridas (alimentação, medicação, passeios, higiene) associadas ao dia do fuso horário local.
- **[RF12] Perfil de Personalidade em 5 Dimensões (Inspiração 5):** O sistema deve inferir e exibir um pentágono radar com 5 dimensões comportamentais (*Expressividade Vocal*, *Resiliência ao Stress*, *Energia*, *Sociabilidade*, *Independência*), permitindo ajustes manuais ponderados do tutor.

---

## 4. Requisitos Não Funcionais (RNF)

- **[RNF01] Usabilidade:** A interface gráfica deve ser intuitiva, responsiva (mobile e desktop), com suporte para tema claro/escuro e etiquetas ARIA para acessibilidade.
- **[RNF02] Desempenho e Tempo de Resposta:** 
  - A validação de sinal e reencaminhamento tRPC deve responder em menos de 500 ms.
  - O cálculo da narrativa semanal deve utilizar cache diária em memória para evitar recalculações desnecessárias a cada carregamento de página.
- **[RNF03] Segurança e Controlo de Acesso:** 
  - Acesso à base de dados protegido por **Row Level Security (RLS)** no PostgreSQL.
  - Tutores só podem ler e escrever dados dos seus animais; veterinários só podem aceder a animais cujos tutores concederam ativamente permissão (`vet_pet_access`).
- **[RNF04] Integridade dos Dados:** Todas as dimensões de personalidade devem respeitar a restrição de domínio `1 <= valor <= 5` e a confiança `0.0 <= conf <= 1.0` garantidas diretamente no SGBD por `CHECK constraints`.
- **[RNF05] Modularidade e Baixo Acoplamento:** A arquitetura aplicacional deve ser estruturada em 3 camadas independentes (Apresentação, Regras de Negócio e Dados), com sub-routers tRPC de responsabilidade única.
- **[RNF06] Portabilidade:** A aplicação web deve ser empacotável como aplicação móvel nativa através de Capacitor para Android e iOS sem alteração da lógica de negócio.

---

## 5. Matriz de Rastreabilidade

| Requisito | Camada de Implementação | Módulo / Ficheiro Principal |
| :--- | :--- | :--- |
| **RF04 / RF05** (Sinal de Áudio) | Servidor / Processamento | `server/lib/audioSignal.ts` |
| **RF06 / RF07** (Classificação / POMDP) | Servidor / ML | `server/routers/classify.ts`, `server/services/pomdp.ts` |
| **RF08** (Narrativa Semanal) | Servidor / Frontend | `server/services/narrative.ts`, `client/src/components/history/WeeklyNarrativeCard.tsx` |
| **RF09** (Checkup Holístico) | Servidor / Frontend | `server/routers/events.ts`, `client/src/components/health/SymptomCheckupSheet.tsx` |
| **RF10** (Companheiro Emocional) | Modelo / Frontend | `shared/companionFsm.ts`, `client/src/components/companion/CompanionAvatar.tsx` |
| **RF11** (Quadro de Cuidados) | Base de Dados / Frontend | `supabase/migrations/20260925000000_create_care_logs.sql`, `client/src/components/care/DailyCareBoard.tsx` |
| **RF12** (Perfil de Personalidade) | Base de Dados / Frontend | `supabase/migrations/20260926000000_create_animal_personalities.sql`, `client/src/components/personality/PersonalityRadar.tsx` |
| **RNF03 / RNF04** (Segurança / Integridade) | SGBD PostgreSQL | Migrações Supabase com RLS e `CHECK constraints` |
