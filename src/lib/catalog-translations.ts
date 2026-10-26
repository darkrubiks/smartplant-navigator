import { getLanguage, type Language } from "./i18n";

// Catalog phrases are translated without changing the source records or personal names.
export const catalogTranslations: ReadonlyArray<readonly [string, string]> = [
  ["Segurança", "Security"],
  ["Logística", "Logistics"],
  ["Produção", "Production"],
  ["Qualidade", "Quality"],
  ["Administrativo", "Administration"],
  ["RH / Saúde", "HR / Health"],
  ["Serviços", "Services"],
  ["Eventos", "Events"],
  ["RH", "HR"],
  ["Engenharia", "Engineering"],
  ["Manutenção", "Maintenance"],
  ["Utilidades", "Utilities"],
  ["Entrada principal da planta", "Main plant entrance"],
  ["Portaria Principal", "Main Gate"],
  ["Portaria de recebimento de materiais", "Materials receiving gate"],
  ["Portaria 4 - Expedição", "Gate 4 - Dispatch"],
  ["Portaria Gleba Sul", "South Parking Gate"],
  ["Acesso ao estacionamento sul", "Access to the south parking area"],
  ["Fabricação e montagem de eixos", "Axle manufacturing and assembly"],
  ["Linha de montagem final de caminhões", "Truck final assembly line"],
  ["Entrega técnica e almoxarifado de tintas", "Vehicle technical release and paint warehouse"],
  ["Estamparia e pintura KTL", "Press shop and KTL painting"],
  ["Montagem interna de cabines", "Cab interior assembly"],
  ["Usinagem e montagem de motores e câmbios", "Engine and transmission machining and assembly"],
  ["Linha de chassis para ônibus", "Bus chassis assembly line"],
  ["Fabricação de peças e montagem inferior", "Parts manufacturing and underbody assembly"],
  ["Banco de testes e dress-up de motores", "Engine testing and dress-up"],
  ["Centro de kits CKD para exportação", "CKD kit center for export"],
  ["Prédio 40 - Montagem de caminhões", "Building 40 - Truck assembly"],
  ["Escritórios administrativos", "Administrative offices"],
  ["Restaurante, ambulatório e escritórios", "Restaurant, medical clinic and offices"],
  ["Agência bancária", "Bank branch"],
  ["Escritórios", "Offices"],
  ["Restaurante e vestiários", "Restaurant and locker rooms"],
  ["Auditório principal", "Main auditorium"],
  ["Centro de treinamento corporativo", "Corporate training center"],
  ["Escola SENAI Mercedes-Benz", "Mercedes-Benz SENAI school"],
  ["Quadra poliesportiva", "Multi-sport court"],
  ["Centro de exibição e relacionamento", "Exhibition and customer relations center"],
  ["Escritórios de engenharia", "Engineering offices"],
  ["Centro de desenvolvimento de produto", "Product development center"],
  ["Corpo de bombeiros da planta", "Plant fire brigade"],
  ["Oficina de manutenção", "Maintenance workshop"],
  ["Almoxarifado geral", "General warehouse"],
  ["Ferramentaria central", "Central tooling workshop"],
  ["Preparação e almoxarifado de tintas", "Paint preparation and storage"],
  ["Posto de abastecimento interno", "Internal fuel station"],
  ["Almoxarifado auxiliar", "Auxiliary warehouse"],
  ["Portaria de materiais (Portaria 2)", "Materials gate (Gate 2)"],
  ["Edificação da Portaria 6", "Gate 6 building"],
  ["Edificação de suporte à produção", "Production support building"],
  ["Laboratório de teste de emissão", "Emissions testing laboratory"],
  ["Oficina mecânica de automóveis", "Automotive workshop"],
  ["Área de qualidade", "Quality area"],
  ["Subestação elétrica", "Electrical substation"],
  ["Torre de resfriamento", "Cooling tower"],
  ["Área de oficinas", "Workshop area"],
  ["Área de protótipos", "Prototype area"],
  ["Tratamento de água industrial", "Industrial water treatment"],
  ["Tratamento de efluentes", "Effluent treatment"],
  ["Casa de bombas", "Pump station"],
  ["Reservatório de água", "Water reservoir"],
  ["Almoxarifado", "Warehouse"],
  ["Área de manutenção", "Maintenance area"],
  ["Expedição de veículos da Portaria 4", "Vehicle dispatch at Gate 4"],
  ["Reservatório de combustíveis", "Fuel reservoir"],
  ["Central de amônia", "Ammonia plant"],
  ["Prédio auxiliar 80", "Auxiliary building 80"],
  ["Área de utilidades", "Utilities area"],
  ["Balança de veículos", "Vehicle weighbridge"],
  ["Suporte à produção", "Production support"],
  ["Almoxarifado de estampos", "Die warehouse"],
  ["Área de reciclagem", "Recycling area"],
  ["Área de embalagens", "Packaging area"],
  ["Almoxarifado de solventes", "Solvent warehouse"],
  ["Galpão de leilão", "Auction warehouse"],
  ["Armazenagem de resíduos", "Waste storage"],
  ["Área de benchmarking", "Benchmarking area"],
  ["Área destinada a sucata", "Scrap area"],
  ["Central de cavacos", "Swarf processing center"],
  [
    "Galpão de descontaminação de máquinas e equipamentos",
    "Machinery and equipment decontamination warehouse",
  ],
  ["Almoxarifado de longarinas", "Side-member warehouse"],
  ["Central de água gelada", "Chilled water plant"],
  ["DECON e almoxarifado Miniload", "DECON and Miniload warehouse"],
  ["Recebimento", "Receiving"],
  ["Recepção", "Reception"],
  ["Banco", "Bank"],
  ["Chefe do Restaurante", "Restaurant manager"],
  ["Reservas", "Reservations"],
  ["Coord. de T&D", "Training and development coordinator"],
  ["Coord. SENAI", "SENAI coordinator"],
  ["Serviços Gerais", "General services"],
  ["Recepção Espaço MB", "Espaço MB reception"],
  ["Diretoria de Eng.", "Engineering management"],
  ["Diretoria de P&D", "R&D management"],
  ["Comandante", "Commander"],
  ["Chefe da Manutenção", "Maintenance manager"],
  ["Chefe do Almoxarifado", "Warehouse manager"],
  ["Chefe da Ferramentaria", "Tooling manager"],
  ["Chefe da PT", "Paint preparation manager"],
  ["Frentista", "Fuel attendant"],
  ["Entrega de motor completo", "Complete engine delivery"],
  ["Entrega de componentes de chassis", "Chassis component delivery"],
];

export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const phrases = new Map<string, readonly [string, string]>();
for (const pair of catalogTranslations) {
  phrases.set(normalizeSearch(pair[0]), pair);
  phrases.set(normalizeSearch(pair[1]), pair);
}

export function translateCatalogText(
  value: string | null | undefined,
  language: Language = getLanguage(),
): string | null {
  if (!value) return null;
  const pair = phrases.get(normalizeSearch(value));
  if (pair) return pair[language === "pt-BR" ? 0 : 1];
  return value
    .replace(
      /\b(?:Prédio|Building)\s+([\w/-]+)/gi,
      `${language === "pt-BR" ? "Prédio" : "Building"} $1`,
    )
    .replace(/\b(?:Doca|Dock)\s+([\w-]+)/gi, `${language === "pt-BR" ? "Doca" : "Dock"} $1`)
    .replace(/\b(?:Portaria|Gate)\s+(\d+)/gi, `${language === "pt-BR" ? "Portaria" : "Gate"} $1`);
}

export function formatHours(
  value: string | null | undefined,
  language: Language = getLanguage(),
): string | null {
  if (!value) return null;
  if (/^24\s*h(?:ours)?$/i.test(value)) return language === "pt-BR" ? "24 horas" : "24 hours";
  return value.replace(/(\d{1,2})h(?:\b|(?=-))/g, "$1:00").replace(/\s*-\s*/g, "–");
}
