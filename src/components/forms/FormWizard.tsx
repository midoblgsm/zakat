import { useCallback, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ProgressIndicator, type StepInfo } from './ProgressIndicator';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';

interface FormWizardStep {
  id: string;
  title: string;
  component: ReactNode;
}

interface FormWizardProps {
  steps: FormWizardStep[];
  currentStep: number;
  completedSteps: Set<string>;
  onStepChange: (step: number) => void;
  onNext: () => Promise<boolean> | boolean;
  onPrevious: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  error?: string | null;
  className?: string;
}

export function FormWizard({
  steps,
  currentStep,
  completedSteps,
  onStepChange,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting = false,
  isSaving = false,
  lastSaved,
  error,
  className,
}: FormWizardProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const stepInfos: StepInfo[] = steps.map((step, index) => ({
    id: step.id,
    title: step.title,
    isCompleted: completedSteps.has(step.id),
    isActive: index === currentStep,
  }));

  const handleNext = useCallback(async () => {
    setIsNavigating(true);
    try {
      const isValid = await onNext();
      if (isValid && !isLastStep) {
        onStepChange(currentStep + 1);
      }
    } finally {
      setIsNavigating(false);
    }
  }, [onNext, isLastStep, currentStep, onStepChange]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      onPrevious();
      onStepChange(currentStep - 1);
    }
  }, [isFirstStep, onPrevious, currentStep, onStepChange]);

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      // Only allow navigation to completed steps or the current step
      if (completedSteps.has(steps[stepIndex].id) || stepIndex === currentStep) {
        onStepChange(stepIndex);
      }
    },
    [completedSteps, steps, currentStep, onStepChange]
  );

  const handleSubmit = useCallback(async () => {
    setIsNavigating(true);
    try {
      const isValid = await onNext();
      if (isValid) {
        await onSubmit();
      }
    } finally {
      setIsNavigating(false);
    }
  }, [onNext, onSubmit]);

  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Progress indicator */}
      <ProgressIndicator
        steps={stepInfos}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        className="mb-8"
      />

      {/* Auto-save indicator */}
      {(isSaving || lastSaved) && (
        <div className="mb-4 flex items-center justify-end text-sm text-gray-500">
          {isSaving ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : lastSaved ? (
            <span>
              Draft saved at {lastSaved.toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Current step content */}
      <div className="flex-1 min-h-[400px]">
        {steps[currentStep]?.component}
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep || isNavigating || isSubmitting}
        >
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {isLastStep ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isNavigating || isSubmitting}
              loading={isSubmitting}
            >
              Submit Application
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isNavigating || isSubmitting}
              loading={isNavigating}
            >
              Save & Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
