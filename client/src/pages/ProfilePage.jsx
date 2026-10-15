import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
import api, { getAvatarUrl } from '../services/api';
import useAuth from '../hooks/useAuth';
import { Card, CardHeader, CardContent } from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProfilePage = () => {
  const { updateUser } = useAuth();

  // Profile data & loading states
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Personal Information state
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Change Password state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Avatar Upload / Remove state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await api.get('/profile');
      if (response.data?.success && response.data?.data) {
        setProfile(response.data.data);
        setName(response.data.data.name || '');
      } else {
        setFetchError(response.data?.message || 'Failed to load profile');
      }
    } catch (err) {
      setFetchError(err.response?.data?.message || 'An error occurred while loading profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Save Name
  const handleSaveName = async (e) => {
    e.preventDefault();
    setNameError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 60) {
      setNameError('Name must be between 2 and 60 characters');
      return;
    }

    setSavingName(true);
    try {
      const response = await api.patch('/profile', { name: trimmed });
      if (response.data?.success && response.data?.data) {
        setProfile((prev) => ({ ...prev, name: response.data.data.name }));
        setName(response.data.data.name);
        updateUser({ name: response.data.data.name });
        setToastMessage('Profile updated');
      } else {
        setNameError(response.data?.message || 'Failed to update profile');
      }
    } catch (err) {
      setNameError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingName(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long';
    } else if (newPassword === currentPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'New password and confirmation do not match';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setUpdatingPassword(true);

    try {
      const response = await api.patch('/profile/password', {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (response.data?.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordErrors({});
        setToastMessage('Password updated');
        setShowPasswordSection(false);
      } else {
        setPasswordErrors({
          form: response.data?.message || 'Failed to update password'
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password';
      if (msg.toLowerCase().includes('current password')) {
        setPasswordErrors({ currentPassword: msg });
      } else if (msg.toLowerCase().includes('match')) {
        setPasswordErrors({ confirmPassword: msg });
      } else if (msg.toLowerCase().includes('different')) {
        setPasswordErrors({ newPassword: msg });
      } else {
        setPasswordErrors({ form: msg });
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Handle File Selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const fileName = file.name.toLowerCase();
    const hasValidExt =
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.webp');

    if (!allowedTypes.includes(file.type) || !hasValidExt) {
      setPhotoError('Please select a valid JPEG, PNG, or WebP image');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      setPhotoError('Image file size must be less than 2MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.success && response.data?.data) {
        const newAvatar = response.data.data.avatar;
        setProfile((prev) => ({ ...prev, avatar: newAvatar, avatarUrl: newAvatar }));
        updateUser({ avatar: newAvatar });
        setToastMessage('Photo updated');
      } else {
        setPhotoError(response.data?.message || 'Failed to upload photo');
      }
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      setPhotoPreview(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Remove Photo Confirmation
  const handleConfirmRemovePhoto = async () => {
    setRemovingPhoto(true);
    setPhotoError('');

    try {
      const response = await api.delete('/profile/avatar');
      if (response.data?.success) {
        setProfile((prev) => ({ ...prev, avatar: null, avatarUrl: null }));
        updateUser({ avatar: null });
        setShowDeleteConfirm(false);
        setToastMessage('Photo removed');
      } else {
        setPhotoError(response.data?.message || 'Failed to remove photo');
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Failed to remove photo');
      setShowDeleteConfirm(false);
    } finally {
      setRemovingPhoto(false);
    }
  };

  const isNameChanged = name.trim() !== (profile?.name || '').trim();
  const currentAvatarSrc = photoPreview || getAvatarUrl(profile?.avatar);

  const formattedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState
          title="Unable to load profile"
          message={fetchError}
          onRetry={fetchProfile}
          retryText="Retry"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50">
          <Toast
            type="success"
            title="Success"
            message={toastMessage}
            onClose={() => setToastMessage('')}
          />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">Profile</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage your personal account settings, profile photo, and credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader title="Profile photo" />
            <CardContent className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {currentAvatarSrc ? (
                  <img
                    src={currentAvatarSrc}
                    alt={profile?.name || 'User avatar'}
                    className="w-24 h-24 rounded-full object-cover border-2 border-border shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-soft text-primary font-bold text-2xl flex items-center justify-center border-2 border-primary/20 shadow-sm">
                    {getInitials(profile?.name)}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-xs font-medium backdrop-blur-xs">
                    Uploading...
                  </div>
                )}
              </div>

              <div className="w-full space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  aria-label="Upload profile photo"
                />

                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploadingPhoto}
                    disabled={uploadingPhoto || removingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-1.5" aria-hidden="true" />
                    <span>Upload photo</span>
                  </Button>

                  {profile?.avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploadingPhoto || removingPhoto}
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full text-danger hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
                      <span>Remove photo</span>
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-text-muted">
                  Accepts JPEG, PNG, or WebP. Maximum file size 2MB.
                </p>

                {photoError && (
                  <p className="text-xs text-danger font-medium mt-1 text-center" role="alert">
                    {photoError}
                  </p>
                )}
              </div>

              <div className="w-full border-t border-border pt-4 space-y-2 text-left">
                <div>
                  <p className="text-xs font-medium text-text-muted">Full Name</p>
                  <p className="text-sm font-semibold text-text truncate">{profile?.name}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-text-muted">Email Address</p>
                  <p className="text-sm text-text-muted truncate">{profile?.email}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Account Role</p>
                  <Badge variant={profile?.role === 'admin' ? 'admin' : 'neutral'}>
                    {profile?.role === 'admin' ? 'Administrator' : 'Standard User'}
                  </Badge>
                </div>

                <div className="pt-1 flex items-center gap-1.5 text-xs text-text-muted">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>Member since {formattedDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader
              title="Personal information"
              description="Update your personal display name."
            />
            <CardContent>
              <form onSubmit={handleSaveName} className="space-y-4">
                <Input
                  id="profile-name"
                  name="name"
                  label="Name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError('');
                  }}
                  error={nameError}
                  required
                  placeholder="Enter your name"
                />

                <Input
                  id="profile-email"
                  name="email"
                  label="Email"
                  value={profile?.email || ''}
                  disabled
                  helperText="Email cannot be changed"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordSection((prev) => !prev)}
                  >
                    Change password
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!isNameChanged || savingName}
                    loading={savingName}
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {showPasswordSection && (
            <Card className="animate-in fade-in slide-in-from-top-2 duration-200">
              <CardHeader
                title="Change password"
                description="Ensure your account is using a secure, unique password."
              />
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {passwordErrors.form && (
                    <div
                      role="alert"
                      className="p-3 rounded-lg bg-danger-soft text-danger text-xs font-medium border border-danger/20"
                    >
                      {passwordErrors.form}
                    </div>
                  )}

                  <Input
                    id="current-password"
                    name="currentPassword"
                    label="Current password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordErrors.currentPassword) {
                        setPasswordErrors((prev) => ({ ...prev, currentPassword: '' }));
                      }
                    }}
                    error={passwordErrors.currentPassword}
                    required
                    placeholder="Enter current password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        aria-label={
                          showCurrentPassword ? 'Hide current password' : 'Show current password'
                        }
                        className="text-text-muted hover:text-text transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    }
                  />

                  <Input
                    id="new-password"
                    name="newPassword"
                    label="New password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordErrors.newPassword) {
                        setPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
                      }
                    }}
                    error={passwordErrors.newPassword}
                    helperText="Must be at least 8 characters long and different from current password"
                    required
                    placeholder="Enter new password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                        className="text-text-muted hover:text-text transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    }
                  />

                  <Input
                    id="confirm-password"
                    name="confirmPassword"
                    label="Confirm new password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    error={passwordErrors.confirmPassword}
                    required
                    placeholder="Re-enter new password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                        className="text-text-muted hover:text-text transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    }
                  />

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={updatingPassword}
                      loading={updatingPassword}
                    >
                      Update password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmRemovePhoto}
        title="Remove photo"
        message="Are you sure you want to remove your profile photo? This action cannot be undone."
        confirmText="Remove photo"
        cancelText="Cancel"
        isDestructive
        loading={removingPhoto}
      />
    </div>
  );
};

export default ProfilePage;
