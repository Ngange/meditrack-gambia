import { useState, type ChangeEvent } from 'react';

// Holds the text of every form field in one object. bind('name') gives a field its value and onChange.
export function useFormState<V extends Record<string, string>>(initial: V) {
  const [values, setValues] = useState<V>(initial);

  function bind<K extends keyof V>(key: K) {
    return {
      value: values[key],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const next = e.target.value;
        setValues((v) => ({ ...v, [key]: next }));
      },
    };
  }

  return { values, bind };
}
