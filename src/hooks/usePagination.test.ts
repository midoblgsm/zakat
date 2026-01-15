import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  const createTestData = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('should initialize with default values', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.totalItems).toBe(25);
  });

  it('should initialize with custom options', () => {
    const data = createTestData(100);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 2, initialPageSize: 20 })
    );

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(5);
  });

  it('should return correct paginated data', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data, { initialPageSize: 10 }));

    expect(result.current.paginatedData).toHaveLength(10);
    expect(result.current.paginatedData[0].id).toBe(1);
    expect(result.current.paginatedData[9].id).toBe(10);
  });

  it('should navigate to next page', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedData[0].id).toBe(11);
  });

  it('should navigate to previous page', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data, { initialPage: 2 }));

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should not go below page 1', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data));

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should not go above total pages', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data, { initialPage: 3 }));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should go to specific page', () => {
    const data = createTestData(50);
    const { result } = renderHook(() => usePagination(data));

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);
  });

  it('should clamp page number to valid range', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data));

    act(() => {
      result.current.goToPage(100);
    });
    expect(result.current.currentPage).toBe(3);

    act(() => {
      result.current.goToPage(-5);
    });
    expect(result.current.currentPage).toBe(1);
  });

  it('should change page size and reset to page 1', () => {
    const data = createTestData(50);
    const { result } = renderHook(() => usePagination(data, { initialPage: 3 }));

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.pageSize).toBe(25);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(2);
  });

  it('should calculate correct indices', () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data));

    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(10);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.startIndex).toBe(10);
    expect(result.current.endIndex).toBe(20);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.startIndex).toBe(20);
    expect(result.current.endIndex).toBe(25);
  });

  it('should generate page numbers array', () => {
    const data = createTestData(100);
    const { result } = renderHook(() => usePagination(data));

    const pages = result.current.getPageNumbers();
    expect(pages).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle empty data', () => {
    const { result } = renderHook(() => usePagination([]));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.paginatedData).toHaveLength(0);
  });

  it('should handle data smaller than page size', () => {
    const data = createTestData(5);
    const { result } = renderHook(() => usePagination(data));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedData).toHaveLength(5);
    expect(result.current.hasNextPage).toBe(false);
  });
});
