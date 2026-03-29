import React, { useState, useCallback } from 'react';
import styles from './styles.module.css';

interface SlashCommandProps {
  name: string;
  description: string;
  children: React.ReactNode;
  admin?: boolean;
}

export default function SlashCommand({
  name,
  description,
  children,
  admin,
}: SlashCommandProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`/${name}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [name]);

  return (
    <div className={`${styles.card} ${admin ? styles.admin : ''}`}>
      <div className={styles.header}>
        <div className={styles.nameRow}>
          <span className={styles.slash}>/</span>
          <span className={styles.name}>{name}</span>
          {admin && <span className={styles.badge}>ADMIN</span>}
        </div>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          title={`Copy /${name}`}
          aria-label={`Copy /${name} to clipboard`}
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                <rect x="9" y="9" width="13" height="13" />
                <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <p className={styles.description}>{description}</p>
      <div className={styles.details}>{children}</div>
    </div>
  );
}
