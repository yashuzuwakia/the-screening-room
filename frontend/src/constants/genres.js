// IDs match TMDB's movie genre list so they can be sent straight to the API.
export const GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
];

const GENRE_NAME_BY_ID = Object.fromEntries(GENRES.map((g) => [g.id, g.name]));

export const WIZARD_GENRE_IDS = [878, 53, 18, 35, 28, 9648, 10749, 27, 12, 14, 16, 80];

export const getGenreName = (id) => GENRE_NAME_BY_ID[id];

export const getGenreNames = (ids = []) => ids.map(getGenreName).filter(Boolean);

export const isKnownGenre = (id) => id in GENRE_NAME_BY_ID;
