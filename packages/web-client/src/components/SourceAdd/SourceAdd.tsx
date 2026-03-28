'use client';

import { useState } from 'react';

import { API_URL } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import styles from './SourceAdd.module.scss';

type TabType = 'url' | 'pdf' | 'note';

export default function SourceAdd() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: async () => {
      if (activeTab === 'pdf') {
        const formData = new FormData();
        formData.append('type', 'pdf');
        formData.append('file', file!);
        const res = await fetch(`${API_URL}/sources`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          body: formData,
        });
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error ?? 'Upload failed');
        }
        return res.json();
      }

      const res = await fetch(`${API_URL}/sources`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          type: activeTab,
          url: activeTab === 'url' ? url : undefined,
          content: activeTab === 'note' ? content : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: 'Failed to add source' }));
        throw new Error(err.error ?? 'Failed to add source');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      router.push('/sources');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (activeTab === 'url' && !url) {
      setError('URL is required');
      return;
    }
    if (activeTab === 'pdf' && !file) {
      setError('Please select a PDF file');
      return;
    }
    if (activeTab === 'note' && !content) {
      setError('Note content is required');
      return;
    }
    addMutation.mutate();
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {(['url', 'pdf', 'note'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setError('');
            }}
            type='button'
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        {activeTab === 'url' && (
          <div className={styles.field}>
            <label htmlFor='url'>Article or web page URL</label>
            <input
              id='url'
              type='url'
              placeholder='https://...'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        )}

        {activeTab === 'pdf' && (
          <div className={styles.field}>
            <label htmlFor='pdf'>PDF File (max 50MB)</label>
            <input
              id='pdf'
              type='file'
              accept='.pdf'
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {activeTab === 'note' && (
          <div className={styles.field}>
            <label htmlFor='note'>Note content</label>
            <textarea
              id='note'
              placeholder='Write or paste your note here...'
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
          </div>
        )}

        <button
          type='submit'
          className={styles.submitBtn}
          disabled={addMutation.isPending}
        >
          {addMutation.isPending ? 'Adding...' : 'Add Source'}
        </button>
      </form>
    </div>
  );
}
