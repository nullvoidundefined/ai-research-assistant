'use client';

import { useCallback, useState } from 'react';

import SourceFilters, {
  type SourceFilterValues,
} from '@/components/SourceFilters/SourceFilters';
import { apiFetch } from '@/lib/api';
import type { Source } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import styles from './sources.module.scss';

const processingStatuses = new Set([
  'pending',
  'fetching',
  'chunking',
  'embedding',
]);

function getTypeIcon(type: string) {
  switch (type) {
    case 'url':
      return 'URL';
    case 'pdf':
      return 'PDF';
    case 'note':
      return 'NOTE';
    default:
      return type.toUpperCase();
  }
}

export default function SourcesPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SourceFilterValues>({
    search: '',
    type: '',
    status: '',
    tagId: '',
  });

  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.set('search', filters.search);
  if (filters.type) queryParams.set('type', filters.type);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.tagId) queryParams.set('tag_id', filters.tagId);

  const { data, isLoading } = useQuery({
    queryKey: ['sources', filters],
    queryFn: () =>
      apiFetch<{ sources: Source[] }>(`/sources?${queryParams.toString()}`),
    refetchInterval: (query) => {
      const sources = query.state.data?.sources ?? [];
      return sources.some((s) => processingStatuses.has(s.status))
        ? 3000
        : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
  });

  const handleFiltersChange = useCallback((newFilters: SourceFilterValues) => {
    setFilters(newFilters);
  }, []);

  const sources = data?.sources ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Sources</h1>
        <Link href='/sources/add' className={styles.addBtn}>
          Add Source
        </Link>
      </div>

      <SourceFilters onChange={handleFiltersChange} />

      {isLoading ? (
        <p className={styles.loading}>Loading...</p>
      ) : sources.length === 0 ? (
        <p className={styles.empty}>No sources found.</p>
      ) : (
        <ul className={styles.list}>
          {sources.map((source) => (
            <li key={source.id} className={styles.item}>
              <span className={styles.typeIcon}>
                {getTypeIcon(source.type)}
              </span>
              <div className={styles.info}>
                <p className={styles.title}>
                  {source.title ?? source.url ?? source.filename ?? 'Untitled'}
                </p>
                {source.url && <p className={styles.url}>{source.url}</p>}
                {source.summary && (
                  <p className={styles.summary}>
                    {source.summary.slice(0, 150)}...
                  </p>
                )}
              </div>
              <span className={styles.statusBadge} data-status={source.status}>
                {source.status}
              </span>
              <button
                className={styles.deleteBtn}
                onClick={() => deleteMutation.mutate(source.id)}
                disabled={deleteMutation.isPending}
                aria-label='Delete source'
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
