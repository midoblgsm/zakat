import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeftIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  PaintBrushIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getMasjid, updateMasjid, updateMasjidZakatConfig } from '@/services/masjid';
import {
  updateMasjidProfileSchema,
  zakatConfigSchema,
  US_STATES,
  DOCUMENT_TYPES,
  type UpdateMasjidProfileFormData,
  type ZakatConfigFormData,
} from '@/schemas/masjid';
import type { Masjid, AssistanceType } from '@/types';

type TabId = 'profile' | 'branding' | 'zakat' | 'admins';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Profile', icon: BuildingOffice2Icon },
  { id: 'branding', label: 'Branding', icon: PaintBrushIcon },
  { id: 'zakat', label: 'Zakat Config', icon: Cog6ToothIcon },
  { id: 'admins', label: 'Admins', icon: UserGroupIcon },
];

export function MasjidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [masjid, setMasjid] = useState<Masjid | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    (location.state as { success?: string })?.success || null
  );
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Profile form
  const profileForm = useForm<UpdateMasjidProfileFormData>({
    resolver: zodResolver(updateMasjidProfileSchema),
  });

  // Zakat config state
  const [zakatConfig, setZakatConfig] = useState<ZakatConfigFormData | null>(null);

  useEffect(() => {
    if (id) {
      loadMasjid();
    }
  }, [id]);

  const loadMasjid = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getMasjid(id);
      if (!data) {
        setError('Masjid not found');
        return;
      }

      setMasjid(data);

      // Set form defaults
      profileForm.reset({
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website || '',
        description: data.description,
        address: data.address,
        logo: data.logo || '',
        primaryColor: data.primaryColor || '',
        secondaryColor: data.secondaryColor || '',
        welcomeMessage: data.welcomeMessage || '',
      });

      // Set zakat config
      setZakatConfig({
        nisabThreshold: data.zakatConfig.nisabThreshold,
        assistanceTypes: data.zakatConfig.assistanceTypes,
        maxMonthlyAmount: data.zakatConfig.maxMonthlyAmount,
        maxOneTimeAmount: data.zakatConfig.maxOneTimeAmount,
        requiresReferences: data.zakatConfig.requiresReferences,
        requiredDocuments: data.zakatConfig.requiredDocuments,
      });
    } catch (err) {
      console.error('Error loading masjid:', err);
      setError('Failed to load masjid details');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (data: UpdateMasjidProfileFormData) => {
    if (!id) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateMasjid(id, data);
      setSuccess('Profile updated successfully');
      await loadMasjid();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleZakatConfigSave = async () => {
    if (!id || !zakatConfig) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateMasjidZakatConfig(id, zakatConfig);
      setSuccess('Zakat configuration updated successfully');
      await loadMasjid();
    } catch (err) {
      console.error('Error updating zakat config:', err);
      setError('Failed to update zakat configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAssistanceTypeToggle = (type: AssistanceType) => {
    if (!zakatConfig) return;
    setZakatConfig(prev => prev && ({
      ...prev,
      assistanceTypes: prev.assistanceTypes.includes(type)
        ? prev.assistanceTypes.filter(t => t !== type)
        : [...prev.assistanceTypes, type],
    }));
  };

  const handleDocumentToggle = (doc: string) => {
    if (!zakatConfig) return;
    setZakatConfig(prev => prev && ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.includes(doc)
        ? prev.requiredDocuments.filter(d => d !== doc)
        : [...prev.requiredDocuments, doc],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!masjid) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900">Masjid not found</h2>
        <Button className="mt-4" onClick={() => navigate('/super-admin/masajid')}>
          Back to Masajid
        </Button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Masjid Name"
                {...profileForm.register('name')}
                error={profileForm.formState.errors.name?.message}
                required
              />
              <Input
                label="Email"
                type="email"
                {...profileForm.register('email')}
                error={profileForm.formState.errors.email?.message}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone"
                {...profileForm.register('phone')}
                error={profileForm.formState.errors.phone?.message}
                required
              />
              <Input
                label="Website"
                type="url"
                {...profileForm.register('website')}
                error={profileForm.formState.errors.website?.message}
              />
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                {...profileForm.register('description')}
                className="w-full"
                rows={4}
              />
              {profileForm.formState.errors.description && (
                <p className="form-error">{profileForm.formState.errors.description.message}</p>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
              <div className="space-y-4">
                <Input
                  label="Street Address"
                  {...profileForm.register('address.street')}
                  error={profileForm.formState.errors.address?.street?.message}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    {...profileForm.register('address.city')}
                    error={profileForm.formState.errors.address?.city?.message}
                  />

                  <div>
                    <label className="form-label">State</label>
                    <select {...profileForm.register('address.state')} className="w-full">
                      <option value="">Select State</option>
                      {US_STATES.map(state => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="ZIP Code"
                    {...profileForm.register('address.zipCode')}
                    error={profileForm.formState.errors.address?.zipCode?.message}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={saving}>
                {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save Profile
              </Button>
            </div>
          </form>
        );

      case 'branding':
        return (
          <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-6">
            <div>
              <Input
                label="Logo URL"
                {...profileForm.register('logo')}
                error={profileForm.formState.errors.logo?.message}
                placeholder="https://example.com/logo.png"
                hint="Enter a URL to your masjid's logo image"
              />
              {profileForm.watch('logo') && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Preview:</p>
                  <img
                    src={profileForm.watch('logo')}
                    alt="Logo preview"
                    className="h-20 w-20 object-contain border rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Primary Color"
                  type="text"
                  {...profileForm.register('primaryColor')}
                  error={profileForm.formState.errors.primaryColor?.message}
                  placeholder="#6366f1"
                />
                {profileForm.watch('primaryColor') && (
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded border"
                      style={{ backgroundColor: profileForm.watch('primaryColor') }}
                    />
                    <span className="text-sm text-gray-500">Preview</span>
                  </div>
                )}
              </div>

              <div>
                <Input
                  label="Secondary Color"
                  type="text"
                  {...profileForm.register('secondaryColor')}
                  error={profileForm.formState.errors.secondaryColor?.message}
                  placeholder="#818cf8"
                />
                {profileForm.watch('secondaryColor') && (
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded border"
                      style={{ backgroundColor: profileForm.watch('secondaryColor') }}
                    />
                    <span className="text-sm text-gray-500">Preview</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Welcome Message</label>
              <textarea
                {...profileForm.register('welcomeMessage')}
                className="w-full"
                rows={4}
                placeholder="Welcome to our Zakat application portal..."
              />
              {profileForm.formState.errors.welcomeMessage && (
                <p className="form-error">{profileForm.formState.errors.welcomeMessage.message}</p>
              )}
              <p className="form-hint">
                This message will be shown to applicants when they start an application
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={saving}>
                {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save Branding
              </Button>
            </div>
          </form>
        );

      case 'zakat':
        if (!zakatConfig) return null;
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
                  setZakatConfig(prev => prev && ({
                    ...prev,
                    nisabThreshold: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="form-hint">
                Last updated: {masjid.zakatConfig.nisabLastUpdated?.toDate?.()?.toLocaleDateString() || 'Unknown'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Max Monthly Assistance (USD)</label>
                <Input
                  type="number"
                  value={zakatConfig.maxMonthlyAmount || ''}
                  onChange={(e) =>
                    setZakatConfig(prev => prev && ({
                      ...prev,
                      maxMonthlyAmount: parseFloat(e.target.value) || undefined,
                    }))
                  }
                />
              </div>
              <div>
                <label className="form-label">Max One-Time Assistance (USD)</label>
                <Input
                  type="number"
                  value={zakatConfig.maxOneTimeAmount || ''}
                  onChange={(e) =>
                    setZakatConfig(prev => prev && ({
                      ...prev,
                      maxOneTimeAmount: parseFloat(e.target.value) || undefined,
                    }))
                  }
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
                    setZakatConfig(prev => prev && ({
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

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleZakatConfigSave} disabled={saving}>
                {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save Zakat Configuration
              </Button>
            </div>
          </div>
        );

      case 'admins':
        return (
          <div className="text-center py-8">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Admin Management</h3>
            <p className="mt-1 text-sm text-gray-500">
              Go to User Management to assign admins to this masjid.
            </p>
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => navigate(`/super-admin/users?masjidId=${id}`)}
              >
                Manage Users
              </Button>
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
        <div className="flex items-center gap-4">
          {masjid.logo ? (
            <img
              src={masjid.logo}
              alt={masjid.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: masjid.primaryColor || '#6366f1' }}
            >
              <span className="text-white font-bold text-xl">
                {masjid.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{masjid.name}</h1>
            <p className="text-gray-600">/{masjid.slug}</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {masjid.stats?.applicationsInProgress || 0}
            </p>
            <p className="text-sm text-gray-500">Active Cases</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {masjid.stats?.totalApplicationsHandled || 0}
            </p>
            <p className="text-sm text-gray-500">Total Handled</p>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              ${(masjid.stats?.totalAmountDisbursed || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Disbursed</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <CardContent>{renderTabContent()}</CardContent>
      </Card>
    </div>
  );
}
