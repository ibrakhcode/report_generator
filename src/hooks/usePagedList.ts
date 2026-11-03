import { useEffect, useMemo, useState } from 'react';

export const LIST_PAGE_SIZE = 15;

export function usePagedList<T>(items: T[], resetKey?: string | number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / LIST_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [resetKey, items.length]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * LIST_PAGE_SIZE;
    return items.slice(start, start + LIST_PAGE_SIZE);
  }, [items, page]);

  return {
    page,
    setPage,
    pageCount,
    pageItems,
    total: items.length,
    pageSize: LIST_PAGE_SIZE
  };
}
