import { Globe } from "lucide-react";
import { REGIONS } from "../../constants/regions";
import "./RegionPicker.css";

export default function RegionPicker({ value, onChange, id = "watch-region", compact = false }) {
  return (
    <label className={`region-picker${compact ? " region-picker--compact" : ""}`} htmlFor={id}>
      <Globe size={compact ? 16 : 18} aria-hidden="true" />
      <span className="region-picker__label">{compact ? "Country" : "Your country"}</span>
      <select id={id} className="region-picker__select" value={value} onChange={(e) => onChange(e.target.value)}>
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>
            {r.flag} {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
