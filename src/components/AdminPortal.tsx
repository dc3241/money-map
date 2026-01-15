import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { SupportTicket, SupportTicketStatus } from '../types';
import { format } from 'date-fns';

export default function AdminPortal() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SupportTicket[];
      
      setTickets(ticketsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === statusFilter);

  const handleStatusChange = async (ticketId: string, newStatus: SupportTicketStatus) => {
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error updating ticket status:', err);
      setError('Failed to update ticket status');
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket || !responseMessage.trim()) {
      setError('Please enter a response message');
      return;
    }

    if (!user) {
      setError('You must be logged in to respond');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
      const newResponse = {
        message: responseMessage.trim(),
        isAdmin: true,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(ticketRef, {
        responses: [...selectedTicket.responses, newResponse],
        status: selectedTicket.status === 'open' ? 'in-progress' : selectedTicket.status,
        updatedAt: new Date().toISOString(),
      });

      setResponseMessage('');
      setError('');
    } catch (err: any) {
      console.error('Error submitting response:', err);
      setError('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: SupportTicketStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-amber-100 text-amber-800';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800';
      case 'closed':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const openTicketsCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in-progress').length;

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Portal</h1>
          <p className="text-slate-600">Manage support tickets and respond to user inquiries</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Total Tickets</p>
            <p className="text-2xl font-bold text-slate-900">{tickets.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Open Tickets</p>
            <p className="text-2xl font-bold text-blue-600">{openTicketsCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-amber-600">{inProgressCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'open'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter('in-progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'in-progress'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'closed'
                  ? 'bg-slate-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Tickets</h2>
            </div>
            <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No tickets found
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 truncate flex-1">
                        {ticket.subject}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ml-2 ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {ticket.message}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{ticket.userEmail}</span>
                      <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    {ticket.responses.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        {ticket.responses.length} response{ticket.responses.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Ticket Detail */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedTicket.subject}</h2>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as SupportTicketStatus)}
                      className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{selectedTicket.userEmail}</span>
                    <span>•</span>
                    <span>{format(new Date(selectedTicket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>

                <div className="p-4 max-h-[400px] overflow-y-auto">
                  {/* Original Message */}
                  <div className="mb-6">
                    <div className="bg-slate-50 rounded-lg p-4 mb-3">
                      <p className="text-slate-900 whitespace-pre-wrap">{selectedTicket.message}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {selectedTicket.userName || selectedTicket.userEmail} • {format(new Date(selectedTicket.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>

                  {/* Responses */}
                  {selectedTicket.responses.map((response, index) => (
                    <div key={index} className={`mb-6 ${response.isAdmin ? 'ml-8' : ''}`}>
                      <div className={`rounded-lg p-4 mb-3 ${response.isAdmin ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <p className="text-slate-900 whitespace-pre-wrap">{response.message}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {response.isAdmin ? 'Admin' : selectedTicket.userName || selectedTicket.userEmail} • {format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ))}

                  {/* Response Form */}
                  <form onSubmit={handleSubmitResponse} className="mt-6">
                    <textarea
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none resize-none mb-3"
                      placeholder="Type your response here..."
                      disabled={isSubmitting}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !responseMessage.trim()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Response'}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Select a ticket to view details and respond
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
