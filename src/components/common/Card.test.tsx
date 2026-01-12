import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Card, CardHeader, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('should render children content', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('should apply default padding (md)', () => {
    render(<Card>Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-6');
  });

  it('should apply no padding when padding is none', () => {
    render(<Card padding="none">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).not.toHaveClass('p-4');
    expect(card).not.toHaveClass('p-6');
    expect(card).not.toHaveClass('p-8');
  });

  it('should apply small padding', () => {
    render(<Card padding="sm">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-4');
  });

  it('should apply large padding', () => {
    render(<Card padding="lg">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-8');
  });

  it('should apply base styling classes', () => {
    render(<Card>Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('shadow-sm');
  });

  it('should apply custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('custom-class');
  });

  it('should forward additional HTML attributes', () => {
    render(<Card data-testid="test-card">Content</Card>);
    expect(screen.getByTestId('test-card')).toBeInTheDocument();
  });
});

describe('CardHeader', () => {
  it('should render title', () => {
    render(<CardHeader title="Header Title" />);
    expect(screen.getByText('Header Title')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<CardHeader title="Title" description="Description text" />);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('should render action when provided', () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />);
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<CardHeader title="Title" className="custom-class" />);
    const header = screen.getByText('Title').closest('div')?.parentElement;
    expect(header).toHaveClass('custom-class');
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Card body content</CardContent>);
    expect(screen.getByText('Card body content')).toBeInTheDocument();
  });

  it('should apply margin-top by default', () => {
    render(<CardContent>Content</CardContent>);
    const content = screen.getByText('Content').closest('div');
    expect(content).toHaveClass('mt-4');
  });

  it('should apply custom className', () => {
    render(<CardContent className="custom-class">Content</CardContent>);
    const content = screen.getByText('Content').closest('div');
    expect(content).toHaveClass('custom-class');
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter><button>Submit</button></CardFooter>);
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should apply border and margin styles', () => {
    render(<CardFooter>Footer content</CardFooter>);
    const footer = screen.getByText('Footer content').closest('div');
    expect(footer).toHaveClass('mt-6');
    expect(footer).toHaveClass('border-t');
    expect(footer).toHaveClass('pt-4');
  });

  it('should apply custom className', () => {
    render(<CardFooter className="custom-class">Footer</CardFooter>);
    const footer = screen.getByText('Footer').closest('div');
    expect(footer).toHaveClass('custom-class');
  });
});
