'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import type { Tag } from '@/types';
import { useQuery } from '@tanstack/react-query';

import styles from './SourceFilters.module.scss';

export interface SourceFilterValues {
  search: string;
  type: string;
  status: string;
  tagId: string;
}

interface SourceFiltersProps {
  onChange: (filters: SourceFilterValues) => void;
}

export default function SourceFilters({ onChange }: SourceFiltersProps) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [tagId, setTagId] = useState('');

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<{ tags: Tag[] }>('/tags'),
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ search, type, status, tagId });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, type, status, tagId, onChange]);

  return (
    <div className={styles.container}>
      <input
        type='text'
        placeholder='Search sources...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.searchInput}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className={styles.select}
      >
        <option value=''>All Types</option>
        <option value='url'>URL</option>
        <option value='pdf'>PDF</option>
        <option value='note'>Note</option>
      </select>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className={styles.select}
      >
        <option value=''>All Statuses</option>
        <option value='pending'>Pending</option>
        <option value='ready'>Ready</option>
        <option value='failed'>Failed</option>
      </select>
      {(tagsData?.tags ?? []).length > 0 && (
        <select
          value={tagId}
          onChange={(e) => setTagId(e.target.value)}
          className={styles.select}
        >
          <option value=''>All Tags</option>
          {tagsData!.tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
