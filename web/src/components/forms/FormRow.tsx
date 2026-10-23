import type { ReactNode } from 'react';

// Puts fields side by side on wide screens and stacks them on narrow ones.
export function FormRow({ children }: { children: ReactNode }) {
  return <div className="a-row">{children}</div>;
}
