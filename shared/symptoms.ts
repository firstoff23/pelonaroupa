export type SymptomSeverity = "low" | "medium" | "high";

export interface SymptomDefinition {
  id: string;
  legacyId?: string;
  categoryId: string;
  emoji: string;
  labelKey: string;
  descKey: string;
  fallbackLabelPt: string;
  fallbackLabelEn: string;
  fallbackDescPt: string;
  fallbackDescEn: string;
  isRedFlag?: boolean;
  allowsPhoto?: boolean;
}

export interface SymptomCategory {
  id: string;
  emoji: string;
  titleKey: string;
  descKey: string;
  fallbackTitlePt: string;
  fallbackTitleEn: string;
  fallbackDescPt: string;
  fallbackDescEn: string;
  symptomIds: string[];
}

export const SYMPTOM_CATEGORIES: SymptomCategory[] = [
  {
    id: "nutrition",
    emoji: "🍽️",
    titleKey: "symptoms.categories.nutrition.title",
    descKey: "symptoms.categories.nutrition.desc",
    fallbackTitlePt: "Alimentação & Digestão",
    fallbackTitleEn: "Nutrition & Digestion",
    fallbackDescPt: "Apetite, vómitos, diarreia, fezes e hidratação",
    fallbackDescEn: "Appetite, vomiting, diarrhea, stool and hydration",
    symptomIds: [
      "vomiting",
      "diarrhea",
      "appetite_loss",
      "excessive_drinking",
      "bad_breath",
      "bloating",
    ],
  },
  {
    id: "activity",
    emoji: "🏃",
    titleKey: "symptoms.categories.activity.title",
    descKey: "symptoms.categories.activity.desc",
    fallbackTitlePt: "Atividade & Mobilidade",
    fallbackTitleEn: "Activity & Mobility",
    fallbackDescPt: "Energia, claudicação, andar e postura",
    fallbackDescEn: "Energy, limping, gait and posture",
    symptomIds: ["lethargy", "limping", "trembling"],
  },
  {
    id: "respiratory",
    emoji: "🫁",
    titleKey: "symptoms.categories.respiratory.title",
    descKey: "symptoms.categories.respiratory.desc",
    fallbackTitlePt: "Respiratório & Ocular",
    fallbackTitleEn: "Respiratory & Ocular",
    fallbackDescPt: "Tosse, espirros, respiração e corrimentos",
    fallbackDescEn: "Coughing, sneezing, breathing and discharge",
    symptomIds: ["coughing", "sneezing", "nasal_discharge", "eye_discharge"],
  },
  {
    id: "skin_coat",
    emoji: "🐾",
    titleKey: "symptoms.categories.skin_coat.title",
    descKey: "symptoms.categories.skin_coat.desc",
    fallbackTitlePt: "Pele & Pelo",
    fallbackTitleEn: "Skin & Coat",
    fallbackDescPt: "Coceira, feridas, queda de pelo e dermatologia",
    fallbackDescEn: "Scratching, lesions, hair loss and dermatology",
    symptomIds: ["scratching", "hair_loss", "skin_lesions"],
  },
  {
    id: "urinary",
    emoji: "💧",
    titleKey: "symptoms.categories.urinary.title",
    descKey: "symptoms.categories.urinary.desc",
    fallbackTitlePt: "Sistema Urinário",
    fallbackTitleEn: "Urinary System",
    fallbackDescPt: "Frequência, dor e presença de sangue na urina",
    fallbackDescEn: "Frequency, pain and blood in urine",
    symptomIds: ["blood_urine", "urination_difficulty"],
  },
  {
    id: "neurological",
    emoji: "⚡",
    titleKey: "symptoms.categories.neurological.title",
    descKey: "symptoms.categories.neurological.desc",
    fallbackTitlePt: "Neurológico & Comportamento",
    fallbackTitleEn: "Neurological & Behavior",
    fallbackDescPt: "Convulsões, desorientação e resposta motora",
    fallbackDescEn: "Seizures, disorientation and motor response",
    symptomIds: ["seizures", "disorientation"],
  },
  {
    id: "systemic",
    emoji: "⚖️",
    titleKey: "symptoms.categories.systemic.title",
    descKey: "symptoms.categories.systemic.desc",
    fallbackTitlePt: "Geral & Ponderal",
    fallbackTitleEn: "General & Weight",
    fallbackDescPt: "Peso corporal, febre e estado sistémico",
    fallbackDescEn: "Body weight, fever and systemic state",
    symptomIds: ["weight_loss", "fever_warmth"],
  },
];

export const ALL_SYMPTOMS: SymptomDefinition[] = [
  // ─── Nutrition ────────────────────────────────────────────────────────────
  {
    id: "vomiting",
    legacyId: "vomiting",
    categoryId: "nutrition",
    emoji: "🤢",
    labelKey: "symptoms.items.vomiting.label",
    descKey: "symptoms.items.vomiting.desc",
    fallbackLabelPt: "Vómitos",
    fallbackLabelEn: "Vomiting",
    fallbackDescPt: "Regurgitação ou vómito alimentar/bilioso",
    fallbackDescEn: "Food or bile regurgitation/vomiting",
  },
  {
    id: "diarrhea",
    legacyId: "diarrhea",
    categoryId: "nutrition",
    emoji: "💩",
    labelKey: "symptoms.items.diarrhea.label",
    descKey: "symptoms.items.diarrhea.desc",
    fallbackLabelPt: "Diarreia",
    fallbackLabelEn: "Diarrhea",
    fallbackDescPt: "Fezes moles, líquidas ou aumento de frequência",
    fallbackDescEn: "Loose, liquid stools or higher frequency",
  },
  {
    id: "appetite_loss",
    legacyId: "appetite_loss",
    categoryId: "nutrition",
    emoji: "🍽️",
    labelKey: "symptoms.items.appetite_loss.label",
    descKey: "symptoms.items.appetite_loss.desc",
    fallbackLabelPt: "Perda de apetite",
    fallbackLabelEn: "Loss of appetite",
    fallbackDescPt: "Recusa alimentar ou hiporexia visível",
    fallbackDescEn: "Refusal to eat or noticeable hyporexia",
  },
  {
    id: "excessive_drinking",
    legacyId: "excessive_drinking",
    categoryId: "nutrition",
    emoji: "💧",
    labelKey: "symptoms.items.excessive_drinking.label",
    descKey: "symptoms.items.excessive_drinking.desc",
    fallbackLabelPt: "Beber excessivo",
    fallbackLabelEn: "Excessive drinking",
    fallbackDescPt: "Polidipsia ou procura anormal de água",
    fallbackDescEn: "Polydipsia or abnormal thirst",
  },
  {
    id: "bad_breath",
    legacyId: "bad_breath",
    categoryId: "nutrition",
    emoji: "💨",
    labelKey: "symptoms.items.bad_breath.label",
    descKey: "symptoms.items.bad_breath.desc",
    fallbackLabelPt: "Mau hálito",
    fallbackLabelEn: "Bad breath",
    fallbackDescPt: "Halitose forte ou sinais de desconforto oral",
    fallbackDescEn: "Strong halitosis or oral discomfort signs",
  },
  {
    id: "bloating",
    legacyId: "bloating",
    categoryId: "nutrition",
    emoji: "🫁",
    labelKey: "symptoms.items.bloating.label",
    descKey: "symptoms.items.bloating.desc",
    fallbackLabelPt: "Barriga dilatada",
    fallbackLabelEn: "Bloating",
    fallbackDescPt: "Distensão abdominal súbita (Potencial urgência clínica)",
    fallbackDescEn:
      "Sudden abdominal distension (Potential clinical emergency)",
    isRedFlag: true,
  },

  // ─── Activity ─────────────────────────────────────────────────────────────
  {
    id: "lethargy",
    legacyId: "lethargy",
    categoryId: "activity",
    emoji: "😴",
    labelKey: "symptoms.items.lethargy.label",
    descKey: "symptoms.items.lethargy.desc",
    fallbackLabelPt: "Letargia / Cansaço",
    fallbackLabelEn: "Lethargy",
    fallbackDescPt: "Prostração acentuada e falta de energia",
    fallbackDescEn: "Marked prostration and lack of energy",
  },
  {
    id: "limping",
    legacyId: "limping",
    categoryId: "activity",
    emoji: "🦵",
    labelKey: "symptoms.items.limping.label",
    descKey: "symptoms.items.limping.desc",
    fallbackLabelPt: "Claudicação / Mancar",
    fallbackLabelEn: "Limping",
    fallbackDescPt: "Dificuldade ao apoiar a pata ou andar rígido",
    fallbackDescEn: "Difficulty bearing weight on limb or stiff gait",
  },
  {
    id: "trembling",
    legacyId: "trembling",
    categoryId: "activity",
    emoji: "🥶",
    labelKey: "symptoms.items.trembling.label",
    descKey: "symptoms.items.trembling.desc",
    fallbackLabelPt: "Tremores",
    fallbackLabelEn: "Trembling",
    fallbackDescPt: "Tremores corporais ou calafrios frequentes",
    fallbackDescEn: "Body tremors or frequent shivering",
  },

  // ─── Respiratory ──────────────────────────────────────────────────────────
  {
    id: "coughing",
    legacyId: "coughing",
    categoryId: "respiratory",
    emoji: "😮‍💨",
    labelKey: "symptoms.items.coughing.label",
    descKey: "symptoms.items.coughing.desc",
    fallbackLabelPt: "Tosse",
    fallbackLabelEn: "Coughing",
    fallbackDescPt: "Tosse seca, acessos de engasgo ou expetoração",
    fallbackDescEn: "Dry cough, choking fits or expectoration",
  },
  {
    id: "sneezing",
    legacyId: "sneezing",
    categoryId: "respiratory",
    emoji: "🤧",
    labelKey: "symptoms.items.sneezing.label",
    descKey: "symptoms.items.sneezing.desc",
    fallbackLabelPt: "Espirros",
    fallbackLabelEn: "Sneezing",
    fallbackDescPt: "Espirros persistentes em salvas",
    fallbackDescEn: "Persistent sneezing in clusters",
  },
  {
    id: "nasal_discharge",
    legacyId: "nasal_discharge",
    categoryId: "respiratory",
    emoji: "👃",
    labelKey: "symptoms.items.nasal_discharge.label",
    descKey: "symptoms.items.nasal_discharge.desc",
    fallbackLabelPt: "Corrimento nasal",
    fallbackLabelEn: "Nasal discharge",
    fallbackDescPt: "Secreção nasal serosa, mucosa ou espessa",
    fallbackDescEn: "Serous, mucous or thick nasal discharge",
    allowsPhoto: true,
  },
  {
    id: "eye_discharge",
    legacyId: "eye_discharge",
    categoryId: "respiratory",
    emoji: "👁️",
    labelKey: "symptoms.items.eye_discharge.label",
    descKey: "symptoms.items.eye_discharge.desc",
    fallbackLabelPt: "Corrimento ocular",
    fallbackLabelEn: "Eye discharge",
    fallbackDescPt: "Lacrejamento abundante ou secreção nos olhos",
    fallbackDescEn: "Excessive tearing or eye crusting",
    allowsPhoto: true,
  },

  // ─── Skin & Coat ──────────────────────────────────────────────────────────
  {
    id: "scratching",
    legacyId: "scratching",
    categoryId: "skin_coat",
    emoji: "🐾",
    labelKey: "symptoms.items.scratching.label",
    descKey: "symptoms.items.scratching.desc",
    fallbackLabelPt: "Coceira / Prurido",
    fallbackLabelEn: "Scratching / Itching",
    fallbackDescPt: "Coçar compulsivo, morder patas ou lamber excessivo",
    fallbackDescEn: "Compulsive scratching, paw chewing or licking",
    allowsPhoto: true,
  },
  {
    id: "hair_loss",
    legacyId: "hair_loss",
    categoryId: "skin_coat",
    emoji: "🐱",
    labelKey: "symptoms.items.hair_loss.label",
    descKey: "symptoms.items.hair_loss.desc",
    fallbackLabelPt: "Queda de pelo",
    fallbackLabelEn: "Hair loss",
    fallbackDescPt: "Peladas circunscritas ou desbaste difuso do pelo",
    fallbackDescEn: "Localized bald spots or diffuse coat thinning",
    allowsPhoto: true,
  },
  {
    id: "skin_lesions",
    categoryId: "skin_coat",
    emoji: "🩹",
    labelKey: "symptoms.items.skin_lesions.label",
    descKey: "symptoms.items.skin_lesions.desc",
    fallbackLabelPt: "Lesões ou Feridas",
    fallbackLabelEn: "Skin lesions / Wounds",
    fallbackDescPt: "Vermelhidão cutânea, crostas, arranhões ou feridas",
    fallbackDescEn: "Skin redness, crusts, scratches or open sores",
    allowsPhoto: true,
  },

  // ─── Urinary ──────────────────────────────────────────────────────────────
  {
    id: "blood_urine",
    legacyId: "blood_urine",
    categoryId: "urinary",
    emoji: "🔴",
    labelKey: "symptoms.items.blood_urine.label",
    descKey: "symptoms.items.blood_urine.desc",
    fallbackLabelPt: "Sangue na urina",
    fallbackLabelEn: "Blood in urine",
    fallbackDescPt: "Urina rosada/avermelhada ou coágulos visíveis (Urgência)",
    fallbackDescEn: "Pinkish/reddish urine or visible clots (Emergency)",
    isRedFlag: true,
  },
  {
    id: "urination_difficulty",
    categoryId: "urinary",
    emoji: "⚠️",
    labelKey: "symptoms.items.urination_difficulty.label",
    descKey: "symptoms.items.urination_difficulty.desc",
    fallbackLabelPt: "Dificuldade a urinar",
    fallbackLabelEn: "Difficulty urinating",
    fallbackDescPt: "Esforço doloroso, micção em gotas ou obstrução (Urgência)",
    fallbackDescEn:
      "Painful straining, dripping or urinary blockage (Emergency)",
    isRedFlag: true,
  },

  // ─── Neurological ─────────────────────────────────────────────────────────
  {
    id: "seizures",
    legacyId: "seizures",
    categoryId: "neurological",
    emoji: "⚡",
    labelKey: "symptoms.items.seizures.label",
    descKey: "symptoms.items.seizures.desc",
    fallbackLabelPt: "Convulsões",
    fallbackLabelEn: "Seizures",
    fallbackDescPt:
      "Espasmos incontroláveis ou perda de consciência (Urgência)",
    fallbackDescEn: "Uncontrolled spasms or loss of consciousness (Emergency)",
    isRedFlag: true,
  },
  {
    id: "disorientation",
    categoryId: "neurological",
    emoji: "🌀",
    labelKey: "symptoms.items.disorientation.label",
    descKey: "symptoms.items.disorientation.desc",
    fallbackLabelPt: "Desorientação",
    fallbackLabelEn: "Disorientation",
    fallbackDescPt:
      "Cabeça inclinada, andar em círculos ou perda de equilíbrio",
    fallbackDescEn: "Head tilt, pacing in circles or loss of balance",
    isRedFlag: true,
  },

  // ─── Systemic ─────────────────────────────────────────────────────────────
  {
    id: "weight_loss",
    legacyId: "weight_loss",
    categoryId: "systemic",
    emoji: "⚖️",
    labelKey: "symptoms.items.weight_loss.label",
    descKey: "symptoms.items.weight_loss.desc",
    fallbackLabelPt: "Perda de peso",
    fallbackLabelEn: "Weight loss",
    fallbackDescPt: "Emagrecimento progressivo sem mudança alimentar",
    fallbackDescEn: "Progressive weight loss without dietary changes",
  },
  {
    id: "fever_warmth",
    categoryId: "systemic",
    emoji: "🌡️",
    labelKey: "symptoms.items.fever_warmth.label",
    descKey: "symptoms.items.fever_warmth.desc",
    fallbackLabelPt: "Febre ou calor corporal",
    fallbackLabelEn: "Fever / Body warmth",
    fallbackDescPt: "Temperatura corporal elevada, focinho quente e seco",
    fallbackDescEn: "Elevated body temperature, dry warm snout",
  },
];

// ─── Lookup Maps & Helpers ──────────────────────────────────────────────────

const SYMPTOM_MAP_BY_ID = new Map<string, SymptomDefinition>(
  ALL_SYMPTOMS.map((s) => [s.id, s]),
);

const SYMPTOM_MAP_BY_LEGACY = new Map<string, SymptomDefinition>(
  ALL_SYMPTOMS.filter((s) => s.legacyId).map((s) => [s.legacyId as string, s]),
);

const CATEGORY_MAP_BY_ID = new Map<string, SymptomCategory>(
  SYMPTOM_CATEGORIES.map((c) => [c.id, c]),
);

export function getSymptomById(id: string): SymptomDefinition | undefined {
  return SYMPTOM_MAP_BY_ID.get(id);
}

export function getSymptomByLegacyOrId(
  idOrLegacy: string,
): SymptomDefinition | undefined {
  return (
    SYMPTOM_MAP_BY_ID.get(idOrLegacy) ?? SYMPTOM_MAP_BY_LEGACY.get(idOrLegacy)
  );
}

export function getCategoryForSymptom(
  symptomId: string,
): SymptomCategory | undefined {
  const symptom = getSymptomByLegacyOrId(symptomId);
  if (!symptom) return undefined;
  return CATEGORY_MAP_BY_ID.get(symptom.categoryId);
}

export function hasAnyRedFlag(
  selectedIds: string[] | Set<string>,
  severity: SymptomSeverity,
): boolean {
  if (severity === "high") return true;
  let found = false;
  selectedIds.forEach((id) => {
    if (found) return;
    const s = getSymptomByLegacyOrId(id);
    if (s?.isRedFlag) {
      found = true;
    }
  });
  return found;
}

export function searchSymptoms(
  query: string,
  lang: "pt" | "en" = "pt",
): Array<{ symptom: SymptomDefinition; category: SymptomCategory }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: Array<{
    symptom: SymptomDefinition;
    category: SymptomCategory;
  }> = [];

  for (const symptom of ALL_SYMPTOMS) {
    const category = CATEGORY_MAP_BY_ID.get(symptom.categoryId);
    if (!category) continue;

    const label =
      lang === "pt" ? symptom.fallbackLabelPt : symptom.fallbackLabelEn;
    const desc =
      lang === "pt" ? symptom.fallbackDescPt : symptom.fallbackDescEn;
    const catTitle =
      lang === "pt" ? category.fallbackTitlePt : category.fallbackTitleEn;

    const match =
      symptom.id.toLowerCase().includes(q) ||
      (symptom.legacyId?.toLowerCase().includes(q) ?? false) ||
      label.toLowerCase().includes(q) ||
      desc.toLowerCase().includes(q) ||
      catTitle.toLowerCase().includes(q);

    if (match) {
      results.push({ symptom, category });
    }
  }

  return results;
}
