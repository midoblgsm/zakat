import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  caption?: string;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

/**
 * Accessible data table component (WCAG 2.1 Level AA)
 * Supports sorting, proper headers, and screen reader announcements
 */
export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  caption,
  sortConfig,
  onSort,
  emptyMessage = 'No data available',
  loading = false,
  className,
  striped = true,
  hoverable = true,
}: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, column: Column<T>) => {
    if ((event.key === 'Enter' || event.key === ' ') && column.sortable && onSort) {
      event.preventDefault();
      onSort(column.key);
    }
  };

  const getSortAriaLabel = (column: Column<T>) => {
    if (!column.sortable) return column.header;

    const currentSort = sortConfig?.key === column.key ? sortConfig.direction : null;

    if (currentSort === 'asc') {
      return `${column.header}, sorted ascending, click to sort descending`;
    } else if (currentSort === 'desc') {
      return `${column.header}, sorted descending, click to remove sort`;
    }
    return `${column.header}, click to sort ascending`;
  };

  return (
    <div className={clsx('overflow-x-auto', className)} role="region" aria-label={caption || 'Data table'}>
      <table className="min-w-full divide-y divide-gray-200">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                  column.sortable && 'cursor-pointer hover:bg-gray-100 select-none',
                  column.headerClassName
                )}
                style={column.width ? { width: column.width } : undefined}
                onClick={() => handleSort(column)}
                onKeyDown={(e) => handleKeyDown(e, column)}
                tabIndex={column.sortable ? 0 : undefined}
                aria-sort={
                  sortConfig?.key === column.key
                    ? sortConfig.direction === 'asc'
                      ? 'ascending'
                      : sortConfig.direction === 'desc'
                      ? 'descending'
                      : 'none'
                    : undefined
                }
                aria-label={getSortAriaLabel(column)}
                role={column.sortable ? 'columnheader button' : 'columnheader'}
              >
                <div className="flex items-center gap-1">
                  <span>{column.header}</span>
                  {column.sortable && (
                    <span className="inline-flex flex-col" aria-hidden="true">
                      <svg
                        className={clsx(
                          'h-3 w-3 -mb-1',
                          sortConfig?.key === column.key && sortConfig.direction === 'asc'
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        )}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <svg
                        className={clsx(
                          'h-3 w-3 -mt-1',
                          sortConfig?.key === column.key && sortConfig.direction === 'desc'
                            ? 'text-primary-600'
                            : 'text-gray-400'
                        )}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
                    role="status"
                    aria-label="Loading"
                  />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={clsx(
                  striped && index % 2 === 1 && 'bg-gray-50',
                  hoverable && 'hover:bg-gray-100 transition-colors'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      'px-6 py-4 text-sm text-gray-900 whitespace-nowrap',
                      column.cellClassName
                    )}
                  >
                    {column.render
                      ? column.render(item, index)
                      : (item as Record<string, unknown>)[column.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Table pagination component with accessibility support
 */
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className,
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <nav
      className={clsx('flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200', className)}
      aria-label="Table pagination"
    >
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={clsx(
            'relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            currentPage === 1
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
          )}
          aria-label="Go to previous page"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={clsx(
            'relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            currentPage === totalPages
              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
          )}
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
