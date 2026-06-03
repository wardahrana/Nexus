import React, { useState, useEffect, useRef } from 'react';
import {
  User, Building2, MapPin, Globe, DollarSign, Briefcase,
  Edit3, Save, X, Camera, ChevronRight, Linkedin, Twitter,
  Github, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
}

interface EntrepreneurProfileData {
  bio?: string;
  avatar?: string;
  location?: string;
  startupName?: string;
  industry?: string;
  fundingStage?: string;
  fundingNeeded?: string | number;
  website?: string;
  startupHistory?: string | string[];
  preferences?: string | { lookingFor?: string; preferredIndustries?: string[] };
  socialLinks?: SocialLinks;
}

type TabId = 'overview' | 'startup' | 'edit';

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium animate-fade-in
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
};

const Field: React.FC<{ label: string; value?: string | number; icon?: React.ReactNode; placeholder?: string }> = ({
  label, value, icon, placeholder = 'Not set'
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-2 text-gray-800">
      {icon && <span className="text-primary-500">{icon}</span>}
      <span className={value ? 'text-gray-900' : 'text-gray-400 italic'}>{value || placeholder}</span>
    </div>
  </div>
);

const FUNDING_STAGES = [
  { label: 'Idea', value: 'idea' },
  { label: 'Pre-seed', value: 'pre-seed' },
  { label: 'Seed', value: 'seed' },
  { label: 'Series A', value: 'series-a' },
  { label: 'Series B', value: 'series-b' },
  { label: 'Growth', value: 'growth' },
];

const INDUSTRIES = ['FinTech', 'HealthTech', 'EdTech', 'SaaS', 'E-commerce', 'AI/ML', 'CleanTech', 'AgriTech', 'Other'];

export const EntrepreneurProfilePage: React.FC = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [profile, setProfile] = useState<EntrepreneurProfileData>({});
  const [form, setForm] = useState<EntrepreneurProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('http://localhost:5000/api/profile/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(data.data);
        setForm(data.data);
        if (data.data.avatar) setAvatarPreview(data.data.avatar);
      } catch {
        setProfile({});
        setForm({});
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setForm(prev => ({ ...prev, avatar: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (field: keyof EntrepreneurProfileData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform: keyof SocialLinks, value: string) => {
    setForm(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        fundingNeeded: Number(form.fundingNeeded) || 0,
      };
      const { data } = await axios.put('http://localhost:5000/api/profile/me', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(data.data);
      setForm(data.data);
      setToast({ message: 'Profile saved successfully!', type: 'success' });
      setActiveTab('overview');
    } catch {
      setToast({ message: 'Failed to save. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(profile);
    setAvatarPreview(profile.avatar || null);
    setActiveTab('overview');
  };

  const getPreferencesString = (prefs: EntrepreneurProfileData['preferences']): string => {
    if (!prefs) return '';
    if (typeof prefs === 'string') return prefs;
    return prefs.lookingFor || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary-600" size={36} />
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'startup', label: 'Startup Details' },
    { id: 'edit', label: 'Edit Profile' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
            <div className="relative w-fit">
              <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-gray-100">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-50">
                    <User size={36} className="text-primary-400" />
                  </div>
                )}
              </div>
              {activeTab === 'edit' && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow hover:bg-primary-700 transition"
                  >
                    <Camera size={14} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>

            <div className="flex-1 sm:ml-4 sm:mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <Building2 size={14} />
                {profile.startupName ? `Founder at ${profile.startupName}` : 'Entrepreneur'}
                {profile.location && (
                  <span className="flex items-center gap-1 ml-3">
                    <MapPin size={13} /> {profile.location}
                  </span>
                )}
              </p>
            </div>

            {activeTab !== 'edit' && (
              <button
                onClick={() => setActiveTab('edit')}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition shadow"
              >
                <Edit3 size={15} /> Edit Profile
              </button>
            )}
          </div>

          <div className="flex gap-1 mt-6 bg-gray-50 rounded-xl p-1 w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">About</h2>
            <p className={profile.bio ? 'text-gray-700 leading-relaxed' : 'text-gray-400 italic'}>
              {profile.bio || 'No bio added yet. Click Edit Profile to add one.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Basic Info</h2>
            <Field label="Location" value={profile.location} icon={<MapPin size={15} />} />
            <Field label="Industry" value={profile.industry} icon={<Briefcase size={15} />} />
            <Field label="Website" value={profile.website} icon={<Globe size={15} />} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Funding</h2>
            <Field label="Funding Stage" value={profile.fundingStage} icon={<ChevronRight size={15} />} />
            <Field label="Funding Needed" value={profile.fundingNeeded} icon={<DollarSign size={15} />} />
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Social Links</h2>
            <div className="flex flex-wrap gap-3">
              {profile.socialLinks?.linkedin ? (
                <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition">
                  <Linkedin size={16} /> LinkedIn
                </a>
              ) : null}
              {profile.socialLinks?.twitter ? (
                <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-xl text-sm font-medium hover:bg-sky-100 transition">
                  <Twitter size={16} /> Twitter
                </a>
              ) : null}
              {profile.socialLinks?.github ? (
                <a href={profile.socialLinks.github} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
                  <Github size={16} /> GitHub
                </a>
              ) : null}
              {!profile.socialLinks?.linkedin && !profile.socialLinks?.twitter && !profile.socialLinks?.github && (
                <p className="text-gray-400 italic text-sm">No social links added yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STARTUP DETAILS TAB */}
      {activeTab === 'startup' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Startup Info</h2>
            <Field label="Startup Name" value={profile.startupName} icon={<Building2 size={15} />} />
            <Field label="Industry" value={profile.industry} icon={<Briefcase size={15} />} />
            <Field label="Funding Stage" value={profile.fundingStage} />
            <Field label="Funding Needed" value={profile.fundingNeeded} icon={<DollarSign size={15} />} />
            <Field label="Website" value={profile.website} icon={<Globe size={15} />} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Startup History</h2>
            <p className={Array.isArray(profile.startupHistory) && profile.startupHistory.length
              ? 'text-gray-700 leading-relaxed' : 'text-gray-400 italic text-sm'}>
              {Array.isArray(profile.startupHistory)
                ? profile.startupHistory.join(', ')
                : profile.startupHistory || 'No startup history added yet.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Preferences</h2>
            <p className={getPreferencesString(profile.preferences) ? 'text-gray-700 leading-relaxed' : 'text-gray-400 italic text-sm'}>
              {getPreferencesString(profile.preferences) || 'No preferences added yet.'}
            </p>
          </div>
        </div>
      )}

      {/* EDIT TAB */}
      {activeTab === 'edit' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Personal Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                <textarea
                  rows={4}
                  value={form.bio || ''}
                  onChange={e => handleChange('bio', e.target.value)}
                  placeholder="Tell investors about yourself and your vision..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <input
                  type="text"
                  value={form.location || ''}
                  onChange={e => handleChange('location', e.target.value)}
                  placeholder="e.g. Karachi, Pakistan"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website || ''}
                  onChange={e => handleChange('website', e.target.value)}
                  placeholder="https://yourstartup.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Startup Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Startup Name</label>
                <input
                  type="text"
                  value={form.startupName || ''}
                  onChange={e => handleChange('startupName', e.target.value)}
                  placeholder="e.g. NexusPay"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
                <select
                  value={form.industry || ''}
                  onChange={e => handleChange('industry', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Funding Stage</label>
                <select
                  value={form.fundingStage || ''}
                  onChange={e => handleChange('fundingStage', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  <option value="">Select stage</option>
                  {FUNDING_STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Funding Needed</label>
                <input
                  type="text"
                  value={form.fundingNeeded || ''}
                  onChange={e => handleChange('fundingNeeded', e.target.value)}
                  placeholder="e.g. $500K"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Startup History</label>
                <textarea
                  rows={3}
                  value={Array.isArray(form.startupHistory) ? form.startupHistory.join(', ') : form.startupHistory || ''}
                  onChange={e => handleChange('startupHistory', e.target.value)}
                  placeholder="Brief history of your startup journey..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferences</label>
                <textarea
                  rows={2}
                  value={getPreferencesString(form.preferences)}
                  onChange={e => handleChange('preferences', e.target.value)}
                  placeholder="What kind of investors or partnerships are you looking for?"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Social Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Linkedin size={15} className="text-blue-600" /> LinkedIn
                </label>
                <input
                  type="url"
                  value={form.socialLinks?.linkedin || ''}
                  onChange={e => handleSocialChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Twitter size={15} className="text-sky-500" /> Twitter
                </label>
                <input
                  type="url"
                  value={form.socialLinks?.twitter || ''}
                  onChange={e => handleSocialChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                  <Github size={15} className="text-gray-700" /> GitHub
                </label>
                <input
                  type="url"
                  value={form.socialLinks?.github || ''}
                  onChange={e => handleSocialChange('github', e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition shadow disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};