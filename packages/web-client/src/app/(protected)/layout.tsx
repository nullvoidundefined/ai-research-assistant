'use client';

import { useEffect } from 'react';

import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from './layout.module.scss';

function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () =>
      apiFetch<{ user: { id: string; email: string; name: string | null } }>(
        '/auth/me',
      ),
    retry: false,
  });
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && isError) {
      router.push('/login');
    }
  }, [isLoading, isError, router]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <Link href='/dashboard'>Research Assistant</Link>
        </div>
        <div className={styles.navLinks}>
          <Link href='/dashboard'>Dashboard</Link>
          <Link href='/sources'>Sources</Link>
          <Link href='/collections'>Collections</Link>
          <Link href='/chat'>Chat</Link>
          <Link href='/documents/summary'>Summary</Link>
          <Link href='/documents/technical-overview'>Technical Overview</Link>
        </div>
        <div className={styles.navUser}>
          <span>{data.user.name ?? data.user.email}</span>
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
