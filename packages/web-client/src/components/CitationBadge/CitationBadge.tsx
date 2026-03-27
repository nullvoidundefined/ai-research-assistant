'use client';

import { useState } from 'react';
import type { CitationInfo } from '@/types';
import styles from './CitationBadge.module.scss';

interface CitationBadgeProps {
    citation: CitationInfo;
}

export default function CitationBadge({ citation }: CitationBadgeProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <span className={styles.wrapper}>
            <button
                className={styles.badge}
                onClick={() => setExpanded((prev) => !prev)}
                title={citation.sourceTitle ?? undefined}
                aria-expanded={expanded}
            >
                [{citation.index}]
            </button>
            {expanded && (
                <span className={styles.popover}>
                    <span className={styles.popoverContent}>{citation.content.slice(0, 300)}{citation.content.length > 300 ? '...' : ''}</span>
                    {citation.sourceTitle && (
                        <span className={styles.popoverSource}>
                            {citation.sourceUrl ? (
                                <a href={citation.sourceUrl} target="_blank" rel="noopener noreferrer">
                                    {citation.sourceTitle}
                                </a>
                            ) : (
                                citation.sourceTitle
                            )}
                        </span>
                    )}
                </span>
            )}
        </span>
    );
}
