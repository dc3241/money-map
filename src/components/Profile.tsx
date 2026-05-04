import React, { useState, useEffect } from 'react';
import { deleteUser } from 'firebase/auth';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import ContactSupport from './ContactSupport';
import { disconnectPlaid, deleteUserData } from '../config/firebase';
import { usePlaidAccounts } from '../hooks/usePlaidAccounts';

export default function Profile() {
  const { user, updateProfile, updatePassword, error } = useAuthStore();
  const { accounts: plaidAccounts } = usePlaidAccounts();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
  const [dangerBusy, setDangerBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'support'>('profile');
  
  // Update display name when user changes
  useEffect(() => {
    if (user?.displayName !== displayName) {
      setDisplayName(user?.displayName || '');
    }
  }, [user?.displayName]);
  
  const isGoogleUser = user?.providerData?.[0]?.providerId === 'google.com';
  const memberSince = user?.metadata?.creationTime 
    ? format(new Date(user.metadata.creationTime), 'MMMM d, yyyy')
    : 'Unknown';
  const emailVerified = user?.emailVerified || false;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
    
    try {
      await updateProfile(displayName.trim());
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setLocalError('Failed to update profile');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setLocalError('Please fill in all password fields');
      return;
    }
    
    if (newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match');
      return;
    }
    
    try {
      await updatePassword(newPassword, currentPassword);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to update password');
    }
  };

  const displayError = localError || error;
  const hasPlaidAccounts = plaidAccounts.length > 0;

  const inputClass =
    'w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all';

  const tabClass = (active: boolean) =>
    `px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
      active
        ? 'text-accent border-accent'
        : 'text-text-muted border-transparent hover:text-text-primary'
    }`;

  const handleDisconnectBank = async () => {
    if (!hasPlaidAccounts || dangerBusy) return;
    const confirmed = window.confirm(
      'Disconnect all linked bank accounts? This will stop Plaid sync and remove synced bank data from this app.'
    );
    if (!confirmed) return;

    setLocalError('');
    setSuccess('');
    setDangerBusy(true);
    try {
      await disconnectPlaid({});
      setSuccess('Linked bank accounts disconnected and synced bank data removed.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to disconnect linked bank accounts.');
    } finally {
      setDangerBusy(false);
    }
  };

  const handleDeleteAccountAndData = async () => {
    if (!user || dangerBusy) return;
    const confirmationText = window.prompt(
      'This permanently deletes your account and all app data. Type DELETE to continue.'
    );
    if (confirmationText !== 'DELETE') {
      if (confirmationText !== null) {
        setLocalError('Deletion cancelled. Type DELETE exactly to confirm.');
      }
      return;
    }

    setLocalError('');
    setSuccess('');
    setDangerBusy(true);
    try {
      await deleteUserData({});
      await deleteUser(user);
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === 'auth/requires-recent-login') {
        setLocalError('For security, please log out, sign back in, and try deleting your account again.');
      } else {
        setLocalError(err?.message || 'Failed to delete account and data.');
      }
    } finally {
      setDangerBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-app p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div data-tour="tour-profile-header" className="mb-8">
          <h1 className="text-3xl font-semibold text-text-primary mb-2">Profile Settings</h1>
          <p className="text-text-secondary">Manage your account information and preferences</p>
        </div>

        {/* Account Info Card */}
        <div data-tour="tour-profile-card" className="bg-surface-1 rounded-xl border border-border-subtle p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-accent/25">
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {user?.displayName || 'No name set'}
              </h2>
              <p className="text-text-secondary">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border-subtle">
            <div>
              <p className="text-sm text-text-muted mb-1">Member Since</p>
              <p className="font-semibold text-text-primary">{memberSince}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Account Type</p>
              <p className="font-semibold text-text-primary">
                {isGoogleUser ? 'Google Account' : 'Email & Password'}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">Email Status</p>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${emailVerified ? 'text-income-green' : 'text-amber'}`}>
                  {emailVerified ? 'Verified' : 'Not Verified'}
                </span>
                {!emailVerified && (
                  <span className="text-xs text-text-muted">(Check your inbox)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div data-tour="tour-profile-tabs" className="flex gap-1 mb-6 border-b border-border-subtle">
          <button
            type="button"
            onClick={() => setActiveSection('profile')}
            className={tabClass(activeSection === 'profile')}
          >
            Profile Information
          </button>
          {!isGoogleUser && (
            <button
              type="button"
              onClick={() => setActiveSection('password')}
              className={tabClass(activeSection === 'password')}
            >
              Change Password
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveSection('support')}
            className={tabClass(activeSection === 'support')}
          >
            Contact Support
          </button>
        </div>

        {/* Success/Error Messages */}
        {displayError && (
          <div className="mb-6 rounded-xl border border-spending-red/40 bg-spending-red-dim px-4 py-3 text-sm text-text-primary">
            {displayError}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border border-income-green/40 bg-income-green-dim px-4 py-3 text-sm text-income-green">
            {success}
          </div>
        )}

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="bg-surface-1 rounded-xl border border-border-subtle p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-6">Update Profile</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className={`${inputClass} bg-surface-1 text-text-muted cursor-not-allowed opacity-90`}
                />
                <p className="text-xs text-text-muted mt-2">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Password Section */}
        {activeSection === 'password' && !isGoogleUser && (
          <div className="bg-surface-1 rounded-xl border border-border-subtle p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-6">Change Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all"
              >
                Update Password
              </button>
            </form>
          </div>
        )}

        {/* Support Section */}
        {activeSection === 'support' && (
          <ContactSupport />
        )}

        {/* Google User Message */}
        {isGoogleUser && activeSection !== 'support' && (
          <div className="mt-6 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">Google Account</p>
            <p className="mt-1">
              You signed in with Google. To change your password, please update it in your Google Account settings.
            </p>
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-6 bg-surface-1 rounded-xl border border-spending-red/40 p-6">
          <h3 className="text-xl font-semibold text-text-primary mb-2">Danger Zone</h3>
          <p className="text-sm text-text-muted mb-5">
            Permanent account actions. These cannot be undone.
          </p>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-border-subtle p-4">
              <div>
                <p className="font-medium text-text-primary">Disconnect linked bank accounts</p>
                <p className="text-xs text-text-muted mt-1">
                  Revokes Plaid connection and removes synced bank accounts, transactions, and insights.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDisconnectBank}
                disabled={!hasPlaidAccounts || dangerBusy}
                className="px-4 py-2 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dangerBusy ? 'Working...' : hasPlaidAccounts ? 'Disconnect Banks' : 'No Linked Banks'}
              </button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-spending-red/40 p-4">
              <div>
                <p className="font-medium text-text-primary">Delete account and all app data</p>
                <p className="text-xs text-text-muted mt-1">
                  Permanently removes your budgeting data and account. You will lose access immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccountAndData}
                disabled={dangerBusy}
                className="px-4 py-2 rounded-lg bg-spending-red text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dangerBusy ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
