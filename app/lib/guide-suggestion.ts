// Sugestão de observação sem IA, baseada só nos dois guias de referência:
//
// - Guia 2012: "Guia para Elaboração de Regimento Interno das Secretarias de
//   Estado do GDF" (SEPLAN/DF, Portaria nº 25/2012).
// - Manual 2021: "Manual para Elaboração de Regimento Interno" (Secretaria de
//   Economia do DF, Portaria nº 128/2021).
//
// Cada verificação procura no texto da nova competência algo que um dos guias
// manda evitar ou exigir e, quando acha, devolve a orientação do guia com o
// item de onde ela saiu. Nada é inventado: sem regra do guia, sem observação.

export type GuideNote = {
  id: string;
  // Item do guia de onde a orientação foi tirada.
  source: string;
  text: string;
};

const BOTH_GUIDES = "Guia 2012 e Manual 2021";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordRegExp(expression: string, flags = "") {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalize(expression))}(?=$|[^a-z0-9])`, flags);
}

function quoteList(items: string[]) {
  const quoted = items.map((item) => `“${item}”`);
  if (quoted.length <= 1) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} e ${quoted.at(-1)}`;
}

// Linhas da competência sem a numeração (I -, II., a), 1., •, -).
function competenceLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^(?:[IVXLC]+\s*[-–—.)]|[a-z]\)|\d+(?:\.\d+)*[.)]?|[•\-–—*])\s*/i, "")
        .trim(),
    )
    .filter(Boolean);
}

// Item 6.k: expressões que devem ser evitadas.
const AVOIDED_EXPRESSIONS = [
  "através",
  "inclusive",
  "e outros",
  "afetas",
  "os mesmos",
  "a quem de direito",
  "a quem competente",
];

// Item 6.i: atividades que não devem fazer parte das competências.
const ROUTINE_EXPRESSIONS = [
  "despachar",
  "assinar documentos",
  "horário de trabalho",
  "delegação de competência",
  "delegar competência",
  "penas disciplinares",
  "aplicação de penas",
];

// Item 6.l: competência descrita como finalidade ou objetivo.
const PURPOSE_EXPRESSIONS = [
  "com o objetivo de",
  "com a finalidade de",
  "a fim de",
  "visando",
  "objetivando",
];

// Item 6.m: verbos que denotam garantia.
const GUARANTEE_VERBS = ["garantir", "assegurar"];

// Palavras terminadas em -ando/-endo/-indo que não são gerúndio.
const NOT_GERUNDS = new Set([
  "quando",
  "segundo",
  "segunda",
  "comando",
  "comandos",
  "fundo",
  "fundos",
  "mundo",
  "profundo",
  "oriundo",
  "oriundos",
  "nefando",
  "hediondo",
  "lindo",
  "estupendo",
  "remendo",
  "adendo",
  "adendos",
  "dividendo",
  "dividendos",
  "subtraendo",
  "minuendo",
]);

// Item 6.h: verbos indicados para cada nível hierárquico (Manual 2021, que
// repete e amplia a lista do Guia 2012). "Coordenadoria" usa a lista da
// Coordenação.
const LEVEL_VERBS: { level: string; match: RegExp; verbs: string[] }[] = [
  {
    level: "Secretaria Executiva",
    match: /^secretaria executiva/,
    verbs: ["formular", "planejar", "coordenar", "definir"],
  },
  { level: "Subsecretaria", match: /^subsecretaria/, verbs: ["formular", "planejar", "coordenar", "definir"] },
  {
    level: "Assessoria",
    match: /^assessoria/,
    verbs: ["assessorar", "propor", "promover", "formular", "orientar", "elaborar"],
  },
  {
    level: "Unidade",
    match: /^unidade/,
    verbs: ["coordenar", "planejar", "dirigir", "formular", "assessorar", "promover", "analisar"],
  },
  {
    level: "Coordenação",
    match: /^coordena(cao|doria)/,
    verbs: ["coordenar", "supervisionar", "planejar", "dirigir", "formular", "promover", "analisar"],
  },
  {
    level: "Diretoria",
    match: /^diretoria/,
    verbs: ["planejar", "dirigir", "formular", "coordenar", "promover", "analisar", "supervisionar"],
  },
  {
    level: "Gerência",
    match: /^gerencia/,
    verbs: ["gerenciar", "analisar", "elaborar", "avaliar", "orientar", "controlar", "acompanhar"],
  },
  {
    level: "Núcleo",
    match: /^nucleo/,
    verbs: ["executar", "efetuar", "confeccionar", "arquivar", "classificar", "registrar", "emitir", "preparar"],
  },
];

// Item 7 do Manual 2021: oração final obrigatória.
function finalSentenceFor(sectorName: string) {
  return /^(gerencia|nucleo)/.test(normalize(sectorName.trim()))
    ? "Executar outras atividades que lhe forem atribuídas na sua área de atuação."
    : "Desenvolver outras atividades que lhe forem atribuídas na sua área de atuação.";
}

function isInfinitive(word: string) {
  return /^[a-zà-ú]+(ar|er|ir|or)$/.test(word) && word.length > 3;
}

function firstWord(line: string) {
  return normalize(line).match(/^[a-z]+/)?.[0] ?? "";
}

// Observações do guia para o texto da nova competência de um setor.
export function guideNotes(text: string, sectorName = ""): GuideNote[] {
  const notes: GuideNote[] = [];
  const normalized = normalize(text);
  const lines = competenceLines(text);
  if (!normalized.trim()) return notes;

  const avoided = AVOIDED_EXPRESSIONS.filter((expression) => wordRegExp(expression).test(normalized));
  if (avoided.length > 0) {
    notes.push({
      id: "expressoes-evitadas",
      source: `${BOTH_GUIDES}, item 6.k`,
      text: `Evitar as expressões ${quoteList(avoided)}.`,
    });
  }

  const bemComo = normalized.match(wordRegExp("bem como", "g"))?.length ?? 0;
  if (bemComo > 1) {
    notes.push({
      id: "bem-como",
      source: `${BOTH_GUIDES}, item 6.k`,
      text: `A expressão “bem como” aparece ${bemComo} vezes; deve ser evitado o excesso dessa expressão.`,
    });
  }

  const gerunds = [
    ...new Set(
      (normalized.match(/[a-z]+(ando|endo|indo)(?=$|[^a-z])/g) ?? []).filter(
        (word) => word.length > 5 && !NOT_GERUNDS.has(word),
      ),
    ),
  ];
  if (gerunds.length > 0) {
    notes.push({
      id: "gerundio",
      source: `${BOTH_GUIDES}, item 6.k`,
      text: `Evitar o gerúndio (${quoteList(gerunds)}).`,
    });
  }

  const adverbs = [...new Set(normalized.match(/[a-z]{3,}mente(?=$|[^a-z])/g) ?? [])];
  if (adverbs.length > 0) {
    notes.push({
      id: "adverbios",
      source: `${BOTH_GUIDES}, item 6.k`,
      text: `Evitar advérbios (${quoteList(adverbs)}).`,
    });
  }

  const routine = ROUTINE_EXPRESSIONS.filter((expression) => wordRegExp(expression).test(normalized));
  if (routine.length > 0) {
    notes.push({
      id: "rotina",
      source: `${BOTH_GUIDES}, item 6.i`,
      text:
        "Não devem fazer parte das competências atividades rotineiras (despachar com a chefia, assinar documentos), determinações relativas a horário de trabalho, delegação de competência e aplicação de penas disciplinares" +
        ` (encontrado: ${quoteList(routine)}).`,
    });
  }

  const purpose = PURPOSE_EXPRESSIONS.filter((expression) => wordRegExp(expression).test(normalized));
  if (purpose.length > 0) {
    notes.push({
      id: "finalidade",
      source: `${BOTH_GUIDES}, item 6.l`,
      text: `As competências não devem ser descritas como finalidades ou objetivos (encontrado: ${quoteList(purpose)}).`,
    });
  }

  const guarantees = GUARANTEE_VERBS.filter((verb) => wordRegExp(verb).test(normalized));
  if (guarantees.length > 0) {
    notes.push({
      id: "garantia",
      source: `${BOTH_GUIDES}, item 6.m`,
      text: `Nos verbos que denotam garantia (${quoteList(guarantees)}), deixar claro que a competência pode realmente ser viabilizada e de que forma. Exemplo do guia: em vez de “garantir proteção social ao idoso em situação de vulnerabilidade e risco”, usar “desenvolver atividades voltadas à proteção do idoso em situação de vulnerabilidade e risco na comunidade em que resida”.`,
    });
  }

  const notInfinitive = lines.filter((line) => !isInfinitive(firstWord(line)));
  if (notInfinitive.length > 0) {
    notes.push({
      id: "infinitivo",
      source: `${BOTH_GUIDES}, item 6.h`,
      text: `Cada competência deve começar com verbo no infinitivo que expresse bem a ação desempenhada. ${
        notInfinitive.length === 1 ? "Uma linha não começa" : `${notInfinitive.length} linhas não começam`
      } assim: ${quoteList(notInfinitive.slice(0, 3).map((line) => (line.length > 60 ? `${line.slice(0, 60)}…` : line)))}.`,
    });
  }

  const level = LEVEL_VERBS.find((entry) => entry.match.test(normalize(sectorName.trim())));
  if (level) {
    const outside = [
      ...new Set(
        lines
          .map(firstWord)
          .filter((word) => isInfinitive(word) && !level.verbs.includes(word) && word !== "desenvolver" && word !== "executar" && word !== "exercer"),
      ),
    ];
    if (outside.length > 0) {
      notes.push({
        id: "verbos-nivel",
        source: `${BOTH_GUIDES}, item 6.h`,
        text: `Os verbos devem estar correlacionados ao nível hierárquico. Para ${level.level}, o guia indica: ${level.verbs.join(", ")}. Verificar ${quoteList(outside)}.`,
      });
    }
  }

  const seen = new Map<string, number>();
  for (const line of lines) {
    const key = normalize(line).replace(/[^a-z0-9]+/g, " ").replace(/\b(e|;)\s*$/, "").trim();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  if ([...seen.values()].some((count) => count > 1)) {
    notes.push({
      id: "repeticao",
      source: `${BOTH_GUIDES}, item 6.f`,
      text: "Evitar a repetição de incisos que queiram dizer a mesma coisa; a otimização do texto deve ser observada.",
    });
  }

  if (lines.length >= 2) {
    const last = lines.at(-1) ?? "";
    const middle = lines.slice(0, -1);
    const penultimate = middle.at(-1) ?? "";
    const badMiddle = middle.some((line) => !/;(\s*e)?$/.test(line));
    if (badMiddle || !/\.$/.test(last) || !/;\s*e$/.test(penultimate)) {
      notes.push({
        id: "pontuacao-incisos",
        source: "Guia 2012, item 5 (Incisos)",
        text: "Havendo mais de um inciso, cada um termina com ponto-e-vírgula, exceto o último, que termina com ponto-final; no penúltimo, depois do ponto-e-vírgula, usa-se o conectivo “e”.",
      });
    }
  }

  if (!/outras (atividades|atribuicoes) que lhe forem (atribuidas|conferidas)/.test(normalized)) {
    notes.push({
      id: "oracao-final",
      source: "Manual 2021, item 7",
      text: `Incluir como competência final a oração padrão: “${finalSentenceFor(sectorName)}”`,
    });
  }

  return notes;
}

// Texto pronto para o campo de observação: uma orientação por linha, com o
// item do guia. Volta vazio quando nenhuma regra se aplica.
export function suggestObservation(text: string, sectorName = "") {
  return guideNotes(text, sectorName)
    .map((note) => `• ${note.text} (${note.source})`)
    .join("\n");
}
