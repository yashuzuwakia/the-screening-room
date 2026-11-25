import { motion } from "framer-motion";
import "./common.css";

export default function ScoreBar({ label, value, delay = 0 }) {
  const tone = value >= 90 ? "high" : value >= 70 ? "mid" : "low";

  return (
    <div className={`score-bar score-bar--${tone}`}>
      <div className="score-bar__row">
        <span className="score-bar__label">{label}</span>
        <span className="score-bar__value">{value}%</span>
      </div>
      <div
        className="score-bar__track"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="score-bar__fill"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay, duration: 1.05, ease: [0.33, 1, 0.45, 1] }}
        />
      </div>
    </div>
  );
}
