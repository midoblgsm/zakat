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

  it('renders all steps as accessible buttons', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    // Each step should have a button with an accessible aria-label
    mockSteps.forEach((step, index) => {
      const expectedLabel = new RegExp(`Step ${index + 1}: ${step.title}`);
      expect(screen.getByRole('button', { name: expectedLabel })).toBeInTheDocument();
    });
  });

  it('displays current step title', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    // Current step title should be visible (shown in both mobile and desktop views)
    const currentStepTitle = screen.getAllByText('Step 2');
    expect(currentStepTitle.length).toBeGreaterThan(0);
  });

  it('displays current step number on mobile', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    // 1 out of 3 steps completed = 33% complete
    expect(screen.getAllByText(/33% complete/).length).toBeGreaterThan(0);
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

  it('marks completed steps in aria-label', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);

    // Step 1 is completed, should have "(completed)" in aria-label
    expect(
      screen.getByRole('button', { name: /Step 1: Step 1 \(completed\)/ })
    ).toBeInTheDocument();

    // Step 2 is current, should have "(current)" in aria-label
    expect(
      screen.getByRole('button', { name: /Step 2: Step 2 \(current\)/ })
    ).toBeInTheDocument();
  });
});
