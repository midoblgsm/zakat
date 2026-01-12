import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import { Card } from '@/components/common/Card';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { sendPasswordReset, error: authError, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    clearError();
    try {
      await sendPasswordReset(data.email);
      setSuccess(true);
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false);
    }
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
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Check your email</h2>
              <p className="mt-2 text-gray-600">
                We've sent you a password reset link. Please check your email inbox.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-6">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {authError && (
                <Alert variant="error" className="mt-4" onClose={clearError}>
                  {authError}
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  error={errors.email?.message}
                />

                <Button type="submit" fullWidth loading={isLoading}>
                  Send reset link
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    Back to sign in
                  </Link>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
