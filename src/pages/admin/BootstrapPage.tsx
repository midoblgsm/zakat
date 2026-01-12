import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bootstrapSuperAdmin } from '@/services/functions';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';

/**
 * Bootstrap Page - One-time use to create the first super admin
 *
 * This page should be removed or protected after the first super admin is created.
 * Access at: /bootstrap
 */
export function BootstrapPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    bootstrapKey: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await bootstrapSuperAdmin({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        bootstrapKey: formData.bootstrapKey,
      });

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to create super admin');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      // Parse Firebase error messages
      if (errorMessage.includes('already exists')) {
        setError('A super admin already exists. Please login instead.');
      } else if (errorMessage.includes('permission-denied') || errorMessage.includes('Invalid bootstrap key')) {
        setError('Invalid bootstrap key. Please check your configuration.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <Alert variant="success" title="Super Admin Created!">
            <p>Your super admin account has been created successfully.</p>
            <p className="mt-2">Redirecting to login page...</p>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Bootstrap Super Admin</h1>
            <p className="mt-2 text-sm text-gray-600">
              Create the first super admin account for the Zakat Management Platform
            </p>
          </div>

          <Alert variant="warning" className="mb-6">
            <p className="text-sm">
              This page is for one-time setup only. It will fail if a super admin already exists.
            </p>
          </Alert>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Super"
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Admin"
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@yourmasjid.org"
            />

            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="1234567890"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Minimum 8 characters"
            />

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />

            <div className="border-t pt-4">
              <Input
                label="Bootstrap Key"
                name="bootstrapKey"
                type="password"
                value={formData.bootstrapKey}
                onChange={handleChange}
                required
                placeholder="Enter the bootstrap secret key"
                hint="This key is set in Firebase Functions config"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Super Admin...' : 'Create Super Admin'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-sm text-green-600 hover:text-green-500"
            >
              Already have an account? Login
            </a>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Default bootstrap key: <code className="bg-gray-100 px-1 rounded">CHANGE_THIS_IN_PRODUCTION</code></p>
          <p className="mt-1">Set a secure key with: <code className="bg-gray-100 px-1 rounded">firebase functions:config:set bootstrap.key="your-key"</code></p>
        </div>
      </div>
    </div>
  );
}
