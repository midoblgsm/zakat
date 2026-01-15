import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('should render with default text and href', () => {
    render(<SkipLink />);

    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('should render with custom text', () => {
    render(<SkipLink>Skip to navigation</SkipLink>);

    expect(screen.getByRole('link', { name: 'Skip to navigation' })).toBeInTheDocument();
  });

  it('should render with custom href', () => {
    render(<SkipLink href="#sidebar">Skip to sidebar</SkipLink>);

    const link = screen.getByRole('link', { name: 'Skip to sidebar' });
    expect(link).toHaveAttribute('href', '#sidebar');
  });

  it('should be visually hidden by default', () => {
    render(<SkipLink />);

    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toHaveClass('sr-only');
  });

  it('should apply custom className', () => {
    render(<SkipLink className="custom-class" />);

    const link = screen.getByRole('link', { name: 'Skip to main content' });
    expect(link).toHaveClass('custom-class');
  });
});
