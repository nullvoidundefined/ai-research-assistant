'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Tag } from '@/types';
import styles from './TagChips.module.scss';

interface TagChipsProps {
    sourceId: string;
    currentTagIds?: string[];
}

export default function TagChips({ sourceId, currentTagIds = [] }: TagChipsProps) {
    const queryClient = useQueryClient();
    const currentSet = new Set(currentTagIds);

    const { data } = useQuery({
        queryKey: ['tags'],
        queryFn: () => apiFetch<{ tags: Tag[] }>('/tags'),
    });

    const addTagMutation = useMutation({
        mutationFn: (tagId: string) =>
            apiFetch(`/sources/${sourceId}/tags`, {
                method: 'POST',
                body: JSON.stringify({ tagId }),
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
    });

    const removeTagMutation = useMutation({
        mutationFn: (tagId: string) =>
            apiFetch(`/sources/${sourceId}/tags/${tagId}`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
    });

    const tags = data?.tags ?? [];

    return (
        <div className={styles.container}>
            {tags.map((tag) => {
                const active = currentSet.has(tag.id);
                return (
                    <button
                        key={tag.id}
                        className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                        style={{ '--tag-color': tag.color } as React.CSSProperties}
                        onClick={() => {
                            if (active) removeTagMutation.mutate(tag.id);
                            else addTagMutation.mutate(tag.id);
                        }}
                    >
                        {tag.name}
                    </button>
                );
            })}
        </div>
    );
}
