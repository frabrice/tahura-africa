import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Tahura Africa`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
