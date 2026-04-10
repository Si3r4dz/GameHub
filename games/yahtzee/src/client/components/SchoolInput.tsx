import { useState, useRef, useEffect } from 'react';

interface SchoolInputProps {
  value: string;
  readOnly?: boolean;
  placeholder?: string;
  flash?: boolean;
  filledColor?: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function SchoolInput({
  value,
  readOnly,
  placeholder,
  flash,
  filledColor,
  onChange,
  onFocus,
  onBlur,
}: SchoolInputProps) {
  const [localVal, setLocalVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current !== document.activeElement) {
      setLocalVal(value);
    }
  }, [value]);

  // Sign button shows current sign state
  const signLabel = localVal.toString().startsWith('-') ? '−' : '+';

  const toggleSign = () => {
    if (readOnly) return;
    const raw = localVal.trim();
    if (raw.toLowerCase() === 'x') return;
    if (raw === '') return;
    let newVal: string;
    if (raw.startsWith('-')) {
      newVal = '+' + raw.slice(1);
    } else if (raw.startsWith('+')) {
      newVal = '-' + raw.slice(1);
    } else {
      newVal = '-' + raw;
    }
    setLocalVal(newVal);
    onChange(newVal);
  };

  const setX = () => {
    if (readOnly) return;
    const newVal = localVal === 'x' ? '' : 'x';
    setLocalVal(newVal);
    onChange(newVal);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow: digits, +, -, x (case insensitive)
    const filtered = raw.replace(/[^0-9+\-xX]/g, '');
    setLocalVal(filtered);
    onChange(filtered);
  };

  return (
    <div className="school-input">
      <button
        type="button"
        className="sign-btn"
        onClick={toggleSign}
        disabled={readOnly}
        tabIndex={-1}
      >
        {signLabel}
      </button>
      <input
        ref={inputRef}
        className={`cell${flash ? ' flash' : ''}${filledColor ? ' filled' : ''}`}
        type="text"
        inputMode="numeric"
        value={localVal}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder ?? '—'}
        style={filledColor ? { background: filledColor + '20', borderColor: filledColor + '60' } : undefined}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="check-btn"
        onClick={setX}
        disabled={readOnly}
        tabIndex={-1}
      >
        ✓
      </button>
    </div>
  );
}
