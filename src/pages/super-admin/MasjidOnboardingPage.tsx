import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { createMasjid, generateSlug, isSlugAvailable } from '@/services/masjid';
import { createMasjidSchema, US_STATES, DOCUMENT_TYPES, type CreateMasjidFormData } from '@/schemas/masjid';
import type { AssistanceType } from '@/types';

const STEPS = [
  { id: 'basic', title: 'Basic Information' },
  { id: 'contact', title: 'Contact & Address' },
  { id: 'zakat', title: 'Zakat Configuration' },
  { id: 'review', title: 'Review & Create' },
] as const;

type Step = (typeof STEPS)[number]['id'];

export function MasjidOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Zakat config state (separate from react-hook-form)
  const [zakatConfig, setZakatConfig] = useState({
    nisabThreshold: 5000,
    assistanceTypes: ['monthly', 'one_time', 'emergency'] as AssistanceType[],
    maxMonthlyAmount: 2000,
    maxOneTimeAmount: 5000,
    requiresReferences: true,
    requiredDocuments: ['photoId', 'ssnCard'] as string[],
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<CreateMasjidFormData>({
    resolver: zodResolver(createMasjidSchema),
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      phone: '',
      website: '',
      description: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
    },
  });

  const watchedValues = watch();

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const handleNameChange = async (name: string) => {
    const slug = generateSlug(name);
    setValue('slug', slug);

    // Check slug availability
    if (slug.length >= 3) {
      const available = await isSlugAvailable(slug);
      if (!available) {
        setSlugError('This slug is already in use. Please modify it.');
      } else {
        setSlugError(null);
      }
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 'basic':
        return await trigger(['name', 'slug', 'description']);
      case 'contact':
        return await trigger(['email', 'phone', 'website', 'address']);
      case 'zakat':
        return true; // Zakat config uses separate state
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (slugError) {
      setSubmitError('Please fix the slug error before continuing.');
      return;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
      setSubmitError(null);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
      setSubmitError(null);
    }
  };

  const handleAssistanceTypeToggle = (type: AssistanceType) => {
    setZakatConfig(prev => ({
      ...prev,
      assistanceTypes: prev.assistanceTypes.includes(type)
        ? prev.assistanceTypes.filter(t => t !== type)
        : [...prev.assistanceTypes, type],
    }));
  };

  const handleDocumentToggle = (doc: string) => {
    setZakatConfig(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.includes(doc)
        ? prev.requiredDocuments.filter(d => d !== doc)
        : [...prev.requiredDocuments, doc],
    }));
  };

  const onSubmit = async (data: CreateMasjidFormData) => {
    if (!user?.uid) {
      setSubmitError('You must be logged in to create a masjid.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const masjid = await createMasjid(
        {
          ...data,
          zakatConfig,
        },
        user.uid
      );

      navigate(`/super-admin/masajid/${masjid.id}`, {
        state: { success: 'Masjid created successfully!' },
      });
    } catch (error) {
      console.error('Error creating masjid:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to create masjid. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <Input
                label="Masjid Name"
                {...register('name', {
                  onChange: (e) => handleNameChange(e.target.value),
                })}
                error={errors.name?.message}
                placeholder="e.g., Islamic Center of Houston"
                required
              />
            </div>

            <div>
              <Input
                label="URL Slug"
                {...register('slug')}
                error={errors.slug?.message || slugError || undefined}
                hint="This will be used in the masjid's unique URL"
                required
              />
            </div>

            <div>
              <label className="form-label">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('description')}
                className={`w-full ${errors.description ? 'border-red-500' : ''}`}
                rows={4}
                placeholder="Describe the masjid's mission and community..."
              />
              {errors.description && (
                <p className="form-error">{errors.description.message}</p>
              )}
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="contact@masjid.org"
                required
              />
              <Input
                label="Phone"
                {...register('phone')}
                error={errors.phone?.message}
                placeholder="(555) 555-5555"
                required
              />
            </div>

            <Input
              label="Website"
              type="url"
              {...register('website')}
              error={errors.website?.message}
              placeholder="https://www.masjid.org"
            />

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>

              <div className="space-y-4">
                <Input
                  label="Street Address"
                  {...register('address.street')}
                  error={errors.address?.street?.message}
                  placeholder="123 Main Street"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    {...register('address.city')}
                    error={errors.address?.city?.message}
                    placeholder="Houston"
                    required
                  />

                  <div>
                    <label className="form-label">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('address.state')}
                      className={`w-full ${errors.address?.state ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(state => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                    {errors.address?.state && (
                      <p className="form-error">{errors.address.state.message}</p>
                    )}
                  </div>

                  <Input
                    label="ZIP Code"
                    {...register('address.zipCode')}
                    error={errors.address?.zipCode?.message}
                    placeholder="77001"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'zakat':
        return (
          <div className="space-y-6">
            <div>
              <label className="form-label">
                Nisab Threshold (USD) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={zakatConfig.nisabThreshold}
                onChange={(e) =>
                  setZakatConfig(prev => ({
                    ...prev,
                    nisabThreshold: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="5000"
              />
              <p className="form-hint">
                The minimum wealth threshold for zakat eligibility
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Max Monthly Assistance (USD)</label>
                <Input
                  type="number"
                  value={zakatConfig.maxMonthlyAmount}
                  onChange={(e) =>
                    setZakatConfig(prev => ({
                      ...prev,
                      maxMonthlyAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="2000"
                />
              </div>
              <div>
                <label className="form-label">Max One-Time Assistance (USD)</label>
                <Input
                  type="number"
                  value={zakatConfig.maxOneTimeAmount}
                  onChange={(e) =>
                    setZakatConfig(prev => ({
                      ...prev,
                      maxOneTimeAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="5000"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Assistance Types</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(['monthly', 'one_time', 'emergency'] as AssistanceType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAssistanceTypeToggle(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      zakatConfig.assistanceTypes.includes(type)
                        ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                  >
                    {type === 'one_time' ? 'One-Time' : type.charAt(0).toUpperCase() + type.slice(1)}
                    {zakatConfig.assistanceTypes.includes(type) && (
                      <CheckIcon className="inline-block h-4 w-4 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={zakatConfig.requiresReferences}
                  onChange={(e) =>
                    setZakatConfig(prev => ({
                      ...prev,
                      requiresReferences: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Require references from applicants
                </span>
              </label>
            </div>

            <div>
              <label className="form-label">Required Documents</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {DOCUMENT_TYPES.map(doc => (
                  <label
                    key={doc.value}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={zakatConfig.requiredDocuments.includes(doc.value)}
                      onChange={() => handleDocumentToggle(doc.value)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Basic Information</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Name</dt>
                  <dd className="font-medium text-gray-900">{watchedValues.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Slug</dt>
                  <dd className="font-medium text-gray-900">/{watchedValues.slug}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Description</dt>
                  <dd className="font-medium text-gray-900">{watchedValues.description}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Contact Information</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium text-gray-900">{watchedValues.email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{watchedValues.phone}</dd>
                </div>
                {watchedValues.website && (
                  <div>
                    <dt className="text-gray-500">Website</dt>
                    <dd className="font-medium text-gray-900">{watchedValues.website}</dd>
                  </div>
                )}
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-medium text-gray-900">
                    {watchedValues.address?.street}, {watchedValues.address?.city},{' '}
                    {watchedValues.address?.state} {watchedValues.address?.zipCode}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Zakat Configuration</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Nisab Threshold</dt>
                  <dd className="font-medium text-gray-900">
                    ${zakatConfig.nisabThreshold.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Assistance Types</dt>
                  <dd className="font-medium text-gray-900">
                    {zakatConfig.assistanceTypes
                      .map(t => (t === 'one_time' ? 'One-Time' : t.charAt(0).toUpperCase() + t.slice(1)))
                      .join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Max Monthly</dt>
                  <dd className="font-medium text-gray-900">
                    ${(zakatConfig.maxMonthlyAmount || 0).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Max One-Time</dt>
                  <dd className="font-medium text-gray-900">
                    ${(zakatConfig.maxOneTimeAmount || 0).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Requires References</dt>
                  <dd className="font-medium text-gray-900">
                    {zakatConfig.requiresReferences ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-gray-500">Required Documents</dt>
                  <dd className="font-medium text-gray-900">
                    {zakatConfig.requiredDocuments
                      .map(d => DOCUMENT_TYPES.find(dt => dt.value === d)?.label || d)
                      .join(', ')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/super-admin/masajid')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboard New Masjid</h1>
          <p className="mt-1 text-gray-600">
            Add a new masjid to the Zakat platform
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {STEPS.map((step, index) => {
            const isComplete = index < currentStepIndex;
            const isCurrent = step.id === currentStep;

            return (
              <li
                key={step.id}
                className={`relative ${index !== STEPS.length - 1 ? 'flex-1 pr-8' : ''}`}
              >
                <div className="flex items-center">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      isComplete
                        ? 'bg-primary-600 text-white'
                        : isCurrent
                        ? 'border-2 border-primary-600 text-primary-600'
                        : 'border-2 border-gray-300 text-gray-500'
                    }`}
                  >
                    {isComplete ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`ml-3 text-sm font-medium ${
                      isCurrent ? 'text-primary-600' : 'text-gray-500'
                    } hidden sm:block`}
                  >
                    {step.title}
                  </span>
                </div>
                {index !== STEPS.length - 1 && (
                  <div
                    className={`absolute top-5 left-10 w-full h-0.5 ${
                      isComplete ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                    style={{ width: 'calc(100% - 2.5rem)' }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {submitError && (
        <Alert variant="error" onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      <Card>
        <CardHeader
          title={STEPS[currentStepIndex].title}
          description={`Step ${currentStepIndex + 1} of ${STEPS.length}`}
        />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStepContent()}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                Back
              </Button>

              {currentStep === 'review' ? (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Masjid'
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
