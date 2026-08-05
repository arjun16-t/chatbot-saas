import { ChevronDown } from 'lucide-react';

const OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
];

/**
 * Dropdown for selecting the widget's screen corner.
 *
 * Props:
 *   value: 'bottom-right' | 'bottom-left'
 *   onChange: (value: string) => void
 */
export default function BubblePositionSelect({ value, onChange }) {
  return (
    <div className="bubble-position-select">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="bubble-position-select-icon" />
    </div>
  );
}