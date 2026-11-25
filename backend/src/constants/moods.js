export const MOODS = [
  { id: "mind-blowing", label: "Mind-Blowing", adjective: "mind-bending", genreIds: [878, 9648, 53] },
  { id: "funny", label: "Funny", adjective: "light and funny", genreIds: [35] },
  { id: "emotional", label: "Emotional", adjective: "moving", genreIds: [18, 10749] },
  { id: "thrilling", label: "Thrilling", adjective: "edge-of-your-seat", genreIds: [53, 80, 28] },
  { id: "relaxing", label: "Relaxing", adjective: "easygoing", genreIds: [35, 10751, 16, 10402] },
  { id: "scary", label: "Scary", adjective: "genuinely scary", genreIds: [27, 53] },
  { id: "action-packed", label: "Action-Packed", adjective: "high-octane", genreIds: [28, 12] },
  { id: "surprise", label: "Surprise Me", adjective: "unexpected", genreIds: [] },
];

export const getMood = (id) => MOODS.find((m) => m.id === id);
