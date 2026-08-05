import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

const COLOR_FIELDS = [
  { key: 'primary_color', label: 'Primary Color (Brand)' },
  { key: 'secondary_color', label: 'Secondary Color (Accent)' },
  { key: 'background_color', label: 'Background Color' },
  { key: 'text_color', label: 'Text Color' },
  { key: 'bot_bubble_color', label: 'Bot Bubble Color' },
  { key: 'user_bubble_color', label: 'User Bubble Color' },
  { key: 'user_text_color', label: 'User Text Color' },
];

function ColorField({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleHexInput(e) {
    const val = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  }

  return (
    <div className="color-field" ref={wrapperRef}>
      <label className="color-field-label">{label}</label>
      <div className="color-field-control">
        <button
          type="button"
          className="color-field-swatch"
          style={{ background: value }}
          onClick={() => setIsOpen((o) => !o)}
          aria-label={`Pick ${label}`}
        />
        <input
          type="text"
          className="color-field-hex-input"
          defaultValue={value}
          key={value}
          onBlur={handleHexInput}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
      </div>
      {isOpen && (
        <div className="color-field-popover">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/**
 * Renders all 7 theme_color fields as ColorField pickers.
 *
 * Props:
 *   themeColor: current draft theme_color object
 *   onChange: (key, value) => void
 */
export default function ColorsStyleSection({ themeColor, onChange }) {
  return (
    <div className="config-section">
      <div className="config-section-title">
        <span className="config-step-badge">2</span>
        <span>Color Styles</span>
      </div>
      <div className="colors-style-list">
        {COLOR_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            value={themeColor[field.key]}
            onChange={(val) => onChange(field.key, val)}
          />
        ))}
      </div>
    </div>
  );
}