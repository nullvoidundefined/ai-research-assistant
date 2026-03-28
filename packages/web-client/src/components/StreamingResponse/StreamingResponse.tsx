'use client';

import CitationBadge from '@/components/CitationBadge/CitationBadge';
import type { CitationInfo } from '@/types';

import styles from './StreamingResponse.module.scss';

interface StreamingResponseProps {
  text: string;
  citations: CitationInfo[];
  isStreaming: boolean;
}

export default function StreamingResponse({
  text,
  citations,
  isStreaming,
}: StreamingResponseProps) {
  if (!text) return null;

  // Replace [N] markers with citation badges when citations are available
  const hasCitations = citations.length > 0;

  const renderText = () => {
    if (!hasCitations) {
      return (
        <span className={styles.text}>
          {text}
          {isStreaming && <span className={styles.cursor} />}
        </span>
      );
    }

    const citationMap = new Map(citations.map((c) => [c.index, c]));
    const parts = text.split(/(\[\d+\])/);

    return (
      <span className={styles.text}>
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            const citation = citationMap.get(idx);
            if (citation) {
              return <CitationBadge key={i} citation={citation} />;
            }
          }
          return <span key={i}>{part}</span>;
        })}
        {isStreaming && <span className={styles.cursor} />}
      </span>
    );
  };

  return <div className={styles.container}>{renderText()}</div>;
}
