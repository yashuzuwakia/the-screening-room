export const RUNTIMES = [
  { id: "short", label: "Under 90 minutes", hint: "A quick watch", maxMinutes: 90 },
  { id: "medium", label: "Under 2 hours", hint: "The classic movie night", maxMinutes: 120 },
  { id: "long", label: "Under 3 hours", hint: "Settle in for an epic", maxMinutes: 180 },
  { id: "any", label: "Any length", hint: "Time is no object", maxMinutes: null },
];

export const getRuntimeOption = (id) => RUNTIMES.find((r) => r.id === id);
