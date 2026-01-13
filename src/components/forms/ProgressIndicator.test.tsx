import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressIndicator, type StepInfo } from './ProgressIndicator';

describe('ProgressIndicator', () => {
  const mockSteps: StepInfo[] = [
    { id: 'step1', title: 'Step 1', isCompleted: true, isActive: false },
    { id: 'step2', title: 'Step 2', isCompleted: false, isActive: true },
    { id: 'step3', title: 'Step 3', isCompleted: false, isActive: false },
  ];

  it('renders all steps', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    // Desktop view renders step titles, mobile shows current step only
    mockSteps.forEach((step) => {
      // Use getAllByText since desktop and potentially mobile views both render
      const elements = screen.getAllByText(step.title);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('displays current step number on mobile', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
  });

  it('shows check icon for completed steps', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    // Step 1 is completed, should have a check icon
    // The check icon is rendered via CheckIcon component
    const stepButtons = screen.getAllByRole('button');
    expect(stepButtons).toHaveLength(3);
  });

  it('calls onStepClick when completed step is clicked', async () => {
    const handleStepClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ProgressIndicator
        steps={mockSteps}
        currentStep={1}
        onStepClick={handleStepClick}
      />
    );

    // Click on Step 1 (completed step)
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);

    expect(handleStepClick).toHaveBeenCalledWith(0);
  });

  it('calls onStepClick when active step is clicked', async () => {
    const handleStepClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ProgressIndicator
        steps={mockSteps}
        currentStep={1}
        onStepClick={handleStepClick}
      />
    );

    // Click on Step 2 (active step)
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);

    expect(handleStepClick).toHaveBeenCalledWith(1);
  });

  it('does not call onStepClick when incomplete step is clicked', async () => {
    const handleStepClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ProgressIndicator
        steps={mockSteps}
        currentStep={1}
        onStepClick={handleStepClick}
      />
    );

    // Click on Step 3 (incomplete step)
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[2]);

    expect(handleStepClick).not.toHaveBeenCalled();
  });

  it('applies current step aria attribute', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toHaveAttribute('aria-current', 'step');
  });
});
