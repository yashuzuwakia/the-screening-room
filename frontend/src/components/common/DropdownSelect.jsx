import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import "./DropdownSelect.css";

export default function DropdownSelect({
  id,
  label,
  value,
  onChange,
  options,
  className = "",
  menuAlign = "start",
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected =
    options.find(
      (o) =>
        o.value === value ||
        (value != null && String(o.value).toUpperCase() === String(value).toUpperCase()),
    ) ?? options[0];
  const SelectedIcon = selected?.Icon;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const compactLabel =
    compact && label ? `${label}: ${selected?.label ?? ""}` : undefined;

  return (
    <div
      className={`dropdown-select${compact ? " dropdown-select--compact" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      {label && !compact ? (
        <span className="dropdown-select__heading" id={id ? `${id}-label` : undefined}>
          {label}
        </span>
      ) : null}

      <button
        type="button"
        id={id}
        className="dropdown-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={compactLabel}
        aria-labelledby={!compact && label && id ? `${id}-label` : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span className="dropdown-select__value">
          {selected?.flag ? <span className="dropdown-select__flag">{selected.flag}</span> : null}
          {SelectedIcon ? <SelectedIcon size={16} className="dropdown-select__value-icon" aria-hidden /> : null}
          <span className="dropdown-select__value-text">{selected?.label}</span>
        </span>
        <ChevronDown size={16} className={`dropdown-select__chev${open ? " is-open" : ""}`} aria-hidden />
      </button>

      {open ? (
        <ul
          className={`dropdown-select__menu dropdown-select__menu--${menuAlign}`}
          role="listbox"
          id={listId}
          aria-labelledby={id}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const OptionIcon = opt.Icon;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`dropdown-select__option${isSelected ? " is-selected" : ""}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="dropdown-select__option-leading">
                    {opt.flag ? <span className="dropdown-select__flag">{opt.flag}</span> : null}
                    {OptionIcon ? <OptionIcon size={16} aria-hidden /> : null}
                  </span>
                  <span className="dropdown-select__option-body">
                    <span className="dropdown-select__option-label">{opt.label}</span>
                    {opt.hint ? <span className="dropdown-select__option-hint">{opt.hint}</span> : null}
                  </span>
                  {isSelected ? <Check size={16} className="dropdown-select__check" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
