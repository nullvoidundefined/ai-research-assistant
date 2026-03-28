'use client';

import { useState } from 'react';

import { apiFetch } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import styles from './register.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const registerMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
    }) => {
      return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      router.push('/dashboard');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    registerMutation.mutate({ name, email, password });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.field}>
            <label htmlFor='name'>Name</label>
            <input
              id='name'
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete='name'
            />
          </div>
          <div className={styles.field}>
            <label htmlFor='email'>Email</label>
            <input
              id='email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete='email'
            />
          </div>
          <div className={styles.field}>
            <label htmlFor='password'>Password</label>
            <input
              id='password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete='new-password'
            />
          </div>
          <button
            type='submit'
            className={styles.submitBtn}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending
              ? 'Creating account...'
              : 'Create Account'}
          </button>
        </form>
        <p className={styles.link}>
          Have an account? <Link href='/login'>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
