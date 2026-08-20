-- PeloNaRoupa – Adição de alimentos em falta
-- Migração: 20260820000000_food_dictionary_additions.sql

INSERT INTO public.foods (name, aliases, safe_for, dangerous_for, toxic_for, severity, reason, symptoms, what_to_do, sources)
VALUES
  (
    'Frango Desidratado',
    ARRAY['chicken jerky', 'frango seco', 'chicken treats'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Snack natural de proteína magra, excelente alternativa aos petiscos industriais. Escolher versões sem conservantes, sal ou condimentos adicionados.',
    ARRAY[]::TEXT[],
    'Opte por jerky 100% frango sem aditivos. Não confunda com jerky importado que pode conter glicol de propileno. Dê em moderação.',
    ARRAY['AKC', 'Pet MD']
  ),
  (
    'Gema de Ovo',
    ARRAY['egg yolk', 'ovo', 'ova'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Excelente fonte de ácidos gordos essenciais, vitaminas A, D, E e biotina. Promove pelo brilhante e pele saudável.',
    ARRAY[]::TEXT[],
    'Dê sempre cozida para eliminar risco de salmonela. Limite a 1–2 gemas por semana para evitar excesso de gordura.',
    ARRAY['AKC', 'Veterinary Partner']
  ),
  (
    'Caldo de Frango',
    ARRAY['chicken broth', 'caldo de galinha', 'sopa de frango'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Hidratante e apetitoso, especialmente para animais convalescentes ou com pouco apetite. Deve ser puro e sem aditivos.',
    ARRAY[]::TEXT[],
    'Use apenas caldo caseiro, sem sal, cebola, alho ou gorduras adicionadas. Caldo comercial geralmente contém sódio em excesso.',
    ARRAY['AKC']
  ),
  (
    'Atum em Flocos',
    ARRAY['tuna flakes', 'atum', 'tuna', 'peixe'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Rico em proteína e ácidos gordos ómega-3, que promovem a saúde cardiovascular e o pelo. Escolher atum em água sem sal.',
    ARRAY[]::TEXT[],
    'Dê em pequenas quantidades e com pouca frequência — o atum tem mercúrio. Evite o atum em óleo. Não substitui dieta completa.',
    ARRAY['Catster', 'Dogster']
  ),
  (
    'Mirtilo',
    ARRAY['blueberry', 'mirtilhos', 'blueberries'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Superfood antioxidante — rico em vitaminas C e K, fibras e fitoquímicos. Excelente snack de treino de baixas calorias.',
    ARRAY[]::TEXT[],
    'Sirva os mirtilos frescos ou congelados diretamente. Sem açúcar adicionado. Limite a um punhado por semana.',
    ARRAY['AKC', 'ASPCA']
  ),
  (
    'Carne de Vaca Cozida',
    ARRAY['beef', 'carne vaca', 'hamburguer cozido', 'carne moida'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Proteína de alto valor biológico, com ferro e zinco. Opção ideal como complemento ou base de dietas naturais (BARF).',
    ARRAY[]::TEXT[],
    'Cozinhe sempre sem sal, cebola, alho ou especiarias. Retire o excesso de gordura. Não dê carne crua sem avaliação veterinária.',
    ARRAY['AKC', 'Veterinary Partner']
  ),
  (
    'Salmão Cozido',
    ARRAY['salmon', 'salmão cozido', 'peixe gordo'],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Rico em ácidos gordos ómega-3 que reduzem inflamação, fortalecem o sistema imunitário e promovem pelo brilhante.',
    ARRAY[]::TEXT[],
    'Cozinhe ou coza a vapor completamente. Nunca sirva salmão cru ou fumado — pode conter o parasita Neorickettsia helminthoeca, fatal para cães.',
    ARRAY['AKC', 'ASPCA']
  ),
  (
    'Manga',
    ARRAY['mango', 'mangas'],
    ARRAY['dog', 'cat', 'rabbit']::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'safe',
    'Rica em vitaminas A, B6, C e E. O alto teor de açúcar natural requer moderação, especialmente em animais com diabetes ou obesidade.',
    ARRAY[]::TEXT[],
    'Remova sempre o caroço (contém pequenas quantidades de cianeto) e a casca antes de servir. Dê apenas como petisco ocasional.',
    ARRAY['AKC']
  ),
  (
    'Limão',
    ARRAY['lemon', 'lima', 'citrino', 'sumo de limão'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'dangerous',
    'Contém psoralenos e óleos essenciais limoneno e linalool, que são tóxicos para cães e gatos e podem causar fotossensibilidade e irritação gastrointestinal severa.',
    ARRAY['Vómitos', 'Diarreia', 'Fotossensibilidade', 'Depressão do sistema nervoso', 'Colapso'],
    'Mantenha os cítricos fora do alcance. Se ingerido em grande quantidade, contacte o veterinário de imediato.',
    ARRAY['ASPCA', 'Pet Poison Helpline']
  ),
  (
    'Pão',
    ARRAY['bread', 'pão branco', 'tostas', 'baguete', 'bread plain'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'caution',
    'Pão cozido simples não é tóxico mas oferece calorias vazias sem valor nutricional. Pão com uvas, passas, xilitol ou alho pode ser altamente perigoso.',
    ARRAY['Obesidade', 'Distensão abdominal', 'Desequilíbrio nutricional'],
    'Evite pão como snack regular. Verifique sempre os ingredientes — pão de passas, pão de alho ou pão com xilitol são altamente perigosos.',
    ARRAY['AKC', 'ASPCA']
  ),
  (
    'Cascas de Camarão',
    ARRAY['shrimp shells', 'casca camarao', 'shrimp skin'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'dangerous',
    'As cascas e cabeças do camarão são duras e pontiagudas, podendo perfurar a mucosa do trato digestivo ou causar obstrução intestinal.',
    ARRAY['Vómitos', 'Dor abdominal', 'Sangue nas fezes', 'Obstipação', 'Letargia'],
    'Sirva apenas camarão cozido sem casca, cabeça ou cauda. Nunca dê camarão cru por risco de parasitas e bactérias.',
    ARRAY['Catster', 'Vet MD']
  ),
  (
    'Bolo',
    ARRAY['cake', 'bolos', 'pastelaria', 'cupcake', 'tarte', 'sobremesa'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    'toxic',
    'Os bolos tipicamente contêm açúcar em excesso, gorduras trans, e muitas vezes ingredientes perigosos como chocolate, xilitol ou uvas. Nenhum componente traz benefício ao animal.',
    ARRAY['Vómitos', 'Diarreia', 'Obesidade', 'Pancreatite', 'Hipoglicémia (se contiver xilitol)', 'Toxicidade por chocolate'],
    'Não dê qualquer tipo de pastelaria ao seu animal. Se ingeriu bolo com chocolate ou suspeita de xilitol, recorra à emergência veterinária imediatamente.',
    ARRAY['ASPCA', 'Pet Poison Helpline']
  ),
  (
    'Nozes',
    ARRAY['nuts', 'nozes', 'amendoins', 'castanhas do brasil', 'pinhoes'],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    ARRAY[]::TEXT[],
    'dangerous',
    'A maioria das nozes tem alto teor de gordura, podendo desencadear pancreatite. Algumas (como nozes pretas) contêm juglona, hepatotóxica.',
    ARRAY['Vómitos', 'Diarreia', 'Letargia', 'Inflamação pancreática', 'Icterícia (nozes pretas)'],
    'Evite qualquer noz como snack. Nozes de macadâmia e nozes pretas são especialmente perigosas. Consulte o veterinário se ingeridas.',
    ARRAY['ASPCA', 'PetMD']
  ),
  (
    'Café',
    ARRAY['coffee', 'espresso', 'bica', 'café descafeinado', 'café em pó'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat', 'bird']::TEXT[],
    'toxic',
    'Contém cafeína e metilxantinas em concentração elevada. Mesmo pequenas quantidades podem ser fatais para gatos e perigosas para cães.',
    ARRAY['Hiperatividade', 'Vómitos', 'Taquicardia', 'Tremores', 'Convulsões', 'Paragem cardíaca'],
    'Emergência. Leve ao veterinário imediatamente. Não induza o vómito sem instrução profissional.',
    ARRAY['ASPCA', 'Pet Poison Helpline']
  ),
  (
    'Chá',
    ARRAY['tea', 'chá preto', 'chá verde', 'chá de ervas'],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY['dog', 'cat']::TEXT[],
    'toxic',
    'Contém cafeína e teaflavinas. Chás preto e verde são particularmente perigosos. Mesmo chás de ervas podem conter compostos tóxicos.',
    ARRAY['Inquietação', 'Vómitos', 'Taquicardia', 'Tremores', 'Dificuldade respiratória'],
    'Não deixe o animal beber chá. Em caso de ingestão significativa, contacte o veterinário de imediato.',
    ARRAY['Pet Poison Helpline', 'ASPCA']
  )
ON CONFLICT (name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
