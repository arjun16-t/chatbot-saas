/**
 * Textarea for the widget's default greeting message, with a
 * live character counter matching the maxLength.
 *
 * Props:
 *   value: string
 *   onChange: (value: string) => void
 *   maxLength: number
 */
export default function GreetingTextarea({ value, onChange, maxLength }) {
  return (
    <div className="greeting-textarea-wrapper">
      <textarea
        className="greeting-textarea"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
      <div className="greeting-char-count">
        {value.length} / {maxLength}
      </div>
    </div>
  );
}