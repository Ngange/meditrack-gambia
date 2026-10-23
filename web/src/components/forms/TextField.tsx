import type { InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function TextField({ label, ...input }: TextFieldProps) {
  return (
    <label className="a-field">
      <span>{label}</span>
      <input {...input} />
    </label>
  );
}
