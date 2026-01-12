import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import { Card } from '@/components/common/Card';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().min(10, 'Please enter a valid phone number'),
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().regex(/^\d{5}$/, 'Please enter a valid 5-digit ZIP code'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, error: authError, clearError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    clearError();
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/verify-email');
      }, 2000);
    } catch {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Registration Successful!</h2>
          <p className="mt-2 text-gray-600">
            Please check your email to verify your account.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
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
          <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>

          {authError && (
            <Alert variant="error" className="mt-4" onClose={clearError}>
              {authError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                label="Last name"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Phone number"
              type="tel"
              autoComplete="tel"
              {...register('phone')}
              error={errors.phone?.message}
            />

            <Input
              label="Street address"
              {...register('street')}
              error={errors.street?.message}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="City"
                {...register('city')}
                error={errors.city?.message}
              />
              <Input
                label="State"
                {...register('state')}
                error={errors.state?.message}
              />
              <Input
                label="ZIP code"
                {...register('zipCode')}
                error={errors.zipCode?.message}
              />
            </div>

            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
              hint="At least 8 characters with uppercase, lowercase, and number"
            />

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />

            <Button type="submit" fullWidth loading={isLoading}>
              Create account
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
