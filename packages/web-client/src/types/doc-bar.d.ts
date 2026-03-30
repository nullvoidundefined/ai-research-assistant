declare module '@bottomlessmargaritas/doc-bar' {
  import { ComponentType } from 'react';

  interface DocBarProps {
    appName?: string;
    position?: 'bottom' | 'top';
    fixed?: boolean;
    theme?: 'dark' | 'light';
  }

  const AppDocBar: ComponentType<DocBarProps>;
  export default AppDocBar;
}

declare module '@bottomlessmargaritas/doc-bar/styles.css' {}
