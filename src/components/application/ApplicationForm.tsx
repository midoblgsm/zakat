import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { FormWizard } from '../forms/FormWizard';
import { Alert } from '../common/Alert';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  DemographicsStep,
  ContactStep,
  HouseholdStep,
  AssetsStep,
  IncomeDebtsStep,
  CircumstancesStep,
  ZakatRequestStep,
  ReferencesStep,
  DocumentsStep,
  ReviewStep,
} from './steps';
import {
  FORM_STEPS,
  demographicsSchema,
  contactInfoSchema,
  householdSchema,
  assetsSchema,
  incomeDebtsSchema,
  circumstancesSchema,
  zakatRequestSchema,
  referencesSchema,
  documentsSchema,
  reviewSchema,
  type ApplicationFormData,
} from '../../schemas/application';
import { useAutoSave } from '../../hooks/useAutoSave';
import {
  getDraftApplication,
  createDraftApplication,
  submitApplication,
} from '../../services/application';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../utils/constants';

interface ApplicationFormProps {
  applicationId?: string;
}

// Schema array for step validation
const stepSchemas = [
  demographicsSchema,
  contactInfoSchema,
  householdSchema,
  assetsSchema,
  incomeDebtsSchema,
  circumstancesSchema,
  zakatRequestSchema,
  referencesSchema,
  documentsSchema,
  reviewSchema,
];

// Get step field prefix
const stepFieldPrefixes = [
  'demographics',
  'contact',
  'household',
  'assets',
  'incomeDebts',
  'circumstances',
  'zakatRequest',
  'references',
  'documents',
  'review',
] as const;

export function ApplicationForm({ applicationId: propApplicationId }: ApplicationFormProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(
    propApplicationId || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form setup with default values
  const methods = useForm<ApplicationFormData>({
    mode: 'onBlur',
    defaultValues: {
      demographics: {
        fullName: '',
        age: undefined as unknown as number,
        gender: undefined as unknown as 'male' | 'female',
        ssn: '',
        hasDriverLicense: false,
        driverLicenseNumber: '',
        maritalStatus: undefined as unknown as 'single' | 'married' | 'divorced' | 'widowed',
        primaryLanguage: '',
        speaksEnglish: false,
        associatedMasjid: '',
      },
      contact: {
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
        },
        phone: '',
        phoneSecondary: '',
        email: user?.email || '',
      },
      household: {
        members: [],
      },
      assets: {
        hasHouse: false,
        hasBusiness: false,
        hasCars: false,
        cashOnHand: 0,
        cashInBank: 0,
        otherAssets: [],
      },
      incomeDebts: {
        monthlyIncome: 0,
        incomeSource: '',
        receivesGovernmentAid: false,
        governmentAidDetails: '',
        debts: [],
        expenses: [],
      },
      circumstances: {
        residenceType: undefined as unknown as 'own' | 'rent' | 'shelter' | 'subsidized' | 'other',
        residenceDetails: '',
        rentAmount: undefined,
        sharesRent: false,
        rentShareDetails: '',
        transportationType: undefined as unknown as 'own_car' | 'public' | 'rideshare' | 'other',
        transportationDetails: '',
        employmentStatus: undefined as unknown as 'employed' | 'unemployed' | 'self_employed' | 'retired' | 'disabled',
        employerName: '',
        employerAddress: '',
        hasHealthInsurance: false,
        healthInsuranceType: '',
        educationLevel: '',
      },
      zakatRequest: {
        isEligible: false,
        reasonForApplication: '',
        assistanceType: undefined as unknown as 'monthly' | 'one_time',
        monthlyDuration: undefined,
        amountRequested: 0,
      },
      references: {
        references: [],
      },
      documents: {
        otherDocuments: [],
        acknowledgement: false,
      },
      previousApplications: {
        appliedToMHMA: false,
        otherOrganizations: [],
      },
      review: {
        certifyAccurate: false,
        agreeToTerms: false,
        consentToVerification: false,
      },
    },
  });

  const formData = methods.watch();

  // Auto-save hook
  const { isSaving, lastSaved, error: autoSaveError } = useAutoSave({
    applicationId,
    formData,
    enabled: !!applicationId && !isSubmitting,
    debounceMs: 3000,
  });

  // Load existing draft or create new
  useEffect(() => {
    async function loadOrCreateDraft() {
      if (!user || !profile) {
        setLoadError('You must be logged in to access this form');
        setIsLoading(false);
        return;
      }

      try {
        // Check for existing draft
        const draft = await getDraftApplication(user.uid);

        if (draft) {
          setApplicationId(draft.id);
          // Reset form with loaded data
          methods.reset({
            ...methods.getValues(),
            ...draft.data,
          });
        } else {
          // Create new draft
          const newId = await createDraftApplication(
            user.uid,
            user.email || '',
            `${profile.firstName} ${profile.lastName}`,
            profile.phone
          );
          setApplicationId(newId);

          // Pre-fill from profile
          methods.setValue('demographics.fullName', `${profile.firstName} ${profile.lastName}`);
          methods.setValue('contact.email', user.email || '');
          methods.setValue('contact.phone', profile.phone);
          if (profile.address) {
            methods.setValue('contact.address', profile.address);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading application:', error);
        setLoadError('Failed to load application. Please try again.');
        setIsLoading(false);
      }
    }

    loadOrCreateDraft();
  }, [user, profile, methods]);

  // Validate current step
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const stepPrefix = stepFieldPrefixes[currentStep];
    const stepSchema = stepSchemas[currentStep];

    // Get the step data
    const stepData = methods.getValues(stepPrefix as keyof ApplicationFormData);

    try {
      await stepSchema.parseAsync(stepData);

      // Mark step as completed
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(FORM_STEPS[currentStep].id);
        return next;
      });

      return true;
    } catch (error) {
      // Trigger form validation to show errors
      await methods.trigger(stepPrefix as keyof ApplicationFormData);
      return false;
    }
  }, [currentStep, methods]);

  // Handle step change
  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Handle next
  const handleNext = useCallback(async (): Promise<boolean> => {
    return await validateCurrentStep();
  }, [validateCurrentStep]);

  // Handle previous
  const handlePrevious = useCallback(() => {
    // Nothing special needed
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!applicationId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Final validation of all steps
      const allValid = await methods.trigger();
      if (!allValid) {
        setSubmitError('Please complete all required fields before submitting.');
        setIsSubmitting(false);
        return;
      }

      // Submit the application
      await submitApplication(applicationId);

      // Navigate to success page or applications list
      navigate(ROUTES.APPLICANT.APPLICATIONS, {
        state: { submitted: true },
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit application. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [applicationId, methods, navigate]);

  // Build step components
  const steps = useMemo(
    () => [
      { id: 'demographics', title: 'Demographics', component: <DemographicsStep /> },
      { id: 'contact', title: 'Contact Info', component: <ContactStep /> },
      { id: 'household', title: 'Household', component: <HouseholdStep /> },
      { id: 'assets', title: 'Assets', component: <AssetsStep /> },
      { id: 'incomeDebts', title: 'Income & Debts', component: <IncomeDebtsStep /> },
      { id: 'circumstances', title: 'Circumstances', component: <CircumstancesStep /> },
      { id: 'zakatRequest', title: 'Zakat Request', component: <ZakatRequestStep /> },
      { id: 'references', title: 'References', component: <ReferencesStep /> },
      { id: 'documents', title: 'Documents', component: <DocumentsStep /> },
      { id: 'review', title: 'Review', component: <ReviewStep /> },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error">{loadError}</Alert>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto">
        {submitError && (
          <Alert variant="error" className="mb-6" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}

        {autoSaveError && (
          <Alert variant="warning" className="mb-6">
            Auto-save failed: {autoSaveError}. Your changes may not be saved.
          </Alert>
        )}

        <FormWizard
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepChange={handleStepChange}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isSaving={isSaving}
          lastSaved={lastSaved}
          error={null}
        />
      </div>
    </FormProvider>
  );
}
