'use client';

import { useState } from 'react';

import { apiFetch } from '@/lib/api';
import type { Collection } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import styles from './collections.module.scss';

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => apiFetch<{ collections: Collection[] }>('/collections'),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch('/collections', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setNewName('');
      setCreating(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['collections'] }),
  });

  const collections = data?.collections ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Collections</h1>
        <button className={styles.createBtn} onClick={() => setCreating(true)}>
          New Collection
        </button>
      </div>

      {creating && (
        <form
          className={styles.createForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) createMutation.mutate(newName.trim());
          }}
        >
          <input
            type='text'
            placeholder='Collection name'
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button type='submit' disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
          <button type='button' onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      )}

      {isLoading ? (
        <p className={styles.loading}>Loading...</p>
      ) : collections.length === 0 ? (
        <p className={styles.empty}>
          No collections yet. Create one to organize your sources.
        </p>
      ) : (
        <ul className={styles.list}>
          {collections.map((col) => (
            <li key={col.id} className={styles.item}>
              <Link href={`/collections/${col.id}`} className={styles.itemLink}>
                <strong>{col.name}</strong>
                {col.description && <span>{col.description}</span>}
                {col.is_public && (
                  <span className={styles.publicBadge}>Public</span>
                )}
              </Link>
              <button
                className={styles.deleteBtn}
                onClick={() => deleteMutation.mutate(col.id)}
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
