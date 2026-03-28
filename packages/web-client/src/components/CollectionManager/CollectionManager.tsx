'use client';

import { useState } from 'react';

import { apiFetch } from '@/lib/api';
import type { Collection, Source } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import styles from './CollectionManager.module.scss';

interface CollectionDetailData {
  collection: Collection;
  sources: Source[];
}

interface CollectionManagerProps {
  collectionId: string;
}

export default function CollectionManager({
  collectionId,
}: CollectionManagerProps) {
  const queryClient = useQueryClient();
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () =>
      apiFetch<CollectionDetailData>(`/collections/${collectionId}`),
  });

  const { data: allSourcesData } = useQuery({
    queryKey: ['sources'],
    queryFn: () => apiFetch<{ sources: Source[] }>('/sources'),
  });

  const addSourceMutation = useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch(`/collections/${collectionId}/sources`, {
        method: 'POST',
        body: JSON.stringify({ sourceId }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] }),
  });

  const removeSourceMutation = useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch(`/collections/${collectionId}/sources/${sourceId}`, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] }),
  });

  const shareMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ collection: Collection; shareUrl: string }>(
        `/collections/${collectionId}/share`,
        {
          method: 'POST',
        },
      ),
    onSuccess: (result) => {
      setShareUrl(`${window.location.origin}/share${result.shareUrl}`);
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (!data) return <p>Collection not found.</p>;

  const { collection, sources } = data;
  const allSources = allSourcesData?.sources ?? [];
  const inCollectionIds = new Set(sources.map((s) => s.id));
  const addableSources = allSources.filter(
    (s) => !inCollectionIds.has(s.id) && s.status === 'ready',
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.name}>{collection.name}</h1>
          {collection.description && (
            <p className={styles.desc}>{collection.description}</p>
          )}
        </div>
        <button
          className={styles.shareBtn}
          onClick={() => shareMutation.mutate()}
          disabled={shareMutation.isPending}
        >
          {shareMutation.isPending
            ? 'Sharing...'
            : collection.is_public
              ? 'Reshare'
              : 'Share Publicly'}
        </button>
      </div>

      {(shareUrl ??
        (collection.share_token &&
          `${window.location.origin}/share/${collection.share_token}`)) && (
        <div className={styles.shareInfo}>
          <span>Public URL: </span>
          <a
            href={shareUrl ?? `/share/${collection.share_token}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            {shareUrl ??
              `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${collection.share_token}`}
          </a>
        </div>
      )}

      <div className={styles.section}>
        <h2>Sources in this Collection ({sources.length})</h2>
        {sources.length === 0 ? (
          <p className={styles.empty}>No sources yet. Add sources below.</p>
        ) : (
          <ul className={styles.sourceList}>
            {sources.map((source) => (
              <li key={source.id} className={styles.sourceItem}>
                <span className={styles.typeTag}>
                  {source.type.toUpperCase()}
                </span>
                <span className={styles.sourceTitle}>
                  {source.title ?? source.url ?? source.filename ?? 'Untitled'}
                </span>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeSourceMutation.mutate(source.id)}
                  disabled={removeSourceMutation.isPending}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {addableSources.length > 0 && (
        <div className={styles.section}>
          <h2>Add Sources</h2>
          <ul className={styles.sourceList}>
            {addableSources.map((source) => (
              <li key={source.id} className={styles.sourceItem}>
                <span className={styles.typeTag}>
                  {source.type.toUpperCase()}
                </span>
                <span className={styles.sourceTitle}>
                  {source.title ?? source.url ?? source.filename ?? 'Untitled'}
                </span>
                <button
                  className={styles.addBtn}
                  onClick={() => addSourceMutation.mutate(source.id)}
                  disabled={addSourceMutation.isPending}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
