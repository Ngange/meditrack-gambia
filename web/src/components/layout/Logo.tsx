import { useState } from 'react';

export function Logo() {
  const [failed, setFailed] = useState(false);
  // Put your logo at web/public/logo.png and it is used here; otherwise a plain shield mark shows.
  if (!failed) {
    return <img className="shell-logo-img" src="/logo.png" alt="" onError={() => setFailed(true)} />;
  }
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" strokeLinejoin="round" />
      <path d="M12 8v6M9 11h6" strokeLinecap="round" />
    </svg>
  );
}
