import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Users, Mail, Phone, MapPin, Key, Hash, User, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateUserIdCode } from '../lib/auth';
import { Button } from './Button';
import { sendEmail } from '../lib/sendEmail';

interface CreateUserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EAST_AFRICAN_COUNTRIES = ['Rwanda', 'Kenya', 'Uganda', 'Tanzania', 'Burundi', 'South Sudan'];
const RWANDA_PROVINCES = ['Kigali', 'Eastern', 'Northern', 'Southern', 'Western'];

const SPECIALTIES = {
  partner: ['Nightlife', 'History', 'Nature', 'Animals', 'Plants', 'Architecture', 'Sports', 'Culture', 'Arts', 'Food & Cuisine'],
  institution: ['National Park', 'Wildlife Reserve', 'Historic Museum', 'Nature Museum', 'Art Gallery', 'Cultural Center', 'Botanical Garden', 'Zoo', 'Aquarium', 'Science Center', 'Memorial Site', 'Archaeological Site'],
  government: ['Tourism', 'Wildlife', 'Culture', 'Heritage', 'Development']
};

const AVAILABLE_TAGS = {
  partner: ['Adventure Tourism', 'Cultural Experiences', 'Wildlife Tours', 'Nature Expeditions', 'Urban Exploration', 'Food & Cuisine', 'Sports & Activities', 'Arts & Crafts', 'Nightlife', 'Historical Sites', 'Eco-Tourism', 'Luxury Travel'],
  institution: ['Educational Programs', 'Conservation Focus', 'Research Facilities', 'Visitor Center', 'Guided Tours', 'Interactive Exhibits', 'Family-Friendly', 'School Programs', 'Special Events', 'Accessibility Features', 'Gift Shop', 'Dining Available'],
  government: ['Policy Development', 'Data Analytics', 'Tourism Strategy', 'Economic Development', 'Cultural Preservation', 'Infrastructure Planning', 'Marketing & Promotion', 'Stakeholder Engagement', 'Regulatory Oversight', 'Regional Development', 'Sustainability Initiatives', 'Investment Attraction']
};

export default function CreateUserDrawer({ isOpen, onClose, onSuccess }: CreateUserDrawerProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    portal_type: '',
    name: '',
    email: '',
    phone: '',
    contact_person: '',
    country: 'Rwanda',
    province: '',
    specific_location: '',
    specialty: '',
    tags: [] as string[],
    password: '',
    user_id_code: ''
  });


  const handleGenerateCode = async () => {
    if (formData.portal_type) {
      const code = await generateUserIdCode(formData.portal_type);
      setFormData({ ...formData, user_id_code: code });
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleToggleTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    } else {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async () => {
    if (!formData.user_id_code || !formData.password) {
      alert('Please generate credentials first');
      return;
    }

    setLoading(true);

    try {
      const passwordHash = await hashPassword(formData.password);

      const { error } = await supabase
        .from('portal_users')
        .insert({
          portal_type: formData.portal_type,
          email: formData.email,
          password_hash: passwordHash,
          user_id_code: formData.user_id_code,
          name: formData.name || null,
          phone: formData.phone || null,
          contact_person: formData.contact_person || null,
          country: formData.country || null,
          province: formData.province || null,
          specific_location: formData.specific_location || null,
          specialty: formData.specialty || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          is_active: true
        });

      if (error) throw error;

      sendEmail({
        template: 'account_created',
        recipient_email: formData.email,
        recipient_name: formData.name || formData.contact_person || '',
        data: {
          portal_type: formData.portal_type,
          user_id_code: formData.user_id_code,
          email: formData.email,
          password: formData.password,
          name: formData.name || formData.contact_person || '',
        },
      });

      alert(`User created successfully!\n\nUser ID: ${formData.user_id_code}\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nPlease save these credentials.`);

      handleClose();
      onSuccess();
    } catch (error: any) {
      alert('Error creating user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      portal_type: '',
      name: '',
      email: '',
      phone: '',
      contact_person: '',
      country: 'Rwanda',
      province: '',
      specific_location: '',
      specialty: '',
      tags: [],
      password: '',
      user_id_code: ''
    });
    setCurrentStep(1);
    onClose();
  };

  const canProceedToStep2 = formData.portal_type !== '';
  const canProceedToStep3 = formData.email !== '' && (formData.portal_type !== 'institution' || formData.name !== '');

  const steps = [
    { number: 1, title: 'Portal Type' },
    { number: 2, title: 'Basic Info' },
    { number: 3, title: 'Location' },
    { number: 4, title: 'Details' },
    { number: 5, title: 'Credentials' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose}></div>

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Create New User</h2>
            <p className="text-sm text-neutral-600 mt-0.5">Step {currentStep} of 5</p>
          </div>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 bg-neutral-50 border-b border-neutral-200 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center gap-2 ${
                currentStep === step.number ? 'text-amber-600' :
                currentStep > step.number ? 'text-green-600' : 'text-neutral-400'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step.number ? 'bg-amber-100' :
                  currentStep > step.number ? 'bg-green-100' : 'bg-neutral-200'
                }`}>
                  {step.number}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-neutral-300 mx-2" />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Select Portal Type</h3>
                <p className="text-sm text-neutral-600 mb-6">Choose the type of user account to create</p>
              </div>

              <div className="grid gap-3">
                {[
                  { value: 'partner', label: 'Partner', desc: 'Tour operators — listings, hosts, journeys', icon: Users, color: 'emerald' },
                  { value: 'institution', label: 'Attraction', desc: 'Parks, museums & sites — programs & guides', icon: Building2, color: 'amber' }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, portal_type: type.value, specialty: '', user_id_code: '' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.portal_type === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50`
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${type.color}-100 flex items-center justify-center`}>
                        <type.icon className={`w-5 h-5 text-${type.color}-600`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-neutral-900">{type.label}</div>
                        <div className="text-sm text-neutral-600">{type.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Basic Information</h3>
                <p className="text-sm text-neutral-600 mb-6">Enter the user's contact details</p>
              </div>

              {(formData.portal_type === 'partner' || formData.portal_type === 'institution') && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {formData.portal_type === 'institution' ? 'Attraction Name' : 'Name'}
                    {formData.portal_type === 'institution' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder={formData.portal_type === 'institution' ? 'Enter attraction name' : 'Enter name'}
                      required={formData.portal_type === 'institution'}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="+250 XXX XXX XXX"
                  />
                </div>
              </div>

              {formData.portal_type === 'institution' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Contact Person Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Enter contact person name"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Location Details</h3>
                <p className="text-sm text-neutral-600 mb-6">Where is this user located?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  {EAST_AFRICAN_COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Province
                </label>
                <select
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select Province</option>
                  {RWANDA_PROVINCES.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Specific Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={formData.specific_location}
                    onChange={(e) => setFormData({ ...formData, specific_location: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Street, building, district"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Additional Details</h3>
                <p className="text-sm text-neutral-600 mb-6">Specialty and categorization</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Specialty
                </label>
                <select
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select Specialty</option>
                  {SPECIALTIES[formData.portal_type as keyof typeof SPECIALTIES]?.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Tags
                </label>
                <p className="text-xs text-neutral-600 mb-3">Select all relevant tags that apply</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS[formData.portal_type as keyof typeof AVAILABLE_TAGS]?.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full border-2 transition-all ${
                        formData.tags.includes(tag)
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-neutral-700 border-neutral-300 hover:border-amber-400'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {formData.tags.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-900 mb-2">Selected tags ({formData.tags.length}):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Generate Credentials</h3>
                <p className="text-sm text-neutral-600 mb-6">Create login credentials for this user</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  User ID Code <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={formData.user_id_code}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-900 font-mono"
                      placeholder="Click generate"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleGenerateCode}
                    variant="secondary"
                  >
                    Generate
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                      placeholder="Generate or enter password"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleGeneratePassword}
                    variant="secondary"
                  >
                    Generate
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900 mb-2">Important</p>
                <p className="text-sm text-amber-800">
                  Make sure to save these credentials. They will be shown once more after user creation.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            )}

            {currentStep < 5 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 1 && !canProceedToStep2) ||
                  (currentStep === 2 && !canProceedToStep3)
                }
                className="flex-1"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={loading || !formData.user_id_code || !formData.password}
                className="flex-1"
              >
                {loading ? 'Creating User...' : 'Create User'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
