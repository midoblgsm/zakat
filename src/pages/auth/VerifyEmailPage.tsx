import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Alert } from '@/components/common/Alert';
import { Card } from '@/components/common/Card';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { user, isEmailVerified, resendVerification, logout, error: authError, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // If already verified, redirect to dashboard
  if (isEmailVerified) {
    navigate('/applicant', { replace: true });
    return null;
  }

  const handleResend = async () => {
    setIsLoading(true);
    clearError();
    setResendSuccess(false);
    try {
      await resendVerification();
      setResendSuccess(true);
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">Zakat Portal</span>
          </Link>
        </div>

        <Card>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Verify your email</h2>
            <p className="mt-2 text-gray-600">
              We've sent a verification email to{' '}
              <span className="font-medium">{user?.email}</span>. Please click the link in the email
              to verify your account.
            </p>

            {authError && (
              <Alert variant="error" className="mt-4" onClose={clearError}>
                {authError}
              </Alert>
            )}

            {resendSuccess && (
              <Alert variant="success" className="mt-4">
                Verification email sent successfully!
              </Alert>
            )}

            <div className="mt-6 space-y-3">
              <Button onClick={handleResend} loading={isLoading} fullWidth>
                Resend verification email
              </Button>
              <Button variant="outline" onClick={handleLogout} fullWidth>
                Sign out
              </Button>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or click resend above.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
