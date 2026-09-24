# Modelação Visual e Arquitetura UML
## Sistema: PeloNaRoupa / AnimalMind
**Unidade Curricular:** Análise de Requisitos & UML | CTeSP TPSI  
**Docente:** Prof.ª Natércia Santos | ESTCB  

---

## 1. Diagrama de Casos de Uso (Use Case Diagram)

O diagrama de casos de uso captura as funcionalidades essenciais do sistema da perspetiva dos diferentes intervenientes (Atores), detalhando as relações de inclusão (`<<include>>`) e extensão (`<<extend>>`).

```mermaid
graph TD
    Tutor((Tutor Primário))
    CoTutor((Co-Tutor / Família))
    Vet((Médico Veterinário))

    UC_GravarSom[Gravar e Classificar Vocalização]
    UC_ValidarSinal[Validar Sinal de Áudio]
    UC_VerNarrativa[Consultar Narrativa Semanal]
    UC_RegistarSintoma[Registar Sintoma Holístico]
    UC_FotoSintoma[Anexar Fotografia ao Sintoma]
    UC_RegistarCuidado[Registar Cuidado Diário]
    UC_VerRadar[Visualizar Radar de Personalidade]
    UC_AjustarPersonalidade[Ajustar Dimensões de Personalidade]
    UC_PartilharVet[Autorizar Acesso Veterinário]
    UC_ConsultarClinica[Aceder ao Historial Clínico & Alertas]

    Tutor --> UC_GravarSom
    Tutor --> UC_VerNarrativa
    Tutor --> UC_RegistarSintoma
    Tutor --> UC_RegistarCuidado
    Tutor --> UC_VerRadar
    Tutor --> UC_AjustarPersonalidade
    Tutor --> UC_PartilharVet

    CoTutor --> UC_RegistarCuidado
    CoTutor --> UC_VerNarrativa
    CoTutor --> UC_VerRadar

    Vet --> UC_ConsultarClinica
    Vet --> UC_VerRadar

    UC_GravarSom -.->|<<include>>| UC_ValidarSinal
    UC_RegistarSintoma -.->|<<extend>>| UC_FotoSintoma
```

---

## 2. Diagrama de Componentes (Arquitetura em 3 Camadas)

Demonstra a independência física e lógica entre a Apresentação, a Lógica de Negócio (Camada Intermédia) e o Armazenamento de Dados no SGBD (conforme abordado no Slide 17 de Modelação de Bases de Dados).

```mermaid
graph TB
    subgraph Camada_Apresentacao["1. Camada de Apresentação (Cliente - Browser / Mobile Capacitor)"]
        UI_Dashboard["Dashboard & Companheiro Emocional (React / Tailwind)"]
        UI_Audio["Módulo de Gravação WebAudio API"]
        UI_Radar["Componente SVG Radar de Personalidade"]
        UI_Care["Quadro de Coordenação Diária (DailyCareBoard)"]
    end

    subgraph Camada_Negocio["2. Camada Intermédia / Negócio (Node.js + tRPC)"]
        TRPC_Gateway["tRPC Router Orchestrator (server/routers.ts)"]
        Signal_Validator["Validador de Sinal Nyquist / RMS (server/lib/audioSignal.ts)"]
        FSM_Engine["Máquina de Estados do Companheiro (shared/companionFsm.ts)"]
        Service_Personality["Inferência de Personalidade (server/services/personality.ts)"]
        Service_Narrative["Gerador de Narrativa Semanal (server/services/narrative.ts)"]
    end

    subgraph Camada_Dados["3. Camada de Dados (SGBD PostgreSQL / Supabase)"]
        Table_Animals[("public.animals")]
        Table_Events[("public.classification_events")]
        Table_Care[("public.care_logs")]
        Table_Personality[("public.animal_personalities")]
        RLS_Policy["Row Level Security (private.can_access_animal)"]
    end

    UI_Audio -->|PCM Digital Stream| TRPC_Gateway
    UI_Dashboard -->|tRPC Queries/Mutations| TRPC_Gateway
    UI_Care -->|tRPC Mutations| TRPC_Gateway

    TRPC_Gateway --> Signal_Validator
    TRPC_Gateway --> FSM_Engine
    TRPC_Gateway --> Service_Personality
    TRPC_Gateway --> Service_Narrative

    Service_Personality --> RLS_Policy
    Service_Narrative --> RLS_Policy
    RLS_Policy --> Table_Animals
    RLS_Policy --> Table_Events
    RLS_Policy --> Table_Care
    RLS_Policy --> Table_Personality
```

---

## 3. Diagrama de Sequência (Processamento Bioacústico e Persistência)

Mapeia as trocas de mensagens ordenadas no tempo (Slide 21 de UML) para o fluxo principal de análise e persistência do ladro/miado:

```mermaid
sequenceDiagram
    autonumber
    actor Tutor as Tutor (Utilizador)
    participant UI as Interface PeloNaRoupa
    participant AudioModule as WebAudio / Microfone
    participant tRPC as Servidor tRPC (classify.run)
    participant Signal as audioSignal.ts (A/D)
    participant SGBD as PostgreSQL (Supabase)
    participant FSM as companionFsm.ts

    Tutor->>UI: Clica em "Gravar Vocalização"
    UI->>AudioModule: Inicia captura de áudio s(t)
    AudioModule-->>UI: Retorna buffer PCM (16 kHz)
    UI->>tRPC: classify.run({ animalId, audioBuffer, sampleRate })

    tRPC->>Signal: analyzeAudioSignal(buffer, sampleRate)
    alt Sinal com silêncio ou amostragem insuficiente
        Signal-->>tRPC: isValid = false (Rejeitado)
        tRPC-->>UI: Erro 400: Sinal inválido / silêncio excessivo
    else Sinal válido (Nyquist cumprido)
        Signal-->>tRPC: isValid = true (Métricas RMS, SNR)
        tRPC->>SGBD: INSERT INTO classification_events (estado, confiança, áudio)
        SGBD-->>tRPC: Evento persistido com sucesso (ID gerado)
        
        tRPC->>FSM: transitionCompanionFsm(estadoAtual, BIOACOUSTIC_EVENT)
        FSM-->>tRPC: novoEstado ("alert" / "playful" / "relaxed")
        
        tRPC-->>UI: Devolve resultado da classificação + novo estado visual
        UI-->>Tutor: Exibe animação do Companheiro Emocional atualizada
    end
```

---

## 4. Diagrama de Máquina de Estados (State Machine - Companheiro Emocional)

Modela formalmente o comportamento dinâmico orientado a eventos do animal/companheiro (Slide 23 de UML), implementado no módulo [`shared/companionFsm.ts`](file:///d:/AnimalMind/shared/companionFsm.ts):

```mermaid
stateDiagram-v2
    [*] --> Resting: Inicialização / Sem atividade

    Resting --> Relaxed: TUTOR_INTERACTION (carinho/despertar)
    Resting --> Playful: CARE_COMPLETED (passeio) / Áudio de excitação
    Resting --> Alert: BIOACOUSTIC_EVENT (atenção/fome)
    Resting --> Distress: BIOACOUSTIC_EVENT (distress) [confiança >= 0.55]

    Relaxed --> Playful: CARE_COMPLETED (passeio) / Áudio de excitação
    Relaxed --> Alert: BIOACOUSTIC_EVENT (atenção/alerta)
    Relaxed --> Alert: BIOACOUSTIC_EVENT (distress) [confiança < 0.55]
    Relaxed --> Distress: BIOACOUSTIC_EVENT (distress) [confiança >= 0.55]
    Relaxed --> Resting: INACTIVITY_CHECK [inatividade >= 120 min]

    Playful --> Relaxed: CARE_COMPLETED (refeição) / Fim de brincadeira
    Playful --> Distress: BIOACOUSTIC_EVENT (distress) [confiança >= 0.55]
    Playful --> Resting: INACTIVITY_CHECK [inatividade >= 120 min]

    Alert --> Relaxed: CARE_COMPLETED (alimentação/cuidado resolvido)
    Alert --> Distress: BIOACOUSTIC_EVENT (distress) [confiança >= 0.55]
    Alert --> Resting: INACTIVITY_CHECK [inatividade >= 120 min]

    Distress --> Alert: TUTOR_INTERACTION (presença/conforto do tutor)
    Distress --> Relaxed: CARE_COMPLETED (medicação/cuidados clínicos)
```

---

## 5. Diagrama de Classes de Domínio

Captura a estrutura conceptual dos objetos de negócio e os seus tipos primitivos:

```mermaid
classDiagram
    class User {
        +BigInt id
        +String openId
        +String email
        +String role
        +DateTime createdAt
    }

    class Animal {
        +BigInt id
        +BigInt userId
        +String name
        +String species
        +String breed
        +Float weight
        +getPersonalityProfile()
    }

    class ClassificationEvent {
        +BigInt id
        +BigInt animalId
        +String state
        +Float confidence
        +String audioUrl
        +DateTime createdAt
    }

    class CareLog {
        +BigInt id
        +BigInt animalId
        +BigInt userId
        +String careType
        +String title
        +Date careDate
        +DateTime completedAt
    }

    class AnimalPersonality {
        +BigInt id
        +BigInt animalId
        +SmallInt vocalExpressiveness
        +SmallInt stressResilience
        +SmallInt energyLevel
        +SmallInt sociability
        +SmallInt independence
        +Float confidence
        +String source
        +recalculateInference()
    }

    User "1" --> "0..*" Animal: possui
    Animal "1" --> "0..*" ClassificationEvent: regista
    Animal "1" --> "0..*" CareLog: recebe cuidados
    Animal "1" --> "1" AnimalPersonality: caracteriza-se por
    User "1" --> "0..*" CareLog: executa
```
