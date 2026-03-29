import React, { useState, useCallback } from 'react';
import styles from './styles.module.css';

interface CmdProps {
  children: string;
}

export default function Cmd({ children }: CmdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [children]);

  return (
    <code
      className={`${styles.cmd} ${copied ? styles.copied : ''}`}
      onClick={handleCopy}
      title={`Copy ${children}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCopy(); }}
    >
      {children}
      <span className={styles.icon}>
        {copied ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <rect x="9" y="9" width="13" height="13" />
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
          </svg>
        )}
      </span>
    </code>
  );
}
