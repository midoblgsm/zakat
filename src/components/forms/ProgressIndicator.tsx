import { clsx } from 'clsx';
import { CheckIcon } from '@heroicons/react/24/solid';

export interface StepInfo {
  id: string;
  title: string;
  isCompleted: boolean;
  isActive: boolean;
}

interface ProgressIndicatorProps {
  steps: StepInfo[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function ProgressIndicator({
  steps,
  currentStep,
  onStepClick,
  className,
}: ProgressIndicatorProps) {
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className={clsx('w-full', className)}>
      {/* Mobile view - simple text indicator with progress bar */}
      <div className="lg:hidden mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium text-primary-600">
            {progressPercent}% complete
          </span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {steps[currentStep]?.title}
        </h2>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop view - compact step indicators */}
      <nav aria-label="Progress" className="hidden lg:block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500">
            Application Progress
          </span>
          <span className="text-sm font-medium text-primary-600">
            {progressPercent}% complete
          </span>
        </div>

        {/* Progress bar background */}
        <div className="relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Step dots */}
          <div className="absolute inset-0 flex items-center justify-between">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick || (!step.isCompleted && !step.isActive)}
                className={clsx(
                  'relative flex items-center justify-center',
                  'w-6 h-6 rounded-full border-2 transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  step.isCompleted && 'bg-primary-600 border-primary-600',
                  step.isActive && !step.isCompleted && 'bg-white border-primary-600',
                  !step.isActive && !step.isCompleted && 'bg-white border-gray-300',
                  onStepClick && (step.isCompleted || step.isActive) ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                )}
                title={step.title}
                aria-current={step.isActive ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.title}${step.isCompleted ? ' (completed)' : step.isActive ? ' (current)' : ''}`}
              >
                {step.isCompleted ? (
                  <CheckIcon className="h-3.5 w-3.5 text-white" />
                ) : (
                  <span
                    className={clsx(
                      'text-xs font-medium',
                      step.isActive ? 'text-primary-600' : 'text-gray-400'
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current step title */}
        <div className="mt-3 text-center">
          <span className="text-sm font-medium text-gray-900">
            {steps[currentStep]?.title}
          </span>
        </div>
      </nav>
    </div>
  );
}
