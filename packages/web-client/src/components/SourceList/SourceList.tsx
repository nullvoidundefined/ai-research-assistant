'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Source } from '@/types';
import styles from './SourceList.module.scss';

function getTypeIcon(type: string) {
    switch (type) {
        case 'url': return 'URL';
        case 'pdf': return 'PDF';
        case 'note': return 'NOTE';
        default: return type.toUpperCase();
    }
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={styles.statusBadge}
            data-status={status}
        >
            {status}
        </span>
    );
}

const processingStatuses = new Set(['pending', 'fetching', 'chunking', 'embedding']);

export default function SourceList() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['sources'],
        queryFn: () => apiFetch<{ sources: Source[] }>('/sources'),
        refetchInterval: (query) => {
            const sources = query.state.data?.sources ?? [];
            return sources.some((s) => processingStatuses.has(s.status)) ? 3000 : false;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiFetch(`/sources/${id}`, { method: 'DELETE' }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
    });

    if (isLoading) return <p className={styles.loading}>Loading sources...</p>;

    const sources = data?.sources ?? [];

    if (sources.length === 0) {
        return <p className={styles.empty}>No sources yet. Add your first source to get started.</p>;
    }

    return (
        <ul className={styles.list}>
            {sources.map((source) => (
                <li key={source.id} className={styles.item}>
                    <span className={styles.typeIcon}>{getTypeIcon(source.type)}</span>
                    <div className={styles.info}>
                        <p className={styles.title}>
                            {source.title ?? source.url ?? source.filename ?? 'Untitled'}
                        </p>
                        {source.url && (
                            <p className={styles.url}>{source.url}</p>
                        )}
                        {source.summary && (
                            <p className={styles.summary}>{source.summary.slice(0, 120)}...</p>
                        )}
                    </div>
                    <StatusBadge status={source.status} />
                    <button
                        className={styles.deleteBtn}
                        onClick={() => deleteMutation.mutate(source.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete source"
                    >
                        &times;
                    </button>
                </li>
            ))}
        </ul>
    );
}
