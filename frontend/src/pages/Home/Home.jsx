import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, WandSparkles } from "lucide-react";
import MovieGrid from "../../components/movie/MovieGrid";
import { useRegionalPopularMovies, useTrendingMovies } from "../../hooks/useMovies";
import { useProfile } from "../../hooks/useProfile";
import { HERO_COLLAGE, HOW_IT_WORKS } from "../../constants/homeContent";
import { MOODS } from "../../constants/moods";
import MoodIcon from "../../components/common/MoodIcon";
import { fadeInView, fadeUp } from "../../constants/motion";
import ContinueFindBanner from "../../components/home/ContinueFindBanner";
import LastResultsBanner from "../../components/home/LastResultsBanner";
import "./Home.css";

export default function Home() {
  const { watchRegionMeta } = useProfile();
  const { data: globalPopular, isLoading: globalLoading } = useTrendingMovies();
  const { data: regionalPopular, isLoading: regionalLoading } = useRegionalPopularMovies();
  const collageItems =
    globalPopular?.length >= 4
      ? globalPopular.slice(0, 4).map((m) => ({
          key: m.id,
          src: m.backdropUrl ?? m.posterUrl,
        }))
      : HERO_COLLAGE.map((src, i) => ({ key: `fallback-${i}`, src }));

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__collage hero__collage--motion" aria-hidden="true">
          {collageItems.map((item, i) => (
            <div key={item.key} className={`hero__tile hero__tile--motion hero__tile--${i}`}>
              {item.src ? <img src={item.src} alt="" decoding="async" fetchPriority="high" /> : null}
            </div>
          ))}
        </div>
        <div className="hero__shade" aria-hidden="true" />
        <div className="hero__glow" aria-hidden="true" />

        <div className="container hero__content">
          <motion.span className="eyebrow hero__eyebrow" {...fadeUp(0.1)}>
            <WandSparkles size={14} /> Personal picks in under 60 seconds
          </motion.span>
          <motion.h1 className="hero__title" {...fadeUp(0.2)}>
            What should we <span className="hero__highlight">watch tonight?</span>
          </motion.h1>
          <motion.p className="hero__subtitle" {...fadeUp(0.35)}>
            Answer four quick questions. We weigh your mood, genres, streaming services and time to find the one
            movie worth pressing play on.
          </motion.p>
          <motion.div className="hero__actions" {...fadeUp(0.5)}>
            <Link to="/find" className="btn btn--primary btn--lg">
              Find my movie <ArrowRight size={18} />
            </Link>
            <Link to="/discover" className="btn btn--secondary btn--lg">
              Browse popular picks
            </Link>
          </motion.div>

          <motion.div className="hero__moods" {...fadeUp(0.65)}>
            <span className="hero__moods-label">Or start with a mood:</span>
            <div className="hero__mood-list">
              {MOODS.slice(0, 6).map((mood) => (
                <Link key={mood.id} to={`/find?mood=${mood.id}`} className="mood-pill">
                  <MoodIcon moodId={mood.id} size={16} className="mood-pill__icon" /> {mood.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <ContinueFindBanner />
      <LastResultsBanner />

      <section className="container home__section">
        <motion.div className="home__section-head" {...fadeInView()}>
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">From "I don't know" to "press play"</h2>
        </motion.div>
        <ol className="steps">
          {HOW_IT_WORKS.map(({ Icon, title, description }, index) => (
            <motion.li key={title} className="step" {...fadeInView(index * 0.1)}>
              <span className="step__number">0{index + 1}</span>
              <span className="step__icon">
                <Icon size={26} />
              </span>
              <h3 className="step__title">{title}</h3>
              <p className="step__description">{description}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="container home__section">
        <div className="home__row-head home__row-head--trending">
          <div>
            <span className="eyebrow">For everyone</span>
            <h2 className="section-title">Popular right now</h2>
            <p className="text-muted home__region-hint">
              Same list for everyone — great when you want what&apos;s buzzing worldwide.
            </p>
          </div>
          <div className="home__row-actions">
            <Link to="/discover?tab=trending" className="btn btn--ghost">
              See all <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <MovieGrid movies={globalPopular?.slice(0, 12)} isLoading={globalLoading} skeletonCount={12} />
      </section>

      <section className="container home__section">
        <div className="home__row-head home__row-head--trending">
          <div>
            <span className="eyebrow">Where you watch</span>
            <h2 className="section-title">
              Popular in {watchRegionMeta.label} {watchRegionMeta.flag}
            </h2>
            <p className="text-muted home__region-hint">
              Based on the country on your account. Change it on <Link to="/discover">Discover</Link>.
            </p>
          </div>
          <div className="home__row-actions">
            <Link to="/discover?tab=local" className="btn btn--ghost">
              See all <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <MovieGrid movies={regionalPopular?.slice(0, 12)} isLoading={regionalLoading} skeletonCount={12} />
      </section>

      <section className="container home__section">
        <motion.div className="cta-banner" {...fadeInView()}>
          <div>
            <h2 className="cta-banner__title">Can't decide? Let us choose.</h2>
            <p className="cta-banner__text">Four questions. One perfect match. Zero endless scrolling.</p>
          </div>
          <Link to="/find" className="btn btn--primary btn--lg">
            Start matching <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
