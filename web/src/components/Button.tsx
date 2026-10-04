import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

type Variant = 'primary' | 'secondary' | 'destructive';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export function Button({ variant = 'primary', loading = false, disabled, children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : children}
    </button>
  );
}