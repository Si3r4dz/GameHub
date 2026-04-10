import { useState, useRef, useEffect } from 'react';

interface FigureInputProps {
  value: string;
  readOnly?: boolean;
  placeholder?: string;
  flash?: boolean;
  filledColor?: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function FigureInput({
  value,
  readOnly,
  placeholder,
  flash,
  filledColor,
  onChange,
  onFocus,
  onBlur,
}: FigureInputProps) {
  const [localVal, setLocalVal] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current !== document.activeElement) {
      setLocalVal(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits
    const filtered = e.target.value.replace(/[^0-9]/g, '');
    setLocalVal(filtered);
    setInvalid(false);
    onChange(filtered);
  };

  return (
    <input
      ref={inputRef}
      className={`cell${invalid ? ' invalid' : ''}${flash ? ' flash' : ''}${filledColor ? ' filled' : ''}`}
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
  );
}
