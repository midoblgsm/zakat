import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Input } from './Input';

describe('Input', () => {
  it('should render an input element', () => {
    render(<Input name="test" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render with label', () => {
    render(<Input name="email" label="Email Address" />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('should show required indicator when required', () => {
    render(<Input name="email" label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<Input name="email" error="Email is required" />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('should display hint text', () => {
    render(<Input name="email" hint="We will never share your email" />);
    expect(screen.getByText('We will never share your email')).toBeInTheDocument();
  });

  it('should not display hint when there is an error', () => {
    render(
      <Input
        name="email"
        error="Email is required"
        hint="We will never share your email"
      />
    );
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.queryByText('We will never share your email')).not.toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const handleChange = vi.fn();
    const { user } = render(<Input name="test" onChange={handleChange} />);

    await user.type(screen.getByRole('textbox'), 'hello');
    expect(handleChange).toHaveBeenCalled();
  });

  it('should have aria-invalid when error is present', () => {
    render(<Input name="email" error="Invalid email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should have aria-invalid false when no error', () => {
    render(<Input name="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('should use name as id when id is not provided', () => {
    render(<Input name="email" label="Email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'email');
  });

  it('should use provided id over name', () => {
    render(<Input id="custom-id" name="email" label="Email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('should apply error styles when error is present', () => {
    render(<Input name="email" error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  it('should forward additional props', () => {
    render(
      <Input
        name="email"
        placeholder="Enter email"
        type="email"
        autoComplete="email"
      />
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autoComplete', 'email');
  });
});
