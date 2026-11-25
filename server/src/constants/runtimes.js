export const RUNTIMES = [
  { id: "short", maxMinutes: 90 },
  { id: "medium", maxMinutes: 120 },
  { id: "long", maxMinutes: 180 },
  { id: "any", maxMinutes: null },
];

export const getRuntimeOption = (id) => RUNTIMES.find((r) => r.id === id);
