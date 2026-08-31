# Material Design 3 (M3) Design System Rationale — PeloNaRoupa

## 1. Porquê o Material Design 3?

A aplicação **PeloNaRoupa** tem como missão ajudar os tutores e médicos veterinários a compreender as emoções e o comportamento dos animais de estimação através de IA acústica e de visão computacional.

Para criar uma experiência móvel fluida (Mobile-First / PWA & Capacitor Nativo), a adoção do **Material Design 3 (M3)** da Google traz vantagens cruciais:

1. **Eliminação de "AI Slop" & Clichês Genéricos**:
   - Em vez de bordas fluorescentes, cartões com gradientes arco-íris e elementos decorativos arbitrários, o M3 estrutura a interface através de **superfícies tonais** e **elevações físicas subtis** (`Surface Level 1 #11131c` e `Surface Level 2 #181b27`).
   - O contraste arquitetural é garantido por finos traços de estrutura (`rgba(255, 255, 255, 0.08)`), sem poluição visual.

2. **Cores Funcionais e Semânticas**:
   - **Esmeralda (#10b981 / Primary)**: Ações primárias de alta agência (gravação sonora, confirmação, estado saudável/calmo).
   - **Índigo (#6366f1 / Secondary)**: Reconhecimento visual inteligente, câmara e captura facial/postural.
   - **Âmbar (#f59e0b / Caution)**: Avisos clínicos e avisos de que a IA não substitui o médico veterinário.
   - **Rosa/Vermelho (#ef4444 / Error)**: Ações destrutivas, alertas de angústia e erros de sistema.

3. **Tipografia com Propósito**:
   - **Outfit**: Títulos e cabeçalhos com personalidade moderna, amigável e confiável.
   - **Inter**: Texto corrido e elementos de formulário com máxima legibilidade em pequenos ecrãs.
   - **JetBrains Mono**: Números tabulares para cronómetros, percentagens de confiança e métricas acústicas em tempo real.

4. **Micro-interações e Física de Molas (Springs)**:
   - Resposta tátil ao toque (`active:scale-95`), animações de entrada fluidas (Framer Motion) e feedback háptico.

5. **Acessibilidade e Usabilidade (WCAG AA / Vercel Guidelines)**:
   - Alvos de toque com dimensão mínima de 48px.
   - Alto contraste em modo escuro nativo (#090a0f).
   - Rótulos e estados de foco explícitos.
