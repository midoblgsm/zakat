import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UserPlusIcon,
  UserGroupIcon,
  PencilIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal, ModalFooter } from '@/components/common/Modal';
import { Alert } from '@/components/common/Alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getActiveMasajid } from '@/services/masjid';
import {
  listUsers,
  createAdminUser,
  setUserRole,
  disableUser,
  enableUser,
} from '@/services/functions';
import { createAdminUserSchema, type CreateAdminUserFormData } from '@/schemas/masjid';
import type { Masjid, UserRole } from '@/types';

interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  masjidId?: string;
  isActive: boolean;
  createdAt: string;
}

export function UserManagementPage() {
  const [searchParams] = useSearchParams();
  const filterMasjidId = searchParams.get('masjidId');

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [masajid, setMasajid] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterMasjid, setFilterMasjid] = useState<string>(filterMasjidId || '');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [processing, setProcessing] = useState(false);

  // Create admin form
  const createForm = useForm<CreateAdminUserFormData>({
    resolver: zodResolver(createAdminUserSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'zakat_admin',
      masjidId: filterMasjidId || '',
    },
  });

  // Edit user role state
  const [editRole, setEditRole] = useState<UserRole>('applicant');
  const [editMasjidId, setEditMasjidId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResult, masajidResult] = await Promise.all([
        listUsers({ limit: 100 }),
        getActiveMasajid(),
      ]);

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data.users as UserListItem[]);
      }
      setMasajid(masajidResult);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (data: CreateAdminUserFormData) => {
    setProcessing(true);
    setError(null);

    try {
      const result = await createAdminUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        masjidId: data.role === 'zakat_admin' ? data.masjidId : undefined,
      });

      if (result.success) {
        setSuccess('Admin user created successfully');
        setShowCreateModal(false);
        createForm.reset();
        await loadData();
      } else {
        setError(result.error || 'Failed to create admin user');
      }
    } catch (err) {
      console.error('Error creating admin:', err);
      setError('Failed to create admin user');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditUser = (user: UserListItem) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditMasjidId(user.masjidId || '');
    setShowEditModal(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    setError(null);

    try {
      const result = await setUserRole({
        userId: selectedUser.id,
        role: editRole,
        masjidId: editRole === 'zakat_admin' ? editMasjidId : undefined,
      });

      if (result.success) {
        setSuccess('User role updated successfully');
        setShowEditModal(false);
        setSelectedUser(null);
        await loadData();
      } else {
        setError(result.error || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update user role');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleUserStatus = async (user: UserListItem) => {
    setProcessing(true);
    setError(null);

    try {
      const result = user.isActive
        ? await disableUser({ userId: user.id })
        : await enableUser(user.id);

      if (result.success) {
        setSuccess(`User ${user.isActive ? 'disabled' : 'enabled'} successfully`);
        await loadData();
      } else {
        setError(result.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError('Failed to update user status');
    } finally {
      setProcessing(false);
    }
  };

  const getMasjidName = (masjidId?: string) => {
    if (!masjidId) return '-';
    const masjid = masajid.find(m => m.id === masjidId);
    return masjid?.name || 'Unknown';
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'zakat_admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !user.email.toLowerCase().includes(query) &&
        !user.firstName.toLowerCase().includes(query) &&
        !user.lastName.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Role filter
    if (filterRole !== 'all' && user.role !== filterRole) {
      return false;
    }

    // Masjid filter
    if (filterMasjid && user.masjidId !== filterMasjid) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-gray-600">
            Manage users and assign admin roles to masajid
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Create Admin
        </Button>
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

      <Card>
        <CardHeader title="All Users" />
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
                className="w-full"
              >
                <option value="all">All Roles</option>
                <option value="applicant">Applicants</option>
                <option value="zakat_admin">Zakat Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={filterMasjid}
                onChange={(e) => setFilterMasjid(e.target.value)}
                className="w-full"
              >
                <option value="">All Masajid</option>
                {masajid.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || filterRole !== 'all' || filterMasjid
                  ? 'Try adjusting your filters'
                  : 'No users registered yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Masjid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role === 'super_admin' && (
                            <ShieldCheckIcon className="h-3.5 w-3.5 mr-1" />
                          )}
                          {user.role === 'zakat_admin' && (
                            <ShieldExclamationIcon className="h-3.5 w-3.5 mr-1" />
                          )}
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">
                          {getMasjidName(user.masjidId)}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={processing}
                          >
                            {user.isActive ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Admin Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Admin User"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(handleCreateAdmin)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              {...createForm.register('firstName')}
              error={createForm.formState.errors.firstName?.message}
              required
            />
            <Input
              label="Last Name"
              {...createForm.register('lastName')}
              error={createForm.formState.errors.lastName?.message}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            {...createForm.register('email')}
            error={createForm.formState.errors.email?.message}
            required
          />

          <Input
            label="Phone"
            {...createForm.register('phone')}
            error={createForm.formState.errors.phone?.message}
            placeholder="(555) 555-5555"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              {...createForm.register('password')}
              error={createForm.formState.errors.password?.message}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              {...createForm.register('confirmPassword')}
              error={createForm.formState.errors.confirmPassword?.message}
              required
            />
          </div>

          <div>
            <label className="form-label">
              Role <span className="text-red-500">*</span>
            </label>
            <select {...createForm.register('role')} className="w-full">
              <option value="zakat_admin">Zakat Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {createForm.watch('role') === 'zakat_admin' && (
            <div>
              <label className="form-label">
                Assign to Masjid <span className="text-red-500">*</span>
              </label>
              <select {...createForm.register('masjidId')} className="w-full">
                <option value="">Select Masjid</option>
                {masajid.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {createForm.formState.errors.masjidId && (
                <p className="form-error">{createForm.formState.errors.masjidId.message}</p>
              )}
            </div>
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {processing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Create Admin
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit User Role Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User Role"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">
                {selectedUser.firstName} {selectedUser.lastName}
              </p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>

            <div>
              <label className="form-label">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="w-full"
              >
                <option value="applicant">Applicant</option>
                <option value="zakat_admin">Zakat Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {editRole === 'zakat_admin' && (
              <div>
                <label className="form-label">Assign to Masjid</label>
                <select
                  value={editMasjidId}
                  onChange={(e) => setEditMasjidId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Select Masjid</option>
                  {masajid.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <ModalFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={processing || (editRole === 'zakat_admin' && !editMasjidId)}
              >
                {processing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save Changes
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
