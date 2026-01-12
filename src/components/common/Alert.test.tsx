import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Alert } from './Alert';

describe('Alert', () => {
  it('should render children content', () => {
    render(<Alert>This is an alert message</Alert>);
    expect(screen.getByText('This is an alert message')).toBeInTheDocument();
  });

  it('should have role="alert"', () => {
    render(<Alert>Alert content</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(<Alert title="Warning">Alert content</Alert>);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('should apply info variant classes by default', () => {
    render(<Alert>Info alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-50');
  });

  it('should apply success variant classes', () => {
    render(<Alert variant="success">Success alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-50');
  });

  it('should apply warning variant classes', () => {
    render(<Alert variant="warning">Warning alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-50');
  });

  it('should apply error variant classes', () => {
    render(<Alert variant="error">Error alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50');
  });

  it('should render close button when onClose is provided', () => {
    render(<Alert onClose={() => {}}>Alert with close</Alert>);
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('should not render close button when onClose is not provided', () => {
    render(<Alert>Alert without close</Alert>);
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const { user } = render(<Alert onClose={handleClose}>Closable alert</Alert>);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    render(<Alert className="custom-class">Alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });

  it('should render info icon for info variant', () => {
    render(<Alert variant="info">Info</Alert>);
    expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
  });

  it('should render success icon for success variant', () => {
    render(<Alert variant="success">Success</Alert>);
    expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
  });

  it('should render warning icon for warning variant', () => {
    render(<Alert variant="warning">Warning</Alert>);
    expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
  });

  it('should render error icon for error variant', () => {
    render(<Alert variant="error">Error</Alert>);
    expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
  });
});
