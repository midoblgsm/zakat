import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  getPageNumbers: () => number[];
}

/**
 * Provides client-side pagination for arrays of data.
 * Memoizes computed values for performance.
 *
 * @param data - The full array of data to paginate
 * @param options - Pagination options
 * @returns Pagination state and controls
 */
export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPage = 1, initialPageSize = 10 } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  // Calculate total pages
  const totalItems = data.length;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  // Ensure current page is within bounds
  const validatedPage = useMemo(
    () => Math.min(Math.max(1, currentPage), totalPages),
    [currentPage, totalPages]
  );

  // Calculate indices
  const startIndex = useMemo(
    () => (validatedPage - 1) * pageSize,
    [validatedPage, pageSize]
  );
  const endIndex = useMemo(
    () => Math.min(startIndex + pageSize, totalItems),
    [startIndex, pageSize, totalItems]
  );

  // Slice data for current page
  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  // Navigation helpers
  const hasNextPage = validatedPage < totalPages;
  const hasPreviousPage = validatedPage > 1;

  const goToPage = useCallback(
    (page: number) => {
      const newPage = Math.min(Math.max(1, page), totalPages);
      setCurrentPage(newPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(Math.max(1, size));
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Generate array of page numbers for pagination UI
  const getPageNumbers = useCallback(() => {
    const maxVisible = 5;
    const pages: number[] = [];

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show a window of pages around current page
      let start = Math.max(1, validatedPage - Math.floor(maxVisible / 2));
      const end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  }, [totalPages, validatedPage]);

  return {
    currentPage: validatedPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    getPageNumbers,
  };
}
