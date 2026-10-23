import { useCallback, useState } from 'react';

type StringKeys<V> = { [K in keyof V]: V[K] extends string ? K : never }[keyof V] & string;

/** Holds a form's values. `bind('name')` gives an Input its value and onChangeText. */
export function useFormState<V extends object>(initial: V) {
  const [values, setValues] = useState<V>(initial);

  const set = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);

  const bind = <K extends StringKeys<V>>(key: K) => ({
    value: values[key] as string,
    onChangeText: (text: string) => set(key, text as V[K]),
  });

  return { values, set, bind };
}
