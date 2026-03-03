import React, { useState } from 'react';

/**
 * Amendment Modal for Signed Forms
 * 
 * Compliant with TJC/JCAHO requirements:
 * - Captures amendment reason
 * - Tracks who requested amendment
 * - Maintains audit trail
 */
export default function AmendmentModal({ isOpen, onClose, onSubmit, formType }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the amendment.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      setReason('');
      onClose();
    } catch (error) {
      console.error('Amendment request failed:', error);
      alert('Failed to request amendment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Request Amendment</h2>
            <p className="text-sm text-gray-600 mt-1">
              This {formType} is signed and locked. To make changes, you must provide a reason for the amendment.
            </p>
          </div>

          {/* Warning Box */}
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900">Important Notes:</h3>
                <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                  <li>The original signed version will be preserved in the document history</li>
                  <li>Your amendment reason will be recorded in the audit trail</li>
                  <li>All changes will be tracked and attributed to you</li>
                  <li>The amended version will be marked as "Amended" until re-signed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason for Amendment <span className="text-red-600">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Incorrect medication dosage documented, need to update allergy information, etc."
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about what needs to be corrected or updated.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold disabled:bg-amber-300"
            >
              {submitting ? 'Requesting...' : 'Request Amendment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
