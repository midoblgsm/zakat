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
  return (
    <div className={clsx('w-full', className)}>
      {/* Mobile view - simple text indicator */}
      <div className="sm:hidden mb-4">
        <span className="text-sm font-medium text-gray-500">
          Step {currentStep + 1} of {steps.length}
        </span>
        <h2 className="text-lg font-semibold text-gray-900">
          {steps[currentStep]?.title}
        </h2>
      </div>

      {/* Desktop view - full progress bar */}
      <nav aria-label="Progress" className="hidden sm:block">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={clsx(
                'relative',
                index !== steps.length - 1 && 'flex-1 pr-8'
              )}
            >
              {/* Connector line */}
              {index !== steps.length - 1 && (
                <div
                  className={clsx(
                    'absolute top-4 left-4 -ml-px h-0.5 w-full',
                    step.isCompleted ? 'bg-primary-600' : 'bg-gray-200'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step indicator */}
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick || (!step.isCompleted && !step.isActive)}
                className={clsx(
                  'group relative flex items-center',
                  onStepClick && (step.isCompleted || step.isActive) && 'cursor-pointer',
                  (!onStepClick || (!step.isCompleted && !step.isActive)) && 'cursor-default'
                )}
                aria-current={step.isActive ? 'step' : undefined}
              >
                <span className="flex h-8 items-center" aria-hidden="true">
                  <span
                    className={clsx(
                      'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                      step.isCompleted && 'bg-primary-600 group-hover:bg-primary-800',
                      step.isActive && !step.isCompleted && 'border-2 border-primary-600 bg-white',
                      !step.isActive && !step.isCompleted && 'border-2 border-gray-300 bg-white'
                    )}
                  >
                    {step.isCompleted ? (
                      <CheckIcon className="h-5 w-5 text-white" />
                    ) : (
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          step.isActive ? 'text-primary-600' : 'text-gray-500'
                        )}
                      >
                        {index + 1}
                      </span>
                    )}
                  </span>
                </span>
                <span className="ml-3 flex min-w-0 flex-col">
                  <span
                    className={clsx(
                      'text-sm font-medium',
                      step.isActive && 'text-primary-600',
                      step.isCompleted && 'text-gray-900',
                      !step.isActive && !step.isCompleted && 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Progress bar for mobile */}
      <div className="sm:hidden">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
