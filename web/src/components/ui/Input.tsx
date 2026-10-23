import { useState, type InputHTMLAttributes } from 'react';
import './Input.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, type, id, ...rest }: InputProps) {
  const [hidden, setHidden] = useState(true);
  const isPassword = type === 'password';
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="field">
      <label htmlFor={inputId} className="field-label">{label}</label>
      <div className={`field-box ${error ? 'field-error' : ''}`}>
        <input id={inputId} type={isPassword && !hidden ? 'text' : type} className="field-input" {...rest} />
        {isPassword && (
          <button type="button" className="field-toggle" onClick={() => setHidden((h) => !h)}>
            {hidden ? 'Show' : 'Hide'}
          </button>
        )}
      </div>
      {error && <p className="field-error-text">⚠ {error}</p>}
    </div>
  );
}