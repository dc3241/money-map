import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { format } from 'date-fns';
import ContactSupport from './ContactSupport';

export default function Profile() {
  const { user, updateProfile, updatePassword, error } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');
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

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Profile Settings</h1>
          <p className="text-slate-600">Manage your account information and preferences</p>
        </div>

        {/* Account Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {user?.displayName || 'No name set'}
              </h2>
              <p className="text-slate-600">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <p className="text-sm text-slate-500 mb-1">Member Since</p>
              <p className="font-semibold text-slate-900">{memberSince}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Account Type</p>
              <p className="font-semibold text-slate-900">
                {isGoogleUser ? 'Google Account' : 'Email & Password'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Email Status</p>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {emailVerified ? 'Verified' : 'Not Verified'}
                </span>
                {!emailVerified && (
                  <span className="text-xs text-slate-500">(Check your inbox)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeSection === 'profile'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Profile Information
          </button>
          {!isGoogleUser && (
            <button
              onClick={() => setActiveSection('password')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeSection === 'password'
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Change Password
            </button>
          )}
          <button
            onClick={() => setActiveSection('support')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeSection === 'support'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contact Support
          </button>
        </div>

        {/* Success/Error Messages */}
        {displayError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {displayError}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Update Profile</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
              >
                Save Changes
              </button>
            </form>
          </div>
        )}

        {/* Password Section */}
        {activeSection === 'password' && !isGoogleUser && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Change Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all"
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
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Google Account</p>
            <p className="text-sm mt-1">
              You signed in with Google. To change your password, please update it in your Google Account settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

