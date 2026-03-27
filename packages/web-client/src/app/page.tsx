import Link from 'next/link';
import styles from './page.module.scss';

export default function LandingPage() {
    return (
        <main className={styles.main}>
            <div className={styles.hero}>
                <h1 className={styles.title}>AI Research Assistant</h1>
                <p className={styles.subtitle}>
                    Save articles, papers, and notes. Chat with your knowledge base using AI-powered search and citations.
                </p>
                <div className={styles.actions}>
                    <Link href="/register" className={styles.primaryBtn}>Get Started</Link>
                    <Link href="/login" className={styles.secondaryBtn}>Sign In</Link>
                </div>
            </div>
        </main>
    );
}
