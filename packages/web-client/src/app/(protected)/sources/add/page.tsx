import SourceAdd from '@/components/SourceAdd/SourceAdd';

import styles from './add.module.scss';

export default function AddSourcePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Add Source</h1>
      <SourceAdd />
    </div>
  );
}
