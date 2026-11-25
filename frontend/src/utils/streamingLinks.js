/** Outbound links to streaming services (TMDB lists providers, not title deep links). */

const AMAZON_HOST = {
  US: "www.amazon.com",
  IN: "www.amazon.in",
  GB: "www.amazon.co.uk",
  CA: "www.amazon.ca",
  AU: "www.amazon.com.au",
  DE: "www.amazon.de",
  FR: "www.amazon.fr",
  JP: "www.amazon.co.jp",
  BR: "www.amazon.com.br",
  MX: "www.amazon.com.mx",
  ES: "www.amazon.es",
  IT: "www.amazon.it",
  AE: "www.amazon.ae",
  SG: "www.amazon.sg",
};

function amazonHost(region) {
  return AMAZON_HOST[region?.toUpperCase()] ?? AMAZON_HOST.US;
}

function netflixSearch(q) {
  return `https://www.netflix.com/search?q=${q}`;
}

function primeSearch(q, code) {
  if (code === "IN") return `https://www.primevideo.com/search?phrase=${q}`;
  return `https://${amazonHost(code)}/s?k=${q}`;
}

function disneySearch(q, code) {
  if (code === "IN") return `https://www.hotstar.com/in/search?q=${q}`;
  return `https://www.disneyplus.com/search?q=${q}`;
}

/** TMDB watch provider IDs → search URL on the real platform. */
const BY_PROVIDER_ID = {
  8: (q) => netflixSearch(q),
  9: (q, code) => primeSearch(q, code),
  119: (q, code) => primeSearch(q, code),
  177: (q, code) => primeSearch(q, code),
  2100: (q, code) => primeSearch(q, code),
  15: (q) => `https://www.hulu.com/search?q=${q}`,
  337: (q, code) => disneySearch(q, code),
  122: (q) => `https://www.hotstar.com/in/search?q=${q}`,
  350: (q) => `https://tv.apple.com/search?term=${q}`,
  384: (q) => `https://www.max.com/search?q=${q}`,
  1899: (q) => `https://www.max.com/search?q=${q}`,
  220: (q) => `https://www.zee5.com/search?q=${q}`,
  532: (q) => `https://www.sonyliv.com/search?q=${q}`,
  233: (q) => `https://www.jiocinema.com/search?q=${q}`,
  531: (q) => `https://www.paramountplus.com/search?q=${q}`,
  386: (q) => `https://www.peacocktv.com/watch/search?q=${q}`,
  283: (q) => `https://www.crunchyroll.com/search?q=${q}`,
  43: (q) => `https://www.starz.com/us/en/search?q=${q}`,
};

function resolveByName(providerName, q, code) {
  const n = (providerName ?? "").toLowerCase();
  if (!n) return null;
  if (n.includes("netflix")) return netflixSearch(q);
  if (n.includes("hotstar") || n.includes("jiohotstar")) return `https://www.hotstar.com/in/search?q=${q}`;
  if (n.includes("jiocinema") || (n.includes("jio") && n.includes("cinema"))) {
    return `https://www.jiocinema.com/search?q=${q}`;
  }
  if (n.includes("zee5") || n.includes("zee 5")) return `https://www.zee5.com/search?q=${q}`;
  if (n.includes("sony") && (n.includes("liv") || n.includes("live"))) return `https://www.sonyliv.com/search?q=${q}`;
  if (n.includes("prime") || n.includes("amazon")) return primeSearch(q, code);
  if (n.includes("disney")) return disneySearch(q, code);
  if (n.includes("apple tv")) return `https://tv.apple.com/search?term=${q}`;
  if (n.includes("hulu")) return `https://www.hulu.com/search?q=${q}`;
  if (n === "max" || n.includes("hbo max") || n.includes("max ")) return `https://www.max.com/search?q=${q}`;
  if (n.includes("paramount")) return `https://www.paramountplus.com/search?q=${q}`;
  if (n.includes("peacock")) return `https://www.peacocktv.com/watch/search?q=${q}`;
  if (n.includes("crunchyroll")) return `https://www.crunchyroll.com/search?q=${q}`;
  return null;
}

export function justWatchSearchUrl(title, region = "US") {
  const q = encodeURIComponent(title ?? "");
  const locale = (region || "US").toLowerCase();
  return `https://www.justwatch.com/${locale}/search?q=${q}`;
}

export function providerWatchUrl({ providerId, providerName, title, region = "US" }) {
  const q = encodeURIComponent(title ?? "");
  const code = region?.toUpperCase() || "US";
  const id = Number(providerId);

  if (Number.isFinite(id) && BY_PROVIDER_ID[id]) {
    return BY_PROVIDER_ID[id](q, code);
  }

  const byName = resolveByName(providerName, q, code);
  if (byName) return byName;

  return justWatchSearchUrl(title, code);
}

export function mapStreamingProviders({ flatrate = [], title, region }, imageFn) {
  const sorted = [...flatrate].sort(
    (a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99),
  );
  return sorted.map((p) => ({
    id: p.provider_id,
    name: p.provider_name,
    logoUrl: imageFn?.(p.logo_path) ?? null,
    url: providerWatchUrl({
      providerId: p.provider_id,
      providerName: p.provider_name,
      title,
      region,
    }),
  }));
}
