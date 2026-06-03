import { useState, useEffect ,useCallback} from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  backgroundColor: string;
  borderColor: string;
  description: string;
  meetingLink: string;
  duration: number;
  requester: { _id: string; name: string; email: string; role: string };
  recipient: { _id: string; name: string; email: string; role: string };
  notes: string;
}

interface PendingMeeting {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'; 
  requester: { _id: string; name: string; email: string; role: string };
  meetingLink: string;
  notes: string;
}

interface ScheduleForm {
  title: string;
  description: string;
  recipientId: string;
  recipientName: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDateForInput = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function MeetingPage() {
  const { user } = useAuth();
const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'calendar' | 'pending' | 'schedule'>('calendar');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [pendingMeetings, setPendingMeetings] = useState<PendingMeeting[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    title: '', description: '', recipientId: '', recipientName: '',
    startTime: '', endTime: '', meetingLink: '', notes: '',
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string; open: boolean }>({ id: '', open: false });
  const [rejectReason, setRejectReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<{_id: string, name: string, email: string}[]>([]);
const [selectedRecipient, setSelectedRecipient] = useState<{_id: string, name: string} | null>(null);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

 const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/meetings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCalendarEvents(data.calendarEvents || []);
    } catch {
      showToast('Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

   const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/meetings/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingMeetings(data.meetings || []);
    } catch {
      showToast('Failed to load pending requests', 'error');
    } finally {
      setPendingLoading(false);
    }
  }, []);
  
 useEffect(() => { fetchMeetings(); }, [fetchMeetings]);
useEffect(() => { if (activeTab === 'pending') fetchPending(); }, [activeTab, fetchPending]);

  // ── Accept meeting ──────────────────────────────────────────────────────────
  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/meetings/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Meeting accepted!', 'success');
      fetchPending();
      fetchMeetings();
    } catch (err: unknown) {
  const error = err as { response?: { data?: { message?: string } } };
  showToast(error?.response?.data?.message || 'Failed to accept', 'error');
}
     finally {
      setActionLoading(null);
    }
  };

  // ── Reject meeting ──────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectModal.id) return;
    setActionLoading(rejectModal.id);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/meetings/${rejectModal.id}/reject`,
        { rejectionReason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Meeting rejected', 'success');
      setRejectModal({ id: '', open: false });
      setRejectReason('');
      fetchPending();
      fetchMeetings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error?.response?.data?.message || 'Failed to reject', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Cancel meeting ──────────────────────────────────────────────────────────
  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this meeting?')) return;
    setActionLoading(id);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/meetings/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('Meeting cancelled', 'success');
      setSelectedEvent(null);
      fetchMeetings();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error?.response?.data?.message || 'Failed to cancel', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Schedule meeting ────────────────────────────────────────────────────────
  const handleSchedule = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Clear validation messages
  if (!scheduleForm.title.trim()) {
    showToast('Please enter a meeting title', 'error'); return;
  }
  if (!selectedRecipient?._id) {
    showToast('Please search and select a recipient', 'error'); return;
  }
  if (!scheduleForm.startTime) {
    showToast('Please select a start time', 'error'); return;
  }
  if (!scheduleForm.endTime) {
    showToast('Please select an end time', 'error'); return;
  }
  if (new Date(scheduleForm.endTime) <= new Date(scheduleForm.startTime)) {
    showToast('End time must be after start time', 'error'); return;
  }

  setScheduleLoading(true);
  try {
    const token = localStorage.getItem('token');
    await axios.post('/api/meetings', {
      title: scheduleForm.title.trim(),
      description: scheduleForm.description.trim(),
      recipientId: selectedRecipient._id,          // ← selectedRecipient se, scheduleForm se nahi
      startTime: new Date(scheduleForm.startTime).toISOString(),
      endTime: new Date(scheduleForm.endTime).toISOString(),
      meetingLink: scheduleForm.meetingLink.trim(),
      notes: scheduleForm.notes.trim(),             // optional, empty string fine hai
    }, { headers: { Authorization: `Bearer ${token}` } });

    showToast('Meeting scheduled successfully!', 'success');
    setScheduleForm({ title: '', description: '', recipientId: '', recipientName: '', startTime: '', endTime: '', meetingLink: '', notes: '' });
    setSelectedRecipient(null);
    setSearchQuery('');
    setActiveTab('calendar');
    fetchMeetings();
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string; conflict?: { title?: string } } } };
    const msg = error?.response?.data?.message || 'Failed to schedule meeting';
    const conflict = error?.response?.data?.conflict;
    showToast(conflict ? `${msg}: "${conflict.title}"` : msg, 'error');
  } finally {
    setScheduleLoading(false);
  }
};

  // ── Calendar date click — pre-fill schedule form ────────────────────────────
  const handleDateClick = (info: { date: Date }) => {
    const start = new Date(info.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
    setScheduleForm(prev => ({
      ...prev,
      startTime: formatDateForInput(start),
      endTime: formatDateForInput(end),
    }));
    setActiveTab('schedule');
  };

  // ── Status badge ────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border border-amber-200',
      accepted: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      rejected: 'bg-red-100 text-red-700 border border-red-200',
      cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
    };
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${styles[status] || styles.cancelled}`}>
        {status}
      </span>
    );
  };
const handleSearch = async (q: string) => {
  setSearchQuery(q);
  if (q.length < 2) { setSearchResults([]); return; }
  try {
    const token = localStorage.getItem('token');
    const oppositeRole = user?.role === 'entrepreneur' ? 'investor' : 'entrepreneur';
    const res = await axios.get(`/api/profile/search?role=${oppositeRole}&q=${q}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setSearchResults(res.data.data);
  } catch {
    setSearchResults([]);
  }
};
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Schedule and manage your meetings</p>
          </div>
          <button
            onClick={() => setActiveTab('schedule')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> Schedule Meeting
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-6xl mx-auto flex gap-1">
          {[
            { key: 'calendar', label: 'Calendar', icon: '📅' },
            { key: 'pending', label: `Requests${pendingMeetings.length ? ` (${pendingMeetings.length})` : ''}`, icon: '🔔' },
            { key: 'schedule', label: 'Schedule', icon: '➕' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'calendar' | 'pending' | 'schedule')}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1 — CALENDAR
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Calendar */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              {loading ? (
                <div className="flex items-center justify-center h-96 text-gray-400">Loading calendar...</div>
              ) : (
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                  }}
                  events={calendarEvents}
                  dateClick={handleDateClick}
                  eventClick={(info) => {
                    const ev = calendarEvents.find(e => e.id === info.event.id);
                    if (ev) setSelectedEvent(ev);
                  }}
                  height="auto"
                  eventDisplay="block"
                  dayMaxEvents={3}
                />
              )}
            </div>

            {/* Event Detail Panel */}
            <div className="space-y-4">
              {selectedEvent ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{selectedEvent.title}</h3>
                    <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                  </div>

                  <StatusBadge status={selectedEvent.status} />

                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex gap-2">
                      <span className="text-gray-400">🕐</span>
                      <div>
                        <div>{formatDateTime(selectedEvent.start)}</div>
                        <div className="text-gray-400">to {formatDateTime(selectedEvent.end)}</div>
                        <div className="text-xs text-indigo-600 font-medium mt-0.5">{selectedEvent.duration} min</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-gray-400">👤</span>
                      <div>
                        <div className="font-medium text-gray-700">{selectedEvent.requester.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{selectedEvent.requester.role} → {selectedEvent.recipient.name}</div>
                      </div>
                    </div>

                    {selectedEvent.description && (
                      <div className="flex gap-2">
                        <span className="text-gray-400">📝</span>
                        <span>{selectedEvent.description}</span>
                      </div>
                    )}

                    {selectedEvent.meetingLink && (
                      <div className="flex gap-2">
                        <span className="text-gray-400">🔗</span>
                        <a href={selectedEvent.meetingLink} target="_blank" rel="noreferrer"
                          className="text-indigo-600 hover:underline truncate">Join Meeting</a>
                      </div>
                    )}

                    {selectedEvent.notes && (
                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                        <span className="font-medium block mb-1">Notes</span>
                        {selectedEvent.notes}
                      </div>
                    )}
                  </div>

                  {/* Cancel button — only for pending/accepted */}
                  {['pending', 'accepted'].includes(selectedEvent.status) && (
                    <button
                      onClick={() => handleCancel(selectedEvent.id)}
                      disabled={actionLoading === selectedEvent.id}
                      className="mt-4 w-full py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === selectedEvent.id ? 'Cancelling...' : 'Cancel Meeting'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center text-gray-400 text-sm py-12">
                  <div className="text-4xl mb-3">📅</div>
                  Click a meeting on the calendar to view details
                </div>
              )}

              {/* Legend */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Legend</p>
                <div className="space-y-2">
                  {[
                    { color: 'bg-amber-400', label: 'Pending' },
                    { color: 'bg-emerald-500', label: 'Accepted' },
                    { color: 'bg-red-500', label: 'Rejected' },
                    { color: 'bg-gray-400', label: 'Cancelled' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <span className={`w-3 h-3 rounded-sm ${item.color}`} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2 — PENDING REQUESTS
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'pending' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Incoming Requests
                {pendingMeetings.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">({pendingMeetings.length})</span>
                )}
              </h2>
              <button onClick={fetchPending} className="text-sm text-indigo-600 hover:underline">Refresh</button>
            </div>

            {pendingLoading ? (
              <div className="text-center py-16 text-gray-400">Loading requests...</div>
            ) : pendingMeetings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-16">
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-gray-500 font-medium">No pending requests</p>
                <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMeetings.map(meeting => (
                  <div key={meeting._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900 truncate">{meeting.title}</h3>
                          <StatusBadge status="pending" />
                        </div>

                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1.5">
                            <span>👤</span>
                            <span className="font-medium text-gray-700">{meeting.requester.name}</span>
                            <span className="text-xs capitalize text-gray-400">({meeting.requester.role})</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>🕐</span>
                            {formatDateTime(meeting.startTime)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span>⏱</span>
                            {meeting.duration} min
                          </span>
                        </div>

                        {meeting.description && (
                          <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                        )}

                        {meeting.notes && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                            <span className="font-semibold">Note: </span>{meeting.notes}
                          </div>
                        )}

                        {meeting.meetingLink && (
                          <a href={meeting.meetingLink} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-2">
                            🔗 Meeting Link
                          </a>
                        )}
                      </div>

                    {/* Accept / Reject buttons */}
<div className="flex flex-col gap-2 shrink-0">

  {/* Show Accept/Reject only if meeting is pending */}
  {meeting.status === 'pending' && (
    <>
      <button
        onClick={() => handleAccept(meeting._id)}
        disabled={!!actionLoading}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {actionLoading === meeting._id ? '...' : '✓ Accept'}
      </button>
      <button
        onClick={() => { setRejectModal({ id: meeting._id, open: true }); setRejectReason(''); }}
        disabled={!!actionLoading}
        className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        ✕ Reject
      </button>
    </>
  )}

  {/* Show Join Call only if meeting is accepted */}
  {meeting.status === 'accepted' && (
    <button
      onClick={() => navigate(`/call/${meeting._id}`)}
      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
    >
      📹 Join Call
    </button>
  )}

</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 3 — SCHEDULE MEETING
        ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'schedule' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Schedule a Meeting</h2>
              <p className="text-sm text-gray-500 mb-6">Send a meeting request to an entrepreneur or investor</p>

              <form onSubmit={handleSchedule} className="space-y-5">

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.title}
                    onChange={e => setScheduleForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Discuss Series A Funding"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

              {/* Recipient Search */}
<div className="relative">
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Search Recipient <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    value={searchQuery}
    onChange={e => handleSearch(e.target.value)}
    placeholder="Type investor name to search..."
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
  />

  {/* Dropdown */}
  {searchResults.length > 0 && (
    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
    {searchResults.map(result => (
  <div
    key={result._id}
    onClick={() => {
      setSelectedRecipient(result);        // ← result, not user
      setSearchQuery(result.name);
      setSearchResults([]);
    }}
    className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm flex justify-between items-center"
  >
    <span className="font-medium text-gray-800">{result.name}</span>
    <span className="text-gray-400 text-xs">{result.email}</span>
  </div>
))}
    </div>
  )}

  {/* Selected Badge */}
  {selectedRecipient && (
    <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
      <span className="text-green-600 text-xs">✅ Selected:</span>
      <span className="text-green-800 text-sm font-medium">{selectedRecipient.name}</span>
      <button
        onClick={() => { setSelectedRecipient(null); setSearchQuery(''); }}
        className="ml-auto text-gray-400 hover:text-red-500 text-xs"
      >
        ✕
      </button>
    </div>
  )}
</div>

                {/* Start & End Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.startTime}
                      onChange={e => setScheduleForm(p => ({ ...p, startTime: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.endTime}
                      onChange={e => setScheduleForm(p => ({ ...p, endTime: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={scheduleForm.description}
                    onChange={e => setScheduleForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="What's this meeting about?"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Meeting Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Meeting Link</label>
                  <input
                    type="url"
                    value={scheduleForm.meetingLink}
                    onChange={e => setScheduleForm(p => ({ ...p, meetingLink: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                  <textarea
                    value={scheduleForm.notes}
                    onChange={e => setScheduleForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any notes for the recipient..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  {scheduleLoading ? 'Scheduling...' : 'Send Meeting Request'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Reject Modal ── */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reject Meeting</h3>
            <p className="text-sm text-gray-500 mb-4">Optionally provide a reason for rejection.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal({ id: '', open: false })}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}