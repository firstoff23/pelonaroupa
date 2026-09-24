# 🐾 Companheiro Emocional (Inspiração 3)

## 🎯 Propósito
O **Companheiro Emocional** é uma representação visual imediata, empática e clinicamente orientada do estado emocional consolidado do animal ao longo dos últimos 7 dias.

Permite ao tutor abrir o Dashboard do PeloNaRoupa e compreender num relance:
> *"Como tem estado o meu animal ultimamente?"*

### O que o Companheiro NÃO É:
- ❌ **Sem Gamificação:** Não existem pontos, moedas, níveis, streaks de perda ou lições de treino (afastamento deliberado de mecânicas tipo Wiglo).
- ❌ **Sem 3D Pesado:** Não utiliza modelos 3D volumosos que prejudiquem a experiência offline ou a autonomia da bateria em telemóveis.
- ❌ **Sem Simulações Artificiais:** Não é um bicho virtual independente; é o **espelho visual direto dos dados reais** registados pelo tutor e analisados pelo classificador bioacústico e modelo POMDP.

### Inspirações de Design
- **Fabulous:** Acompanhamento visual da trajetória contínua do bem-estar.
- **Duolingo:** Expressão reativa transparente da mascote que comunica estados de ânimo imediatos.
- **Forest:** Simbolismo limpo, minimalista e sereno que transmite tranquilidade.

---

## 🧭 Mapeamento de Estados Clínicos

O estado é resolvido deterministicamente pela função pura `resolveCompanionState(distribution, totalCount)` em `client/src/components/companion/companionStates.ts`.

| Estado Emocional Dominante | ID do Companheiro | Nome (PT/EN) | Token CSS Serene | Micro-Animação (`motion/react`) | Limiar / Regra |
|---|---|---|---|---|---|
| **Relaxado** | `calm` | Calmo / Calm | `var(--primary)` | Respiração suave (`scale: 1 → 1.025 → 1`, 3.2s) | Relaxado ≥ 50% |
| **Excitação** | `curious` | Curioso / Curious | `var(--secondary)` | Inclinação curiosa de cabeça / orelha (2.2s) | Excitação ≥ 40% |
| **Atenção** | `attentive` | Vigilante / Attentive | `var(--tertiary)` | Olhar atento com pestanejo calmo (4.5s) | Atenção ≥ 40% |
| **Alerta** | `alert` | Alerta / Alert | `var(--color-warning)` | Micro-tensão / vibração subtil (0.4s) | Alerta ≥ 40% |
| **Fome** | `hungry` | Faminto / Hungry | `var(--primary)` | Tigela de refeição com pulso leve (1.6s) | Fome ≥ 40% |
| **Angústia** | `worried` | Preocupado / Worried | `var(--destructive)` | Head-tilt empático e boca preocupada (2.8s) | Angústia ≥ 30% |
| **Insuficiente** | `sleeping` | A descansar / Resting | `var(--muted-foreground)` | Olhos em arco fechados `⌒` e `Zzz` a flutuar | Total de eventos < 3 |

### Prioridade Clínica de Desempate
Se dois estados atingirem o limiar com a mesma percentagem exata, a decisão prioriza a atenção clínica:
$$\text{distress} > \text{alert} > \text{hunger} > \text{attention} > \text{excitement} > \text{relaxed}$$

---

## 🛠️ Arquitetura de Componentes

### 1. `CompanionAvatar.tsx`
- **SVG Vetorial Inline:** Sem pedidos de rede externos, renderização SVG geométrica limpa.
- **Orelhas Adaptativas (`species`):**
  - `species: "cat"`: Orelhas triangulares estilizadas em polígono.
  - `species: "dog"`: Orelhas caídas/curvadas com bezier paths.
- **Tokens CSS:** Cores de contorno, preenchimento e realce utilizam tokens (`var(--primary)`, `var(--secondary)`, etc.), assegurando compatibilidade nativa com modo claro, escuro e sistema.
- **Otimização de Desempenho:** Envolvido em `React.memo` para evitar re-renderizações supérfluas durante navegação ou pull-to-refresh.
- **Acessibilidade:**
  - `role="img"` com `aria-label` descritivo traduzido ("Companheiro emocional: Yoshi está calmo").
  - `useReducedMotion()` da Framer Motion desativa loops de animação quando o utilizador tem preferências de movimento reduzido ativas no sistema operativo.

### 2. `CompanionSheet.tsx`
- Bottom sheet com Radix UI / Shadcn.
- Exibe o avatar ampliado (92px), descrição clínica empática, barra segmentada proporcional dos 7 dias com legenda de percentagens, e atalhos rápidos para o histórico completo e para a gravação de áudio.

### 3. `DashboardPage.tsx`
- Cartão integrado entre o carrossel de animais e o cartão de narrativa semanal, com feedback tátil e transições suaves.

---

## 🧪 Testes Automatizados

- `client/src/components/companion/companionStates.test.ts`: 9 testes cobrindo todos os limiares, ordenações, empates clínicos e estado `sleeping` quando `< 3` eventos.
- `client/src/components/companion/CompanionAvatar.test.tsx`: 5 testes cobrindo renderização `role="img"`, `aria-label`, variação cão vs gato, estados específicos (`sleeping`, `hungry`).
- `client/src/components/companion/CompanionSheet.test.tsx`: 2 testes validando renderização de distribuição e estado vazio.
