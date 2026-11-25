import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { MOODS, getMood } from "../../constants/moods";
import { GENRES, WIZARD_GENRE_IDS } from "../../constants/genres";
import { PLATFORMS } from "../../constants/platforms";
import { RUNTIMES } from "../../constants/runtimes";
import { EMPTY_PREFERENCES, preferencesToSearch } from "../../utils/preferences";
import {
  clearFindDraft,
  isWizardComplete,
  loadFindDraft,
  saveFindDraft,
} from "../../utils/findDraft";
import { useProfile } from "../../hooks/useProfile";
import { hoverLift, tapPress } from "../../constants/motion";
import "./RecommendationFlow.css";

const STEPS = [
  { id: "mood", label: "Mood", title: "How are you feeling tonight?" },
  { id: "genres", label: "Genres", title: "What genre are you in the mood for?", hint: "Pick as many as you like" },
  { id: "platforms", label: "Platforms", title: "Where can you watch?", hint: "Select every service you have" },
  { id: "runtime", label: "Time", title: "How much time do you have?" },
];

const WIZARD_GENRES = WIZARD_GENRE_IDS.map((id) => GENRES.find((g) => g.id === id));
const AUTO_ADVANCE_MS = 250;
const SURPRISE_MOOD_ID = "surprise";
const STEP_GENRES = 1;
const STEP_PLATFORMS = 2;

const isSurpriseMood = (moodId) => moodId === SURPRISE_MOOD_ID;

const toggleItem = (list, item) => (list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

function OptionCard({ selected, onClick, className = "", children }) {
  return (
    <motion.button
      type="button"
      className={`option-card ${className}${selected ? " is-selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
      whileHover={hoverLift}
      whileTap={tapPress}
    >
      {selected && (
        <span className="option-card__check" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
      {children}
    </motion.button>
  );
}

function PlatformMark({ platform }) {
  const Icon = platform.Icon;
  return (
    <span className="platform-mark" style={{ "--platform-color": platform.color }}>
      <Icon size={24} strokeWidth={2.25} />
    </span>
  );
}

function suggestedGenres(moodId) {
  return (getMood(moodId)?.genreIds ?? []).filter((id) => WIZARD_GENRE_IDS.includes(id));
}

export default function RecommendationFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { saveSearch } = useProfile();

  const [prefs, setPrefs] = useState(() => {
    const resume = searchParams.get("resume") === "1";
    const moodParam = searchParams.get("mood");
    const moodFromUrl = getMood(moodParam)?.id ?? "";

    if (resume) {
      const draft = loadFindDraft();
      if (draft?.prefs) {
        return { ...EMPTY_PREFERENCES, ...draft.prefs };
      }
    }

    if (moodFromUrl) {
      return {
        ...EMPTY_PREFERENCES,
        mood: moodFromUrl,
        genres: isSurpriseMood(moodFromUrl) ? [] : suggestedGenres(moodFromUrl),
      };
    }

    return { ...EMPTY_PREFERENCES };
  });

  const [savedStepIndex, setStepIndex] = useState(() => {
    const resume = searchParams.get("resume") === "1";
    const moodParam = searchParams.get("mood");

    if (resume) {
      const draft = loadFindDraft();
      if (draft != null) return Math.min(STEPS.length - 1, Math.max(0, draft.stepIndex));
    }

    if (getMood(moodParam)) return isSurpriseMood(moodParam) ? STEP_PLATFORMS : STEP_GENRES;

    return 0;
  });

  const stepIndex = isSurpriseMood(prefs.mood) && savedStepIndex === STEP_GENRES ? STEP_PLATFORMS : savedStepIndex;

  useEffect(() => {
    if (searchParams.get("resume") === "1") return;
    if (getMood(searchParams.get("mood"))) {
      clearFindDraft();
    }
  }, [searchParams]);

  useEffect(() => {
    if (isWizardComplete(prefs)) return;
    saveFindDraft({ prefs, stepIndex });
  }, [prefs, stepIndex]);

  const step = STEPS[stepIndex];

  const goTo = (index) => setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));

  /** Surprise Me skips genre step — empty genres, jump to platforms (STEP_PLATFORMS). */
  const selectMood = (mood) => {
    const surprise = isSurpriseMood(mood);
    setPrefs((current) => ({
      ...current,
      mood,
      genres: surprise ? [] : current.genres.length ? current.genres : suggestedGenres(mood),
    }));
    setTimeout(() => goTo(surprise ? STEP_PLATFORMS : STEP_GENRES), AUTO_ADVANCE_MS);
  };

  const goBack = () => {
    if (stepIndex === STEP_PLATFORMS && isSurpriseMood(prefs.mood)) {
      goTo(0);
      return;
    }
    goTo(stepIndex - 1);
  };

  const togglePlatform = (id) =>
    setPrefs((current) => {
      if (id === "any") return { ...current, platforms: current.platforms.includes("any") ? [] : ["any"] };
      return { ...current, platforms: toggleItem(current.platforms.filter((p) => p !== "any"), id) };
    });

  const finish = (runtime) => {
    const finalPrefs = { ...prefs, runtime };
    setPrefs(finalPrefs);
    clearFindDraft();
    saveSearch(finalPrefs);
    setTimeout(() => navigate(`/results${preferencesToSearch(finalPrefs)}`), AUTO_ADVANCE_MS);
  };

  const isStepComplete = [
    Boolean(prefs.mood),
    isSurpriseMood(prefs.mood) || prefs.genres.length > 0,
    prefs.platforms.length > 0,
    Boolean(prefs.runtime),
  ];

  return (
    <div className="flow">
      <div className="flow__glow" aria-hidden="true" />

      <div className="container flow__inner">
        <ol className="flow__progress" aria-label="Progress">
          {STEPS.map((s, i) => {
            const genreSkipped = i === STEP_GENRES && isSurpriseMood(prefs.mood);
            const state =
              i === stepIndex ? "current" : genreSkipped || i < stepIndex ? "done" : "upcoming";
            const reachable = i < stepIndex || isStepComplete.slice(0, i).every(Boolean);
            return (
              <li key={s.id} className={`flow__progress-item is-${state}`}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={!reachable || genreSkipped}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="flow__progress-dot">{state === "done" ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                  <span className="flow__progress-label">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait">
          <motion.section
            key={step.id}
            className="flow__step"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.5, ease: [0.33, 1, 0.45, 1] }}
            aria-labelledby={`step-${step.id}`}
          >
            <header className="flow__header">
              <p className="eyebrow">
                Question {stepIndex + 1} of {STEPS.length}
              </p>
              <h1 id={`step-${step.id}`} className="flow__title">
                {step.title}
              </h1>
              {step.hint && <p className="flow__hint">{step.hint}</p>}
            </header>

            {step.id === "mood" && (
              <div className="flow__grid flow__grid--4">
                {MOODS.map((mood) => {
                  const MoodGlyph = mood.Icon;
                  return (
                    <OptionCard
                      key={mood.id}
                      className="option-card--tall"
                      selected={prefs.mood === mood.id}
                      onClick={() => selectMood(mood.id)}
                    >
                      <span className="option-card__glyph" aria-hidden="true">
                        <MoodGlyph size={28} strokeWidth={1.75} />
                      </span>
                      <span className="option-card__label">{mood.label}</span>
                    </OptionCard>
                  );
                })}
              </div>
            )}

            {step.id === "genres" && (
              <div className="flow__grid flow__grid--4">
                {WIZARD_GENRES.map((genre) => (
                  <OptionCard
                    key={genre.id}
                    selected={prefs.genres.includes(genre.id)}
                    onClick={() => setPrefs((c) => ({ ...c, genres: toggleItem(c.genres, genre.id) }))}
                  >
                    <span className="option-card__label">{genre.name}</span>
                  </OptionCard>
                ))}
              </div>
            )}

            {step.id === "platforms" && (
              <div className="flow__grid flow__grid--4">
                {PLATFORMS.map((platform) => (
                  <OptionCard
                    key={platform.id}
                    className="option-card--tall"
                    selected={prefs.platforms.includes(platform.id)}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    <PlatformMark platform={platform} />
                    <span className="option-card__label">{platform.name}</span>
                  </OptionCard>
                ))}
              </div>
            )}

            {step.id === "runtime" && (
              <div className="flow__grid flow__grid--2">
                {RUNTIMES.map((runtime) => (
                  <OptionCard
                    key={runtime.id}
                    className="option-card--wide"
                    selected={prefs.runtime === runtime.id}
                    onClick={() => finish(runtime.id)}
                  >
                    <span className="option-card__icon">
                      <Clock size={24} />
                    </span>
                    <span>
                      <span className="option-card__label">{runtime.label}</span>
                      <span className="option-card__hint">{runtime.hint}</span>
                    </span>
                  </OptionCard>
                ))}
              </div>
            )}

            <footer className="flow__nav">
              {stepIndex > 0 ? (
                <button type="button" className="btn btn--secondary btn--lg" onClick={goBack}>
                  <ArrowLeft size={18} /> Back
                </button>
              ) : (
                <span />
              )}
              {(step.id === "genres" || step.id === "platforms") && (
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  onClick={() => goTo(stepIndex + 1)}
                  disabled={!isStepComplete[stepIndex]}
                >
                  Continue <ArrowRight size={18} />
                </button>
              )}
            </footer>
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
