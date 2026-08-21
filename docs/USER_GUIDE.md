# Guia do Utilizador — PeloNaRoupa

Bem-vindo ao **PeloNaRoupa**, a aplicação inteligente concebida para ajudar tutores e profissionais a monitorizar, compreender e acompanhar a saúde, o comportamento e as emoções de cães e gatos.

---

## 📑 Índice
1. [Início Rápido e Registo](#1-início-rápido-e-registo)
2. [Gestão de Animais e Perfis](#2-gestão-de-animais-e-perfis)
3. [Classificação Acústica e Tradução de Vocalizações](#3-classificação-acústica-e-tradução-de-vocalizações)
4. [Classificação Visual e Postural por Câmara](#4-classificação-visual-e-postural-por-câmara)
5. [Escuta Passiva e Modo de Vigilância Contínua](#5-escuta-passiva-e-modo-de-vigilância-contínua)
6. [Modo Veterinário e Relatórios Clínicos](#6-modo-veterinário-e-relatórios-clínicos)
7. [Dicionário e Pesquisa de Alimentos Seguros/Tóxicos](#7-dicionário-e-pesquisa-de-alimentos-segurostóxicos)
8. [Modo Família e Co-Tutoria](#8-modo-família-e-co-tutoria)
9. [Segurança e Autenticação de Dois Fatores (MFA)](#9-segurança-e-autenticação-de-dois-fatores-mfa)
10. [Exportação de Dados e Histórico](#10-exportação-de-dados-e-histórico)

---

## 1. Início Rápido e Registo

- **Acesso Web/PWA:** Aceda a [animalmind.vercel.app](https://animalmind.vercel.app) no seu smartphone ou browser de desktop.
- **Instalação PWA:** No Safari (iOS) selecione *Partilhar > Adicionar ao Ecrã Principal*. No Chrome/Android selecione *Instalar Aplicação*.
- **Autenticação:** Registe-se com o seu email ou entre via conta Google. O sistema suporta modo de demonstração local instantâneo para experimentação sem conta imediata.

---

## 2. Gestão de Animais e Perfis

- **Adicionar Animal:** Registe o nome, espécie (Cão ou Gato), raça e idade do seu companheiro.
- **Animal Ativo:** O animal selecionado define o contexto para gravações, histórico e baseline de comportamento.
- **Linha de Base Comportamental (Baseline):** A app aprende os estados habituais do seu animal e calibra a sensibilidade de alertas consoante a consistência dos registos.

---

## 3. Classificação Acústica e Tradução de Vocalizações

- **Gravação Rápida (Toque Simples):** Pressione o botão do microfone para gravar uma vocalização de 3 segundos.
- **Gravação Contínua (Pressão Longa):** Mantenha o botão pressionado para gravar até 10 segundos.
- **Estados Detetados:**
  - ⚪ **Relaxamento (Relaxed):** Vocalizações calmas, ronronar suave ou respiração compassada.
  - 🟡 **Atenção (Attention):** Pedido de atenção ou contacto com o tutor.
  - 🔵 **Alerta (Alert):** Curiosidade ou estímulo exterior moderado.
  - 🔴 **Angústia (Distress):** Gemidos agudos, uivos de desconforto ou sinais de alarme.
  - 🟢 **Brincadeira (Playful):** Latidos ou miados energéticos em contexto de jogo.
  - 🥣 **Fome (Hunger):** Vocalizações características de solicitação de alimento.

---

## 4. Classificação Visual e Postural por Câmara

- **Reconhecimento de Raças:** Aponte a câmara para o animal para identificar a raça provável e obter conselhos de saúde e comportamento específicos.
- **Análise Postural:** Através de modelos de estimativa de pose (YOLOv8-pose), a app reconhece se o animal está deitado, sentado, de pé ou em postura de alerta, integrando os dados com a acústica através de inferência POMDP.

---

## 5. Escuta Passiva e Modo de Vigilância Contínua

- **Modo de Vigilância:** Ative a vigilância contínua para monitorizar o ambiente em background.
- **Otimização de Bateria:** Processamento otimizado com chunks de áudio sob demanda e consumo reduzido (<5% bateria/hora).
- **Notificações:** Alertas sonoros e notificações push são acionados apenas se forem detetados padrões anómalos persistentes (ex: angústia repetida).

---

## 6. Modo Veterinário e Relatórios Clínicos

- **Acesso Especializado:** Médicos veterinários com permissão podem aceder ao painel clínico de animais partilhados.
- **Relatório PDF Clínico:** Exporte relatórios médicos com:
  - Consistência da baseline comportamental.
  - Gráficos de evolução temporal e distribuição de estados emocionais.
  - Registo de sintomas e notas clínicas registadas pelo tutor e veterinário.
- **Partilha Segura:** Tutores podem autorizar o acesso de veterinários indicando o email profissional.

---

## 7. Dicionário e Pesquisa de Alimentos Seguros/Tóxicos

- **Pesquisa Rápida:** Escreva o nome de qualquer ingrediente (ex: "Chocolate", "Frango", "Uva", "Cebola", "Mirtilo").
- **Classificação de Risco:**
  - 🟢 **Seguro (Safe):** Alimento benéfico em porções normais.
  - 🟡 **Cuidado (Caution):** Pode causar indisposição ou requer preparação específica (ex: retirar sementes/ossos).
  - 🟠 **Perigoso (Dangerous):** Risco de engasgamento, obstrução ou toxicidade moderada.
  - 🔴 **Tóxico (Toxic):** Emergência médica em caso de ingestão.
- **Primeiros Socorros:** Informação clínica direta sobre sintomas e medidas de emergência.

---

## 8. Modo Família e Co-Tutoria

- **Grupos Familiares:** Crie um grupo e partilhe o código de convite com familiares ou parceiros.
- **Gestão Partilhada:** Todos os membros autorizados podem registar eventos, ouvir vocalizações anteriores e manter o perfil atualizado.

---

## 9. Segurança e Autenticação de Dois Fatores (MFA)

- **Proteção da Conta:** Ative o MFA em *Definições > Segurança* utilizando Google Authenticator, Authy ou 1Password.
- **Encriptação de Áudio:** As gravações de áudio e fotografias são guardadas em buckets seguros do Supabase Storage com políticas estritas de isolamento por utilizador.

---

## 10. Exportação de Dados e Histórico

- **Filtros Avançados:** Filtre o histórico por animal, estado emocional e intervalo de datas.
- **Formatos Disponíveis:** Exporte em formato **PDF** (relatório formatado para impressão) ou **CSV** (para análise de dados).

---

> **Aviso de Isenção de Responsabilidade:** O PeloNaRoupa é uma ferramenta informativa e de apoio ao bem-estar animal. As classificações de inteligência artificial não constituem diagnóstico médico. Em caso de doença ou emergência, consulte sempre um médico veterinário qualificado.
