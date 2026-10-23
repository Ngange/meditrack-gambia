import type { ReactNode } from 'react';

type PillProps = { tone?: 'red' | 'green' | 'blue' | 'warn'; children: ReactNode };

// A small rounded label such as a status or a count.
export function Pill({ tone, children }: PillProps) {
  return <span className={`a-pill${tone ? ` a-pill-${tone}` : ''}`}>{children}</span>;
}
