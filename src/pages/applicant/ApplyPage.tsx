import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ApplicationForm } from '../../components/application';
import { ROUTES } from '../../utils/constants';

export function ApplyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={ROUTES.APPLICANT.DASHBOARD}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>

          <h1 className="text-2xl font-bold text-gray-900">
            Zakat Assistance Application
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Complete all sections below to apply for Zakat assistance. Your
            progress is automatically saved.
          </p>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          <ApplicationForm />
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Having trouble with the application?{' '}
            <a
              href="mailto:support@zakatplatform.org"
              className="text-primary-600 hover:text-primary-700"
            >
              Contact support
            </a>
          </p>
          <p className="mt-2">
            Your information is kept secure and confidential.
          </p>
        </div>
      </div>
    </div>
  );
}
