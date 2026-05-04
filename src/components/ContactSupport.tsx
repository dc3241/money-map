import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';

export default function ContactSupport() {
  const { user } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in both subject and message fields');
      return;
    }

    if (!user || !user.email) {
      setError('You must be logged in to submit a support ticket');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      await addDoc(collection(db, 'supportTickets'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || undefined,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: [],
      });

      setSuccess(true);
      setSubject('');
      setMessage('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error('Error submitting support ticket:', err);
      setError('Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-surface-2 border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-0 focus:outline-none transition-all';

  return (
    <div className="bg-surface-1 rounded-xl border border-border-subtle p-6">
      <h3 className="text-xl font-semibold text-text-primary mb-6">Contact Support</h3>
      
      <p className="text-text-secondary mb-6">
        Have a question or need help? Send us a message and we'll get back to you as soon as possible.
      </p>

      {error && (
        <div className="mb-6 rounded-xl border border-spending-red/40 bg-spending-red-dim px-4 py-3 text-sm text-text-primary">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-income-green/40 bg-income-green-dim px-4 py-3 text-sm text-income-green">
          Your support ticket has been submitted successfully! We'll get back to you soon.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
            placeholder="Brief description of your issue or question"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className={`${inputClass} resize-none`}
            placeholder="Please provide details about your issue or question..."
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
