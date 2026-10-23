import type { SelectHTMLAttributes } from 'react';
import { capitalize } from '../../utils/text';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly string[];
  /** Text of an empty first choice (value ""). Leave out when a value is always required. */
  placeholder?: string;
  /** Show the option text exactly as given instead of capitalising it (blood groups, ...). */
  raw?: boolean;
};

export function SelectField({ label, options, placeholder, raw, ...select }: SelectFieldProps) {
  return (
    <label className="a-field">
      <span>{label}</span>
      <select {...select}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {raw ? o : capitalize(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
