'use client';

import { apiFetch } from '@/lib/api';
import type { Source } from '@/types';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import styles from './dashboard.module.scss';

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['sources'],
    queryFn: () => apiFetch<{ sources: Source[] }>('/sources'),
  });

  const sources = data?.sources ?? [];
  const readySources = sources.filter((s) => s.status === 'ready').length;
  const pendingSources = sources.filter((s) =>
    ['pending', 'fetching', 'chunking', 'embedding'].includes(s.status),
  ).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <Link href='/sources/add' className={styles.addBtn}>
          Add Source
        </Link>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sources.length}</span>
          <span className={styles.statLabel}>Total Sources</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{readySources}</span>
          <span className={styles.statLabel}>Ready</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{pendingSources}</span>
          <span className={styles.statLabel}>Processing</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Recent Sources</h2>
        {sources.length === 0 ? (
          <p className={styles.empty}>
            No sources yet.{' '}
            <Link href='/sources/add'>Add your first source</Link>
          </p>
        ) : (
          <ul className={styles.recentList}>
            {sources.slice(0, 5).map((source) => (
              <li key={source.id} className={styles.recentItem}>
                <span className={styles.sourceType}>
                  {source.type.toUpperCase()}
                </span>
                <span className={styles.sourceTitle}>
                  {source.title ?? source.url ?? source.filename ?? 'Untitled'}
                </span>
                <span
                  className={styles.statusDot}
                  data-status={source.status}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.section}>
        <h2>Quick Actions</h2>
        <div className={styles.actions}>
          <Link href='/sources/add' className={styles.actionCard}>
            <strong>Add Source</strong>
            <span>Save articles, PDFs, or notes</span>
          </Link>
          <Link href='/chat' className={styles.actionCard}>
            <strong>Chat</strong>
            <span>Ask questions about your knowledge base</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
