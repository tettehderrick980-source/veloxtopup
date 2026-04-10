import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import { UserIcon, KeyIcon, BellIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import PWADiagnostics from '../components/PWADiagnostics';

export default function ProfilePage() {
  const { user, userProfile, signOut } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (location.pathname === '/settings') {
      setActiveTab('security');
    }
  }, [location.pathname]);
  
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    marketing: false
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await db.updateUserProfile(user.id, {
        name: name,
        phone: phone
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await user.update({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = (type) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await db.updateUserProfile(user.id, {
        notification_preferences: notifications
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Notification preferences saved!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: KeyIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'pwa', label: 'PWA Status', icon: DevicePhoneMobileIcon }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-48">
          <div className="card">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white'
                      : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-6">Profile Information</h2>

              {message.text && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-900/50 border border-green-700 text-green-300' 
                    : 'bg-red-900/50 border border-red-700 text-red-300'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-dark-700">
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{user?.email}</p>
                  <p className="text-dark-400 text-sm">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input-field w-full bg-dark-800 opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0234567890"
                    className="input-field w-full"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-6">Change Password</h2>

              {message.text && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                  message.type === 'success' 
                    ? 'bg-green-900/50 border border-green-700 text-green-300' 
                    : 'bg-red-900/50 border border-red-700 text-red-300'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field w-full"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-dark-700">
                <h3 className="text-md font-medium text-white mb-4">Sign Out</h3>
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Email Notifications</p>
                    <p className="text-dark-400 text-sm">Receive transaction updates via email</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationToggle('email')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.email ? 'bg-primary-500' : 'bg-dark-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.email ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">SMS Notifications</p>
                    <p className="text-dark-400 text-sm">Receive transaction updates via SMS</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationToggle('sms')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.sms ? 'bg-primary-500' : 'bg-dark-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.sms ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Marketing Emails</p>
                    <p className="text-dark-400 text-sm">Receive promotional offers and news</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationToggle('marketing')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications.marketing ? 'bg-primary-500' : 'bg-dark-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.marketing ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleSaveNotifications}
                disabled={loading}
                className="btn-primary mt-6 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* PWA Tab */}
          {activeTab === 'pwa' && (
            <div>
              <PWADiagnostics />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
