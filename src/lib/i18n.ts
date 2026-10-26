export type Language = "en" | "pt-BR";
export const LANGUAGE_STORAGE_KEY = "smartplant-language";

// English is also the message identifier, so both languages share placeholders.
export const messages = {
  Language: "Idioma",
  Close: "Fechar",
  Back: "Voltar",
  "Go to map": "Ir para o mapa",
  "Back to map": "Voltar ao mapa",
  "Try again": "Tentar novamente",
  "Page not found": "Página não encontrada",
  "This address does not exist. Return to the main map.":
    "Este endereço não existe. Volte ao mapa principal.",
  "Something went wrong": "Ocorreu um erro",
  "The page could not be loaded. Try again or return to the map.":
    "Não foi possível carregar a página. Tente novamente ou volte ao mapa.",
  "Unable to start SmartPlant Navigator. Check the application configuration and refresh.":
    "Não foi possível iniciar o SmartPlant Navigator. Verifique a configuração do aplicativo e atualize a página.",
  "Mercedes SmartPlant Navigator — São Bernardo plant map":
    "Mercedes SmartPlant Navigator — Mapa da fábrica de São Bernardo",
  "Plant map and route guidance for São Bernardo do Campo.":
    "Mapa da fábrica e orientação de rotas em São Bernardo do Campo.",
  "Loading map…": "Carregando mapa…",
  "Loading buildings…": "Carregando prédios…",
  "Loading destination…": "Carregando destino…",
  "Quick destinations": "Destinos rápidos",
  Recent: "Recentes",
  Favorites: "Favoritos",
  "Where would you like to go?": "Para onde você quer ir?",
  Clear: "Limpar",
  "My location": "Minha localização",
  "Finding your location…": "Buscando sua localização…",
  "Your current location": "Sua localização atual",
  "Coordinate map · no street basemap": "Mapa de coordenadas · sem mapa de ruas",
  "Back to plant map": "Voltar ao mapa da fábrica",
  Latitude: "Latitude",
  Longitude: "Longitude",
  "Accuracy: {meters} m": "Precisão: {meters} m",
  "Location requires HTTPS or localhost.": "A localização requer HTTPS ou localhost.",
  "Your browser does not support location services.":
    "Seu navegador não oferece suporte a serviços de localização.",
  "Location access denied. Allow location access in your browser and try again.":
    "Acesso à localização negado. Permita o acesso à localização no navegador e tente novamente.",
  "Location request timed out. Please try again.":
    "O tempo de busca da localização esgotou. Tente novamente.",
  "Unable to determine your location. Check your device's location services and try again.":
    "Não foi possível determinar sua localização. Verifique os serviços de localização do dispositivo e tente novamente.",
  'No results for "{query}". Try a building number, name, or department.':
    'Nenhum resultado para "{query}". Tente o número, nome ou departamento de um prédio.',
  "View all buildings": "Ver todos os prédios",
  "Building directory": "Lista de prédios",
  "Browse every plant building and choose a destination.":
    "Explore os prédios da fábrica e escolha um destino.",
  "Search buildings": "Buscar prédios",
  "Search by building, number, or description": "Busque por prédio, número ou descrição",
  "No buildings found": "Nenhum prédio encontrado",
  "Try a different building name or number.": "Tente outro nome ou número de prédio.",
  "No description is available for this building yet.":
    "Ainda não há descrição disponível para este prédio.",
  "{name} — Building {number}": "{name} — Prédio {number}",
  "Get directions to Building {number}, {name}": "Ver rota para o Prédio {number}, {name}",
  "Get directions": "Ver rota",
  Department: "Departamento",
  Responsible: "Responsável",
  Hours: "Horário",
  Dock: "Doca",
  Industrial: "Industrial",
  Social: "Social",
  Auxiliary: "Auxiliar",
  Gate: "Portaria",
  Walking: "A pé",
  Car: "Carro",
  Truck: "Caminhão",
  Forklift: "Empilhadeira",
  "Recalculating route…": "Recalculando rota…",
  "Calculating route…": "Calculando rota…",
  "Arrival recorded!": "Chegada registrada!",
  "You have arrived at your destination!": "Você chegou ao seu destino!",
  "You have arrived at your destination": "Você chegou ao seu destino",
  Now: "Agora",
  "Center on user": "Centralizar na sua localização",
  Center: "Centralizar",
  Less: "Menos",
  More: "Mais",
  Distance: "Distância",
  Time: "Tempo",
  Arrival: "Chegada",
  Recalculate: "Recalcular",
  Pause: "Pausar",
  "Simulate route": "Simular rota",
  "Confirm arrival": "Confirmar chegada",
  End: "Encerrar",
  "Continue straight": "Siga em frente",
  "Turn right": "Vire à direita",
  "Turn left": "Vire à esquerda",
  "Welcome to Building {number} — {name}. Please wait for unloading authorization, if applicable.":
    "Bem-vindo ao Prédio {number} — {name}. Aguarde a autorização para descarregar, se necessário.",
  "Zoom in": "Aproximar",
  "Zoom out": "Afastar",
  "Map marker": "Marcador do mapa",
  Notifications: "Notificações",
} as const;

export type MessageKey = keyof typeof messages;
export function translate(
  key: MessageKey,
  values: Record<string, string | number> = {},
  language: Language = getLanguage(),
): string {
  const text = language === "pt-BR" ? messages[key] : key;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}

export function detectLanguage(saved: string | null, preferred: readonly string[]): Language {
  if (saved === "en" || saved === "pt-BR") return saved;
  for (const language of preferred) {
    if (/^pt(?:-|$)/i.test(language)) return "pt-BR";
    if (/^en(?:-|$)/i.test(language)) return "en";
  }
  return "en";
}

let currentLanguage: Language | undefined;
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  if (currentLanguage) return currentLanguage;
  let saved: string | null = null;
  try {
    saved = typeof localStorage !== "undefined" ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
  } catch {
    /* Storage may be blocked in private browsing. */
  }
  currentLanguage = detectLanguage(
    saved,
    typeof navigator === "undefined" ? [] : navigator.languages,
  );
  return currentLanguage;
}

export function setLanguage(language: Language) {
  currentLanguage = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* Keep the in-memory preference when storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) return;
    currentLanguage = undefined;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function getLocale(language: Language = getLanguage()) {
  return language === "pt-BR" ? "pt-BR" : "en-US";
}
