import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { StaffContact, StaffConversation, StaffMessage } from '../../types';
import { getRoleDisplayName } from '../../utils/rbac';

const mergeMessages = (old: StaffMessage[], incoming: StaffMessage[]) =>
  [...new Map([...old, ...incoming].map((m) => [m.id, m])).values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );

const time = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const StaffMessagesView: React.FC = () => {
  const { user } = useAuth();
  const canBroadcast = ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN'].includes(user?.role || '');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [broadcastNotice, setBroadcastNotice] = useState('');
  const [contacts, setContacts] = useState<StaffContact[]>([]);
  const [conversations, setConversations] = useState<StaffConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [chatRetry, setChatRetry] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastId = messages[messages.length - 1]?.id;
  const selected =
    contacts.find((c) => c.id === selectedId) ||
    conversations.find((c) => c.peerId === selectedId)?.peer;
  const draft = drafts[selectedId] || '';
  const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const teacherCount = contacts.filter(
    (contact) => contact.role === 'TEACHER' && contact.isActive
  ).length;

  useEffect(() => {
    let live = true,
      inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [directory, inbox] = await Promise.all([
          apiService.getStaffContacts(),
          apiService.getStaffInbox(),
        ]);
        if (live) {
          setContacts(directory.data || []);
          setConversations(inbox.data?.conversations || []);
        }
      } catch (e: any) {
        if (live) setError(e.message || 'Could not load staff messages.');
      } finally {
        inFlight = false;
        if (live) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [user?.id, refresh]);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    setNotice('');
    setError('');
    if (!selectedId) return;
    let live = true,
      inFlight = false,
      initial = true;
    setChatLoading(true);
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await apiService.getStaffMessages(selectedId);
        if (!live) return;
        const page = response.data;
        setMessages((previous) => mergeMessages(previous, page?.messages || []));
        if (initial) {
          setHasMore(Boolean(page?.hasMore));
          initial = false;
        }
        const latest = page?.messages[page.messages.length - 1];
        if (
          latest &&
          !document.hidden &&
          page?.messages.some((m) => m.recipientId === user?.id && !m.readAt)
        ) {
          await apiService.readStaffMessages(selectedId, latest.id);
          if (live) {
            setConversations((previous) =>
              previous.map((c) => (c.peerId === selectedId ? { ...c, unreadCount: 0 } : c))
            );
            window.dispatchEvent(new Event('staff-messages-updated'));
          }
        }
      } catch (e: any) {
        if (live) setError(e.message || 'Could not load this conversation.');
      } finally {
        inFlight = false;
        if (live) setChatLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [selectedId, user?.id, chatRetry]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [lastId, selectedId]);

  const loadOlder = async () => {
    if (!messages[0] || olderLoading) return;
    const peer = selectedId;
    setOlderLoading(true);
    setError('');
    try {
      const result = await apiService.getStaffMessages(peer, messages[0].id);
      if (selectedRef.current !== peer) return;
      setMessages((old) => mergeMessages(result.data?.messages || [], old));
      setHasMore(Boolean(result.data?.hasMore));
    } catch (e: any) {
      if (selectedRef.current === peer)
        setError(e.message || 'Could not load earlier messages.');
    } finally {
      setOlderLoading(false);
    }
  };

  const sendMessage = async () => {
    const body = draft,
      peer = selectedId;
    if (!peer || !body.trim() || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const response = await apiService.sendStaffMessage(peer, body);
      setDrafts((old) => (old[peer] === body ? { ...old, [peer]: '' } : old));
      if (selectedRef.current === peer && response.data) {
        setMessages((old) => mergeMessages(old, [response.data!]));
        setNotice('Message sent.');
      }
      setRefresh((n) => n + 1);
      window.dispatchEvent(new Event('staff-messages-updated'));
    } catch (e: any) {
      setError(e.message || 'Message was not sent. Your draft is saved here; please retry.');
    } finally {
      setSending(false);
    }
  };

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const broadcast = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canBroadcast || sending || !broadcastDraft.trim() || !teacherCount) return;
    const body = broadcastDraft;
    setSending(true);
    setError('');
    setBroadcastNotice('');
    try {
      const response = await apiService.broadcastToTeachers(body);
      if (!response.success || !response.data)
        throw new Error(response.message || 'The message could not be sent.');
      setBroadcastDraft((current) => (current === body ? '' : current));
      setBroadcastNotice(
        `Message sent to ${response.data.recipientCount} ${
          response.data.recipientCount === 1 ? 'teacher' : 'teachers'
        }.`
      );
      setRefresh((n) => n + 1);
      window.dispatchEvent(new Event('staff-messages-updated'));
    } catch (e: any) {
      setError(e.message || 'The message was not sent. Your draft is kept here; please retry.');
    } finally {
      setSending(false);
    }
  };

  const peers = [
    ...new Map(
      [...conversations.map((c) => c.peer), ...contacts].map((c) => [c.id, c])
    ).values(),
  ].filter((c) =>
    `${c.name} ${getRoleDisplayName(c.role)}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-950 to-rose-900 text-white shadow-xs">
            <span className="material-symbols-outlined text-[22px]">forum</span>
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Staff Messages</h1>
            <p className="text-xs text-stone-500">
              Direct and private school-wide communication with colleagues.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border ${
              unreadCount > 0
                ? 'border-rose-900/20 bg-rose-950/10 text-rose-950'
                : 'border-stone-200 bg-stone-100 text-stone-600'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                unreadCount > 0 ? 'bg-rose-900 animate-pulse' : 'bg-stone-400'
              }`}
            />
            {unreadCount} unread
          </span>

          {canBroadcast && (
            <button
              type="button"
              aria-pressed={broadcastOpen}
              onClick={() => {
                setBroadcastOpen(true);
                setSelectedId('');
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition cursor-pointer ${
                broadcastOpen
                  ? 'bg-rose-950 text-white ring-2 ring-rose-900/30'
                  : 'bg-rose-900 text-white hover:bg-rose-950'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>Message all teachers</span>
            </button>
          )}
        </div>
      </div>

      {/* Notices & Errors */}
      {broadcastNotice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-600">
            check_circle
          </span>
          <span>{broadcastNotice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-900 border border-red-200 hover:bg-red-100 cursor-pointer"
            onClick={() => {
              setError('');
              setRefresh((n) => n + 1);
              setChatRetry((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Two-Pane Messenger Shell */}
      <div className="grid min-h-[36rem] grid-cols-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Left Sidebar: Staff Directory & Threads */}
        <aside className="flex flex-col border-b border-stone-200 bg-stone-50/50 md:border-b-0 md:border-r">
          <div className="border-b border-stone-200 bg-white p-3.5">
            <label className="sr-only" htmlFor="staff-message-search">
              Find a staff member
            </label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-stone-400">
                search
              </span>
              <input
                id="staff-message-search"
                className="w-full rounded-xl border border-stone-300 bg-stone-50/70 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 transition focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search colleagues or roles…"
              />
            </div>
          </div>

          <div className="max-h-60 flex-1 divide-y divide-stone-100 overflow-y-auto md:max-h-[38rem]">
            {loading && (
              <p className="p-6 text-center text-xs text-stone-500" role="status">
                Loading staff directory…
              </p>
            )}

            {!loading && !peers.length && (
              <p className="p-6 text-center text-xs text-stone-500">
                {search
                  ? 'No staff match your search.'
                  : 'No other active staff accounts are available in your school.'}
              </p>
            )}

            {peers.map((peer) => {
              const conversation = conversations.find((c) => c.peerId === peer.id);
              const isSelected = selectedId === peer.id;
              const hasUnread = Boolean(conversation?.unreadCount);

              return (
                <button
                  type="button"
                  key={peer.id}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setBroadcastOpen(false);
                    setSelectedId(peer.id);
                  }}
                  className={`flex w-full items-start gap-3 p-3.5 text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/[0.08] border-l-4 border-l-rose-900'
                      : 'hover:bg-white border-l-4 border-l-transparent'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isSelected
                        ? 'bg-rose-900 text-white'
                        : 'bg-rose-950/10 text-rose-950'
                    }`}
                  >
                    {peer.name.slice(0, 1).toUpperCase()}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1.5">
                      <span
                        className={`truncate text-sm ${
                          hasUnread ? 'font-bold text-stone-950' : 'font-semibold text-stone-900'
                        }`}
                      >
                        {peer.name}
                      </span>
                      {hasUnread && (
                        <span
                          className="shrink-0 rounded-full bg-rose-900 px-2 py-0.5 text-[10px] font-bold text-white"
                          aria-label={`${conversation!.unreadCount} unread messages`}
                        >
                          {conversation!.unreadCount}
                        </span>
                      )}
                    </span>

                    <span className="block text-[11px] font-medium text-rose-900/80">
                      {getRoleDisplayName(peer.role)}
                      {!peer.isActive ? ' · Inactive' : ''}
                    </span>

                    <span
                      className={`mt-1 block truncate text-xs ${
                        hasUnread ? 'font-medium text-stone-800' : 'text-stone-500'
                      }`}
                    >
                      {conversation?.lastMessage.body || 'Start a conversation'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Pane: Broadcast Composer, Empty State, or Active Chat */}
        <div className="flex min-w-0 flex-col bg-white">
          {broadcastOpen && canBroadcast ? (
            <form onSubmit={broadcast} className="flex flex-1 flex-col justify-between p-5 sm:p-7">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-950/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-950">
                      School-Wide Announcement
                    </span>
                    <h2 className="mt-1.5 text-lg font-bold text-stone-900">
                      Message all teachers
                    </h2>
                    <p className="mt-1 text-xs text-stone-500">
                      Each teacher receives this in their private 1-on-1 thread with you.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-rose-900/15 bg-rose-950/[0.03] px-4 py-3 text-xs font-semibold text-rose-950">
                  <span className="material-symbols-outlined text-[18px] text-rose-900">
                    groups
                  </span>
                  <span>
                    {loading
                      ? 'Loading recipients…'
                      : `Recipients: ${teacherCount} active ${
                          teacherCount === 1 ? 'teacher' : 'teachers'
                        } in your school`}
                  </span>
                </div>

                {!loading && !teacherCount && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    There are no active teacher accounts to message.
                  </p>
                )}

                <div>
                  <label
                    htmlFor="teacher-broadcast-body"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-600"
                  >
                    Announcement Message
                  </label>
                  <textarea
                    id="teacher-broadcast-body"
                    rows={8}
                    maxLength={5000}
                    value={broadcastDraft}
                    onChange={(event) => setBroadcastDraft(event.target.value)}
                    disabled={sending}
                    className="mt-1.5 w-full resize-y rounded-xl border border-stone-300 bg-stone-50/40 p-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10"
                    placeholder="Write the message every teacher should receive…"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
                <span className="text-xs text-stone-400">
                  {broadcastDraft.length.toLocaleString()} / 5,000 characters
                </span>
                <button
                  type="submit"
                  disabled={loading || sending || !teacherCount || !broadcastDraft.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-rose-950 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>
                    {sending
                      ? 'Sending…'
                      : `Send to all ${teacherCount} ${
                          teacherCount === 1 ? 'teacher' : 'teachers'
                        }`}
                  </span>
                </button>
              </div>
            </form>
          ) : !selectedId ? (
            <div className="flex min-h-80 flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/10 text-rose-900">
                <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
              </div>
              <h2 className="text-base font-bold text-stone-900">Select a colleague</h2>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-stone-500">
                Choose a staff member from the list on the left to view your conversation or start a new message.
              </p>
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
              <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/40 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-900 text-sm font-bold text-white">
                    {(selected?.name || 'S').slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-stone-900">
                      {selected?.name || 'Staff conversation'}
                    </h2>
                    <p className="text-[11px] font-medium text-stone-500">
                      {selected ? getRoleDisplayName(selected.role) : ''}
                      {selected && !selected.isActive ? ' · Account inactive' : ''}
                    </p>
                  </div>
                </div>
              </header>

              {/* Scrollable Message Feed */}
              <div
                className="max-h-[30rem] min-h-72 flex-1 space-y-3 overflow-y-auto bg-stone-50/30 p-5"
                aria-label="Conversation messages"
                aria-busy={chatLoading}
              >
                {hasMore && (
                  <div className="pb-2 text-center">
                    <button
                      type="button"
                      disabled={olderLoading}
                      onClick={() => void loadOlder()}
                      className="rounded-full border border-stone-200 bg-white px-3.5 py-1 text-xs font-semibold text-rose-900 shadow-2xs hover:bg-rose-950/5 disabled:opacity-50 cursor-pointer"
                    >
                      {olderLoading ? 'Loading earlier…' : 'Load earlier messages'}
                    </button>
                  </div>
                )}

                {chatLoading && (
                  <p role="status" className="py-6 text-center text-xs text-stone-500">
                    Loading conversation…
                  </p>
                )}

                {!chatLoading && !messages.length && (
                  <p className="py-16 text-center text-xs text-stone-400">
                    No messages yet. Write a message below to start the conversation.
                  </p>
                )}

                {messages.map((message) => {
                  const mine = message.senderId === user?.id;
                  return (
                    <article
                      key={message.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-2xs sm:max-w-[75%] ${
                          mine
                            ? 'rounded-br-sm bg-rose-900 text-white'
                            : 'rounded-bl-sm border border-stone-200 bg-white text-stone-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                          {message.body}
                        </p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            mine ? 'text-rose-200' : 'text-stone-400'
                          }`}
                        >
                          <time dateTime={message.createdAt}>{time(message.createdAt)}</time>
                          {mine && (
                            <span className="font-semibold">
                              {' '}
                              · {message.readAt ? 'Read' : 'Sent'}
                            </span>
                          )}
                        </p>
                      </div>
                    </article>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Message Composer Footer */}
              <form
                onSubmit={send}
                className="space-y-2 border-t border-stone-200 bg-white p-4"
              >
                <label htmlFor="staff-message-body" className="sr-only">
                  Message to {selected?.name || 'staff member'}
                </label>
                <textarea
                  id="staff-message-body"
                  rows={2}
                  maxLength={5000}
                  value={draft}
                  disabled={sending || !selected?.isActive}
                  onChange={(e) =>
                    setDrafts((old) => ({ ...old, [selectedId]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  className="w-full resize-none rounded-xl border border-stone-300 bg-stone-50/50 p-3 text-sm text-stone-900 placeholder:text-stone-400 transition focus:border-rose-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-900/10 disabled:opacity-60"
                  placeholder={
                    selected?.isActive
                      ? 'Write a message… (Press Enter to send, Shift+Enter for new line)'
                      : 'This staff account is inactive.'
                  }
                />
                <div className="flex items-center justify-between gap-3">
                  <span role="status" className="text-[11px] text-stone-500">
                    {notice || `${draft.length.toLocaleString()} / 5,000`}
                  </span>
                  <button
                    type="submit"
                    disabled={sending || !draft.trim() || !selected?.isActive}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-950 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>{sending ? 'Sending…' : 'Send'}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};