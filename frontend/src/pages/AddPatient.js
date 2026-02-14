import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function AddPatient() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Required Demographics (ONC)
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    race: '',
    ethnicity: '',
    preferred_language: 'en',
    
    // Contact Information
    phone_primary: '',
    phone_secondary: '',
    email: '',
    
    // Address
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'TX',
    zip_code: '',
    
    // Medical Record
    medical_record_number: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    
    // Insurance (optional for cash-pay but good to have)
    insurance_primary_company: '',
    insurance_primary_policy_number: '',
    insurance_primary_group_number: '',
    insurance_primary_subscriber_name: '',
    insurance_primary_subscriber_dob: '',

    insurance_secondary_company: '',
    insurance_secondary_policy_number: '',
    insurance_secondary_group_number: '',
    
    // Additional ONC fields
    sexual_orientation: '',
    gender_identity: '',
    
    // SSN (encrypted in backend)
    ssn: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

try {
  const payload = {
    ...formData,
    insurance_primary_subscriber_dob:
      formData.insurance_primary_subscriber_dob || null,
  };

  await api.post('/patients/', payload);
  navigate('/patients');
} catch (err) {
  console.error('Error adding patient:', err);
  setError(
    err.response?.data
      ? JSON.stringify(err.response.data)
      : 'Failed to add patient.'
  );
  setLoading(false);
}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Patient</h1>
            <p className="text-sm text-gray-600">Enter patient demographic information</p>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            ← Back to Patients
          </button>
        </div>
      </header>

      {/* Main Form */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Section 1: Basic Demographics */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Medical Record Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Record Number (MRN) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="medical_record_number"
                  value={formData.medical_record_number}
                  onChange={handleChange}
                  required
                  placeholder="MRN-"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sex/Gender (Administrative) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sex (Administrative) <span className="text-red-600">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                  <option value="U">Unknown</option>
                </select>
              </div>

              {/* SSN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Social Security Number
                </label>
                <input
                  type="text"
                  name="ssn"
                  value={formData.ssn}
                  onChange={handleChange}
                  placeholder="###-##-####"
                  maxLength="11"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Will be encrypted in database</p>
              </div>
            </div>
          </div>

          {/* Section 2: ONC Required Demographics */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Demographics (ONC Required)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Race */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Race <span className="text-red-600">*</span>
                </label>
                <select
                  name="race"
                  value={formData.race}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="american_indian">American Indian or Alaska Native</option>
                  <option value="asian">Asian</option>
                  <option value="black">Black or African American</option>
                  <option value="pacific_islander">Native Hawaiian or Other Pacific Islander</option>
                  <option value="white">White</option>
                  <option value="other">Other</option>
                  <option value="declined">Patient Declined</option>
                </select>
              </div>

              {/* Ethnicity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ethnicity <span className="text-red-600">*</span>
                </label>
                <select
                  name="ethnicity"
                  value={formData.ethnicity}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="hispanic">Hispanic or Latino</option>
                  <option value="not_hispanic">Not Hispanic or Latino</option>
                  <option value="declined">Patient Declined</option>
                </select>
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language <span className="text-red-600">*</span>
                </label>
                <select
                  name="preferred_language"
                  value={formData.preferred_language}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Vietnamese">Vietnamese</option>
                  <option value="Korean">Korean</option>
                  <option value="Tagalog">Tagalog</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Arabic">Arabic</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Sexual Orientation (ONC Recommended) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sexual Orientation (Optional)
                </label>
                <select
                  name="sexual_orientation"
                  value={formData.sexual_orientation}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Prefer not to answer</option>
                  <option value="straight">Straight or heterosexual</option>
                  <option value="gay">Lesbian, gay, or homosexual</option>
                  <option value="bisexual">Bisexual</option>
                  <option value="other">Something else</option>
                  <option value="unknown">Don't know</option>
                </select>
              </div>

              {/* Gender Identity (ONC Recommended) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender Identity (Optional)
                </label>
                <select
                  name="gender_identity"
                  value={formData.gender_identity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Prefer not to answer</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="transgender_male">Transgender Male/Trans Man/Female-to-Male</option>
                  <option value="transgender_female">Transgender Female/Trans Woman/Male-to-Female</option>
                  <option value="genderqueer">Genderqueer</option>
                  <option value="other">Additional gender category or other</option>
                  <option value="decline">Choose not to disclose</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Contact Information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_primary"
                  value={formData.phone_primary}
                  onChange={handleChange}
                  required
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Secondary Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Phone
                </label>
                <input
                  type="tel"
                  name="phone_secondary"
                  value={formData.phone_secondary}
                  onChange={handleChange}
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="patient@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Address Line 1 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 1 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  required
                  placeholder="123 Main Street"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  placeholder="Apt, Suite, Unit, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State <span className="text-red-600">*</span>
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TX">Texas</option>
                  {/* Add other states as needed */}
                </select>
              </div>

              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  required
                  maxLength="10"
                  placeholder="12345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Emergency Contact */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Emergency Contact Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship <span className="text-red-600">*</span>
                </label>
                <select
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Emergency Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  required
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Insurance (Optional for cash-pay) */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance Information (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Insurance Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  name="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={handleChange}
                  placeholder="e.g., Blue Cross Blue Shield"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Policy Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Number
                </label>
                <input
                  type="text"
                  name="insurance_policy_number"
                  value={formData.insurance_policy_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Group Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Number
                </label>
                <input
                  type="text"
                  name="insurance_group_number"
                  value={formData.insurance_group_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 flex justify-between items-center rounded-b-lg">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300"
            >
              {loading ? 'Saving...' : 'Add Patient'}
            </button>
          </div>
        </form>

        {/* Compliance Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>🔒 Compliance Note:</strong> All data is encrypted in transit and at rest. 
            SSN will be encrypted using Fernet encryption. All form submissions are logged for HIPAA audit compliance.
          </p>
        </div>
      </main>
    </div>
  );
}

export default AddPatient;
