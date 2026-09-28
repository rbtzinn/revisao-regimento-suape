import type { CompetencyRecord, DirectorateName } from "@/app/lib/types";
import { getStructureStatus } from "@/app/lib/status";

/**
 * Organograma SUAPE de 16/06/2026, na mesma hierarquia do PDF oficial.
 *
 * Cada caixa aponta para a linha da planilha pelo nome da coluna B
 * ("Nome no organograma atual") dentro da aba da diretoria. Quando a
 * planilha usa um nome diferente do PDF, `sheetName` guarda o nome dela.
 * Caixas sem linha na planilha (conselhos, comitês…) usam `sheet: false`.
 */
type OrgUnitSpec = {
  id: string;
  name: string;
  acronym?: string;
  tab?: DirectorateName;
  sheetName?: string;
  sheet?: false;
  highlight?: boolean;
  children?: OrgUnitSpec[];
};

const ORG_CHART: OrgUnitSpec = {
  id: "assembleia",
  name: "Assembleia Geral",
  sheet: false,
  highlight: true,
  children: [
    { id: "conselho-fiscal", name: "Conselho Fiscal", sheet: false },
    { id: "comite-elegibilidade", name: "Comitê de Elegibilidade", sheet: false },
    {
      id: "conselho-autoridade-portuaria",
      name: "Conselho de Autoridade Portuária",
      sheet: false,
    },
    {
      id: "conselho-administracao",
      name: "Conselho de Administração",
      sheet: false,
      highlight: true,
      children: [
        {
          id: "auditoria-interna",
          name: "Auditoria Interna",
          tab: "Auditoria Interna",
        },
        { id: "comite-auditoria", name: "Comitê de Auditoria", sheet: false },
        {
          id: "presidencia",
          name: "Diretoria da Presidência",
          tab: "Presidência",
          highlight: true,
          children: [
            { id: "conselho-etica", name: "Conselho de Ética", sheet: false },
            {
              id: "compliance",
              name: "Compliance – Unidade de Integridade, Gestão de Riscos e Controles Internos",
              sheetName:
                "Compliance - Unidade de Integridade, Gestão de Riscos e Controle Interno",
            },
            { id: "ouvidoria", name: "Ouvidoria" },
            {
              id: "aepg",
              name: "Assessoria Especial de Planejamento e Gestão",
              children: [
                { id: "coord-licitacoes", name: "Coordenadoria de Licitações" },
                {
                  id: "coord-planejamento-contratos",
                  name: "Coordenadoria de Planejamento e Controle de Contratos e Convênios",
                },
                {
                  id: "coord-compras",
                  name: "Coordenadoria de Compras",
                  children: [{ id: "ger-compras", name: "Gerência de Compras" }],
                },
                {
                  id: "coord-monitoramento-contratos",
                  name: "Coordenadoria de Monitoramento, Contratos, Convênios e Licitações",
                  children: [
                    {
                      id: "ger-planejamento-dados",
                      name: "Gerência de Planejamento e Monitoramento de Dados",
                    },
                  ],
                },
              ],
            },
            {
              id: "ccom",
              name: "Coordenadoria de Comunicação e Marketing",
              acronym: "CCOM",
              children: [
                { id: "assessoria-comunicacao", name: "Assessoria de Comunicação" },
                {
                  id: "cecom",
                  name: "Coordenadoria Executiva de Comunicação",
                  acronym: "CECOM",
                },
                {
                  id: "cem",
                  name: "Coordenadoria Executiva de Marketing",
                  acronym: "CEM",
                },
              ],
            },
            {
              id: "aepe",
              name: "Assessoria Especial de Projetos Estratégicos",
              acronym: "AEPE",
              children: [
                {
                  id: "ce-projetos-estrategicos",
                  name: "Coordenadoria Executiva de Projetos Estratégicos",
                },
              ],
            },
            {
              id: "cgri",
              name: "Chefia de Gabinete e Relações Institucionais",
              acronym: "CGRI",
              sheetName: "Chefia de Gabinete",
              children: [
                {
                  id: "cev",
                  name: "Coordenadoria de Eventos",
                  acronym: "CEV",
                  sheetName: "Coordenadoria de Eventos e Cerimonial",
                  children: [
                    {
                      id: "ceven",
                      name: "Coordenadoria Executiva de Eventos",
                      acronym: "CEVEN",
                    },
                    {
                      id: "cege",
                      name: "Coordenadoria Executiva de Gestão",
                      acronym: "CEGE",
                    },
                  ],
                },
              ],
            },
            {
              id: "aeae",
              name: "Assessoria Especial de Assuntos Estratégicos",
            },
            { id: "aeg", name: "Assessoria Especial Governamental" },
            {
              id: "csegp",
              name: "Coordenadoria de Segurança Portuária",
              acronym: "CSEGP",
              children: [
                {
                  id: "ger-administrativa-csegp",
                  name: "Gerência Administrativa",
                  sheetName: "Gerência Administrativa de Segurança Portuária",
                },
                {
                  id: "ger-operacional-csegp",
                  name: "Gerência Operacional",
                  sheetName: "Gerência Operacional de Segurança Portuária",
                },
                {
                  id: "ger-seguranca-portuaria",
                  name: "Gerência de Segurança Portuária",
                },
              ],
            },
            {
              id: "drig",
              name: "Diretoria de Relações Institucionais e Governamentais",
              acronym: "DRIG",
              tab: "Relações Inst.",
              highlight: true,
              children: [
                {
                  id: "aeri-drig",
                  name: "Assessoria Especial de Relações Institucionais",
                  children: [
                    {
                      id: "ce-relacoes-externas",
                      name: "Coordenadoria Executiva de Relações Externas",
                    },
                  ],
                },
                {
                  id: "coord-relacoes-institucionais",
                  name: "Coordenadoria de Relações Institucionais",
                  children: [
                    {
                      id: "ce-relacoes-institucionais",
                      name: "Coordenadoria Executiva de Relações Institucionais",
                    },
                  ],
                },
              ],
            },
            {
              id: "djur",
              name: "Diretoria Jurídica",
              acronym: "DJUR",
              tab: "Jurídica",
              highlight: true,
              children: [
                {
                  id: "ajdp",
                  name: "Assessoria Jurídica da Presidência",
                  acronym: "AJDP",
                },
                {
                  id: "aji",
                  name: "Assessoria Jurídica de Infraestrutura",
                  acronym: "AJI",
                },
                {
                  id: "ajsi",
                  name: "Assessoria Jurídica de Sustentabilidade e Inovação",
                  acronym: "AJSI",
                },
                {
                  id: "ajdgi",
                  name: "Assessoria Jurídica de Desenvolvimento e Gestão Industrial",
                  acronym: "AJDGI",
                },
                {
                  id: "ajdgp",
                  name: "Assessoria Jurídica de Desenvolvimento e Gestão Portuária",
                  acronym: "AJDGP",
                },
                {
                  id: "ajaaf",
                  name: "Assessoria Jurídica de Assuntos Administrativos e Financeiros",
                  acronym: "AJAAF",
                },
                {
                  id: "ajrig",
                  name: "Assessoria Jurídica de Relações Institucionais e Governamentais",
                  acronym: "AJRIG",
                },
              ],
            },
            {
              id: "dgi",
              name: "Diretoria de Desenvolvimento e Gestão Industrial",
              acronym: "DGI",
              tab: "Gestão Industrial",
              highlight: true,
              children: [
                {
                  id: "aen",
                  name: "Assessoria Especial de Negócios",
                  acronym: "AEN",
                },
                {
                  id: "aeri-dgi",
                  name: "Assessoria Especial de Relações Institucionais",
                  acronym: "AERI",
                },
                {
                  id: "cdp",
                  name: "Coordenadoria de Desenvolvimento e Prospecções",
                  acronym: "CDP",
                },
                {
                  id: "gti",
                  name: "Gerência do Território Industrial",
                  acronym: "GTI",
                },
                {
                  id: "cim",
                  name: "Coordenadoria de Inteligência de Mercado",
                  acronym: "CIM",
                },
              ],
            },
            {
              id: "daf",
              name: "Diretoria de Administração e Finanças",
              acronym: "DAF",
              tab: "Adm. Finanças",
              highlight: true,
              children: [
                {
                  id: "cga",
                  name: "Coordenadoria de Gestão e Assessoramento Administrativo Financeiro",
                  acronym: "CGA",
                  sheetName: "Coordenadoria de Gestão e Assessoramento Financeiro",
                },
                {
                  id: "crh",
                  name: "Coordenadoria de Recursos Humanos",
                  acronym: "CRH",
                  sheetName: "Coordenadoria de Gestão de Pessoas e Cultura",
                  children: [
                    {
                      id: "cetd",
                      name: "Coordenadoria Executiva de Treinamento e Desenvolvimento",
                      acronym: "CETD",
                    },
                    {
                      id: "cefp",
                      name: "Coordenadoria Executiva de Folha de Pagamento e Controle de Pessoal",
                      acronym: "CEFP",
                    },
                    {
                      id: "ceaa",
                      name: "Coordenadoria Executiva de Apoio Administrativo",
                      acronym: "CEAA",
                      sheetName: "Coordenadoria Executiva de Gestão Administrativa",
                    },
                  ],
                },
                {
                  id: "cpg",
                  name: "Coordenadoria de Planejamento e Gestão",
                  acronym: "CPG",
                  children: [
                    {
                      id: "gpg",
                      name: "Gerência de Planejamento e Gestão",
                      acronym: "GPG",
                      children: [
                        {
                          id: "ceeg",
                          name: "Coordenadoria Executiva de Estratégia e Gestão",
                          acronym: "CEEG",
                        },
                        {
                          id: "cemgf",
                          name: "Coordenadoria Executiva de Monitoramento e Gestão Financeira",
                          acronym: "CEMGF",
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "cad",
                  name: "Coordenadoria Administrativa",
                  acronym: "CAD",
                  children: [
                    {
                      id: "ceg",
                      name: "Coordenadoria Executiva de Gestão",
                      acronym: "CEG",
                    },
                    {
                      id: "cetran",
                      name: "Coordenadoria Executiva de Transporte",
                      acronym: "CETRAN",
                    },
                  ],
                },
                {
                  id: "cof",
                  name: "Coordenadoria de Finanças",
                  acronym: "COF",
                  children: [
                    {
                      id: "gcc",
                      name: "Gerência de Contratos e Convênios",
                      acronym: "GCC",
                    },
                    {
                      id: "cear",
                      name: "Coordenadoria Executiva de Arrecadação",
                      acronym: "CEAR",
                    },
                    {
                      id: "cecon",
                      name: "Coordenadoria Executiva de Contabilidade",
                      acronym: "CECON",
                    },
                  ],
                },
                {
                  id: "cpp",
                  name: "Coordenadoria de Proteção ao Patrimônio",
                  acronym: "CPP",
                  children: [
                    {
                      id: "app",
                      name: "Assessoria de Proteção ao Patrimônio",
                      acronym: "APP",
                    },
                  ],
                },
              ],
            },
            {
              id: "dinfra",
              name: "Diretoria de Infraestrutura",
              acronym: "DINFRA",
              tab: "Infraestrutura",
              highlight: true,
              children: [
                {
                  id: "carq",
                  name: "Coordenadoria de Arquitetura e Urbanismo",
                  acronym: "CARQ",
                  children: [
                    {
                      id: "cearq",
                      name: "Coordenadoria Executiva de Arquitetura",
                      acronym: "CEARQ",
                    },
                  ],
                },
                {
                  id: "ceom",
                  name: "Coordenadoria Especial de Obras e Manutenções",
                  acronym: "CEOM",
                  children: [
                    {
                      id: "goport",
                      name: "Gerência de Obras Portuárias",
                      acronym: "GOPORT",
                      children: [
                        {
                          id: "ceop-obras",
                          name: "Coordenadoria Executiva de Obras Portuárias",
                          acronym: "CEOP",
                        },
                      ],
                    },
                    {
                      id: "goim",
                      name: "Gerência de Obras de Infraestrutura e Manutenção",
                      acronym: "GOIM",
                    },
                    {
                      id: "cemp",
                      name: "Coordenadoria Executiva de Manutenção Portuária",
                      acronym: "CEMP",
                    },
                    {
                      id: "gco",
                      name: "Gerência de Contratação de Obras",
                      acronym: "GCO",
                      children: [
                        {
                          id: "ceoo",
                          name: "Coordenadoria Executiva de Orçamento de Obras",
                          acronym: "CEOO",
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "cpri",
                  name: "Coordenadoria de Projetos de Infraestrutura",
                  acronym: "CPRI",
                },
                {
                  id: "ggcm",
                  name: "Gerência de Gestão de Contratos e Monitoramento",
                  acronym: "GGCM",
                },
                {
                  id: "cit",
                  name: "Coordenadoria de Informação Territorial",
                  acronym: "CIT",
                },
              ],
            },
            {
              id: "dgp",
              name: "Diretoria de Desenvolvimento e Gestão Portuária",
              acronym: "DGP",
              tab: "Gestão Portuária",
              highlight: true,
              children: [
                {
                  id: "gpnp",
                  name: "Gerência de Planejamento e Negócios Portuários",
                  acronym: "GPNP",
                },
                {
                  id: "gtmop",
                  name: "Gerência de Tráfego Marítimo e Operações Portuárias",
                  acronym: "GTMOP",
                  children: [
                    {
                      id: "ceptm",
                      name: "Coordenadoria Executiva de Programação e Tráfego Marítimo",
                      acronym: "CEPTM",
                    },
                    {
                      id: "ceop-operacoes",
                      name: "Coordenadoria Executiva de Operações Portuárias",
                      acronym: "CEOP",
                    },
                  ],
                },
                {
                  id: "ccp-estruturacao",
                  name: "Coordenadoria de Estruturação e Estratégia Contratual",
                  acronym: "CCP",
                },
                {
                  id: "aeep",
                  name: "Assessoria Executiva de Estratégia Portuária",
                  acronym: "AEEP",
                  children: [
                    {
                      id: "cerp",
                      name: "Coordenadoria Executiva de Relacionamento Portuário",
                      acronym: "CERP",
                    },
                  ],
                },
                {
                  id: "ccp-concessoes",
                  name: "Coordenadoria de Concessões e Participações",
                  acronym: "CCP",
                  children: [
                    {
                      id: "cecp",
                      name: "Coordenadoria Executiva de Concessões e Participações",
                      acronym: "CECP",
                    },
                  ],
                },
                {
                  id: "ggap",
                  name: "Gerência de Gestão Ambiental Portuária",
                  acronym: "GGAP",
                },
                {
                  id: "cse",
                  name: "Coordenadoria de Segurança e Emergência",
                  acronym: "CSE",
                },
              ],
            },
            {
              id: "dsi",
              name: "Diretoria de Sustentabilidade e Inovação",
              acronym: "DSI",
              tab: "Sustentab. Inov.",
              highlight: true,
              children: [
                {
                  id: "casgf",
                  name: "Coordenadoria de Assistência Social e Gestão Fundiária",
                  acronym: "CASGF",
                },
                {
                  id: "cda",
                  name: "Coordenadoria de Desenvolvimento Ambiental",
                  acronym: "CDA",
                  children: [
                    {
                      id: "ggat",
                      name: "Gerência de Gestão Ambiental Territorial",
                      acronym: "GGAT",
                    },
                    {
                      id: "gml",
                      name: "Coordenadoria Executiva de Monitoramento e Licenciamento",
                      acronym: "GML",
                    },
                  ],
                },
                {
                  id: "cpecm",
                  name: "Coordenadoria de Projeto Especial Comunidade Ilha de Mercês",
                  acronym: "CPECM",
                },
                { id: "gesg", name: "Gerência de ESG", acronym: "GESG" },
                { id: "cin", name: "Coordenadoria de Inovação", acronym: "CIN" },
                {
                  id: "ctic",
                  name: "Gerência de Tecnologia da Informação e Comunicação",
                  acronym: "CTIC",
                  sheetName: "Coordenadoria de Tecnologia da Informação e Comunicação",
                  children: [
                    {
                      id: "gsti",
                      name: "Gerência de Segurança e Governança de TI",
                      acronym: "GSTI",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Linhas da planilha que não aparecem no PDF, mas cujo lugar é claro pelo
 * nome. As demais linhas sem caixa ficam ligadas à diretoria da aba.
 */
const EXTRA_ROW_PARENTS: Array<{ tab: DirectorateName; name: string; parentId: string }> = [
  {
    tab: "Presidência",
    name: "Gerência de Inteligência e Estatística de Segurança Portuária",
    parentId: "csegp",
  },
  { tab: "Presidência", name: "Assessoria Executiva de Gabinete", parentId: "cgri" },
  {
    tab: "Adm. Finanças",
    name: "Coordenadoria Executiva de Gestão de Pessoas e Apoio Social",
    parentId: "crh",
  },
];

export type OrgNode = {
  id: string;
  name: string;
  acronym?: string;
  highlight: boolean;
  depth: number;
  parentId?: string;
  childIds: string[];
  record?: CompetencyRecord;
  /** Linha da planilha que não tem caixa própria no PDF. */
  fromSheetOnly: boolean;
  hasSheetRow: boolean;
};

export type OrgChart = {
  rootId: string;
  nodes: Map<string, OrgNode>;
  /** Ordem de percurso (pais antes dos filhos). */
  order: string[];
};

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function recordKey(tab: string, name: string) {
  return `${tab}::${normalizeText(name)}`;
}

function slug(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildOrgChart(records: CompetencyRecord[]): OrgChart {
  const available = new Map<string, CompetencyRecord>();
  for (const record of records) {
    if (getStructureStatus(record) === "removed") continue;
    const key = recordKey(record.directorate, record.currentName);
    if (!available.has(key)) available.set(key, record);
  }

  const nodes = new Map<string, OrgNode>();
  const tabRoots = new Map<string, string>();

  function visit(
    spec: OrgUnitSpec,
    depth: number,
    inheritedTab: DirectorateName | undefined,
    parentId?: string,
  ) {
    const tab = spec.tab ?? inheritedTab;
    const isTabRoot = Boolean(spec.tab);
    let record: CompetencyRecord | undefined;
    if (spec.sheet !== false && tab) {
      const key = recordKey(tab, spec.sheetName ?? spec.name);
      record = available.get(key);
      if (record) available.delete(key);
    }
    if (isTabRoot && tab) tabRoots.set(tab, spec.id);

    const node: OrgNode = {
      id: spec.id,
      name: spec.name,
      acronym: spec.acronym,
      highlight: Boolean(spec.highlight),
      depth,
      parentId,
      childIds: [],
      record,
      fromSheetOnly: false,
      hasSheetRow: Boolean(record),
    };
    nodes.set(spec.id, node);

    for (const child of spec.children ?? []) {
      visit(child, depth + 1, tab, spec.id);
      node.childIds.push(child.id);
    }
  }

  visit(ORG_CHART, 0, undefined);

  // Linhas da planilha sem caixa no PDF continuam visíveis no mapa.
  const extraParents = new Map(
    EXTRA_ROW_PARENTS.map((item) => [recordKey(item.tab, item.name), item.parentId]),
  );
  for (const [key, record] of available) {
    const parentId = extraParents.get(key) ?? tabRoots.get(record.directorate);
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (!parent) continue;
    const id = `planilha-${slug(record.directorate)}-${record.rowNumber}`;
    nodes.set(id, {
      id,
      name: record.currentName.trim(),
      highlight: false,
      depth: parent.depth + 1,
      parentId: parent.id,
      childIds: [],
      record,
      fromSheetOnly: true,
      hasSheetRow: true,
    });
    parent.childIds.push(id);
  }

  const order: string[] = [];
  const walk = (id: string) => {
    order.push(id);
    nodes.get(id)?.childIds.forEach(walk);
  };
  walk(ORG_CHART.id);

  return { rootId: ORG_CHART.id, nodes, order };
}

export function ancestorsOf(chart: OrgChart, id: string) {
  const path: OrgNode[] = [];
  let current = chart.nodes.get(id);
  while (current?.parentId) {
    current = chart.nodes.get(current.parentId);
    if (current) path.unshift(current);
  }
  return path;
}

export function nodeSearchText(node: OrgNode) {
  const record = node.record;
  return normalizeText(
    [
      node.name,
      node.acronym ?? "",
      record?.currentName ?? "",
      record?.previousName ?? "",
      record?.newCompetence ?? "",
      record?.reviewedCompetence ?? "",
      record && !record.newCompetence.trim() ? record.previousCompetence : "",
    ].join(" "),
  );
}

export function searchOrgChart(chart: OrgChart, query: string) {
  const terms = normalizeText(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  return chart.order.filter((id) => {
    const node = chart.nodes.get(id);
    if (!node) return false;
    const text = nodeSearchText(node);
    return terms.every((term) => text.includes(term));
  });
}
