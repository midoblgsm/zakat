import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column } from './DataTable';

interface TestItem {
  id: string;
  name: string;
  email: string;
  status: string;
}

const testData: TestItem[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'pending' },
  { id: '3', name: 'Bob Wilson', email: 'bob@example.com', status: 'inactive' },
];

const testColumns: Column<TestItem>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'status', header: 'Status', sortable: true },
];

describe('DataTable', () => {
  it('should render table with data', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
  });

  it('should show empty message when no data', () => {
    render(
      <DataTable
        data={[]}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        loading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('should call onSort when clicking sortable column', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();

    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        onSort={onSort}
      />
    );

    // Click on Name header (sortable)
    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    await user.click(nameHeader);

    expect(onSort).toHaveBeenCalledWith('name');
  });

  it('should not call onSort for non-sortable columns', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();

    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        onSort={onSort}
      />
    );

    // Click on Email header (not sortable)
    const emailHeader = screen.getByRole('columnheader', { name: /email/i });
    await user.click(emailHeader);

    expect(onSort).not.toHaveBeenCalled();
  });

  it('should show sort direction indicators', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        sortConfig={{ key: 'name', direction: 'asc' }}
      />
    );

    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('should render custom cell content with render function', () => {
    const columnsWithRender: Column<TestItem>[] = [
      { key: 'name', header: 'Name' },
      {
        key: 'status',
        header: 'Status',
        render: (item) => <span data-testid="status-badge">{item.status.toUpperCase()}</span>,
      },
    ];

    render(
      <DataTable
        data={testData}
        columns={columnsWithRender}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getAllByTestId('status-badge')).toHaveLength(3);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('should apply striped rows when enabled', () => {
    const { container } = render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        striped={true}
      />
    );

    const tbody = container.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');

    expect(rows?.[1]).toHaveClass('bg-gray-50');
  });

  it('should have accessible caption', () => {
    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        caption="User list"
      />
    );

    expect(screen.getByText('User list')).toBeInTheDocument();
    expect(screen.getByText('User list')).toHaveClass('sr-only');
  });

  it('should support keyboard navigation for sortable columns', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();

    render(
      <DataTable
        data={testData}
        columns={testColumns}
        keyExtractor={(item) => item.id}
        onSort={onSort}
      />
    );

    const nameHeader = screen.getByRole('columnheader', { name: /name/i });
    nameHeader.focus();

    await user.keyboard('{Enter}');

    expect(onSort).toHaveBeenCalledWith('name');
  });
});
