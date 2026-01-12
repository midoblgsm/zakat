import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when loading prop is true', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show loading spinner when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('should apply primary variant classes by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('should apply secondary variant classes', () => {
    render(<Button variant="secondary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-secondary-100');
  });

  it('should apply danger variant classes', () => {
    render(<Button variant="danger">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });

  it('should apply outline variant classes', () => {
    render(<Button variant="outline">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-gray-300');
  });

  it('should apply ghost variant classes', () => {
    render(<Button variant="ghost">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-gray-100');
  });

  it('should apply small size classes', () => {
    render(<Button size="sm">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-3');
  });

  it('should apply large size classes', () => {
    render(<Button size="lg">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6');
  });

  it('should apply fullWidth class when fullWidth is true', () => {
    render(<Button fullWidth>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('should forward additional props', () => {
    render(<Button type="submit" data-testid="test-button">Submit</Button>);
    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});
