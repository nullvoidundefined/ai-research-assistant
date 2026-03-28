import type { Source } from '@/types';

import styles from './share.module.scss';

interface PublicCollectionData {
  collection: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
  };
  sources: Source[];
}

async function fetchPublicCollection(
  token: string,
): Promise<PublicCollectionData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${apiUrl}/collections/public/${token}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const data = await fetchPublicCollection(token);

  if (!data) {
    return (
      <div className={styles.container}>
        <h1>Collection not found</h1>
        <p>This collection may not be public or may have been deleted.</p>
      </div>
    );
  }

  const { collection, sources } = data;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{collection.name}</h1>
        {collection.description && (
          <p className={styles.desc}>{collection.description}</p>
        )}
      </header>

      <section className={styles.sources}>
        <h2>
          {sources.length} Source{sources.length !== 1 ? 's' : ''}
        </h2>
        {sources.length === 0 ? (
          <p>No sources in this collection.</p>
        ) : (
          <ul className={styles.sourceList}>
            {sources.map((source) => (
              <li key={source.id} className={styles.sourceItem}>
                <span className={styles.typeTag}>
                  {source.type.toUpperCase()}
                </span>
                <div>
                  <p className={styles.sourceTitle}>
                    {source.url ? (
                      <a
                        href={source.url}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {source.title ?? source.url}
                      </a>
                    ) : (
                      (source.title ?? source.filename ?? 'Untitled')
                    )}
                  </p>
                  {source.summary && (
                    <p className={styles.sourceSummary}>
                      {source.summary.slice(0, 200)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
