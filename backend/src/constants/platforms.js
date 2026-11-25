export const PLATFORMS = [
  { id: "netflix", name: "Netflix", providerIds: [8] },
  { id: "prime", name: "Prime Video", providerIds: [9, 119] },
  { id: "disney", name: "Disney+", providerIds: [337] },
  { id: "max", name: "Max", providerIds: [1899, 384] },
  { id: "hulu", name: "Hulu", providerIds: [15] },
  { id: "apple", name: "Apple TV+", providerIds: [350] },
  { id: "theaters", name: "In Theaters", providerIds: [] },
  { id: "any", name: "Any Platform", providerIds: [] },
];

export const getPlatform = (id) => PLATFORMS.find((p) => p.id === id);
