import React, {useEffect,useRef,useState} from 'react';
import {useAuth} from '../../context/AuthContext';
import {apiService} from '../../services/api';
import {StaffContact,StaffConversation,StaffMessage} from '../../types';
import {getRoleDisplayName} from '../../utils/rbac';

const mergeMessages = (old:StaffMessage[],incoming:StaffMessage[]) => [...new Map([...old,...incoming].map(m=>[m.id,m])).values()]
  .sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
const time = (date:string) => new Date(date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});

export const StaffMessagesView: React.FC = () => {
  const {user} = useAuth();
  const canBroadcast = ['SUPER_ADMIN','ADMIN','SCHOOL_ADMIN'].includes(user?.role || '');
  const [broadcastOpen,setBroadcastOpen] = useState(false);
  const [broadcastDraft,setBroadcastDraft] = useState('');
  const [broadcastNotice,setBroadcastNotice] = useState('');
  const [contacts,setContacts] = useState<StaffContact[]>([]);
  const [conversations,setConversations] = useState<StaffConversation[]>([]);
  const [selectedId,setSelectedId] = useState('');
  const selectedRef = useRef(selectedId); selectedRef.current=selectedId;
  const [search,setSearch] = useState('');
  const [messages,setMessages] = useState<StaffMessage[]>([]);
  const [drafts,setDrafts] = useState<Record<string,string>>({});
  const [hasMore,setHasMore] = useState(false);
  const [loading,setLoading] = useState(true);
  const [chatLoading,setChatLoading] = useState(false);
  const [olderLoading,setOlderLoading] = useState(false);
  const [sending,setSending] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [refresh,setRefresh] = useState(0);
  const [chatRetry,setChatRetry] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length-1]?.id;
  const selected = contacts.find(c=>c.id===selectedId) || conversations.find(c=>c.peerId===selectedId)?.peer;
  const draft = drafts[selectedId] || '';
  const unreadCount = conversations.reduce((sum,c)=>sum+c.unreadCount,0);
  const teacherCount = contacts.filter(contact=>contact.role==='TEACHER'&&contact.isActive).length;

  useEffect(()=>{
    let live=true,inFlight=false;
    const load = async()=>{
      if(inFlight)return;inFlight=true;
      try {
        const [directory,inbox] = await Promise.all([apiService.getStaffContacts(),apiService.getStaffInbox()]);
        if(live){setContacts(directory.data||[]);setConversations(inbox.data?.conversations||[]);}
      } catch(e:any){if(live)setError(e.message||'Could not load staff messages.');}
      finally{inFlight=false;if(live)setLoading(false);}
    };
    void load();
    const timer=window.setInterval(()=>{if(!document.hidden)void load();},15000);
    return()=>{live=false;window.clearInterval(timer);};
  },[user?.id,refresh]);

  useEffect(()=>{
    setMessages([]);setHasMore(false);setNotice('');setError('');
    if(!selectedId)return;
    let live=true,inFlight=false,initial=true;
    setChatLoading(true);
    const load = async()=>{
      if(inFlight)return;inFlight=true;
      try {
        const response=await apiService.getStaffMessages(selectedId);
        if(!live)return;
        const page=response.data;
        setMessages(previous=>mergeMessages(previous,page?.messages||[]));
        if(initial){setHasMore(Boolean(page?.hasMore));initial=false;}
        const latest=page?.messages[page.messages.length-1];
        if(latest && !document.hidden && page?.messages.some(m=>m.recipientId===user?.id&&!m.readAt)){
          await apiService.readStaffMessages(selectedId,latest.id);
          if(live){setConversations(previous=>previous.map(c=>c.peerId===selectedId?{...c,unreadCount:0}:c));window.dispatchEvent(new Event('staff-messages-updated'));}
        }
      }catch(e:any){if(live)setError(e.message||'Could not load this conversation.');}
      finally{inFlight=false;if(live)setChatLoading(false);}
    };
    void load();
    const timer=window.setInterval(()=>{if(!document.hidden)void load();},10000);
    return()=>{live=false;window.clearInterval(timer);};
  },[selectedId,user?.id,chatRetry]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({block:'nearest'});},[lastId,selectedId]);

  const loadOlder = async()=>{
    if(!messages[0]||olderLoading)return;
    const peer=selectedId;setOlderLoading(true);setError('');
    try{
      const result=await apiService.getStaffMessages(peer,messages[0].id);
      if(selectedRef.current!==peer)return;
      setMessages(old=>mergeMessages(result.data?.messages||[],old));setHasMore(Boolean(result.data?.hasMore));
    }catch(e:any){if(selectedRef.current===peer)setError(e.message||'Could not load earlier messages.');}
    finally{setOlderLoading(false);}
  };

  const send = async(event:React.FormEvent)=>{
    event.preventDefault();
    const body=draft,peer=selectedId;
    if(!peer||!body.trim()||sending)return;
    setSending(true);setError('');setNotice('');
    try{
      const response=await apiService.sendStaffMessage(peer,body);
      setDrafts(old=>old[peer]===body?{...old,[peer]:''}:old);
      if(selectedRef.current===peer&&response.data){setMessages(old=>mergeMessages(old,[response.data!]));setNotice('Message sent.');}
      setRefresh(n=>n+1);
      window.dispatchEvent(new Event('staff-messages-updated'));
    }catch(e:any){setError(e.message||'Message was not sent. Your draft is saved here; please retry.');}
    finally{setSending(false);}
  };

  const broadcast = async(event:React.FormEvent)=>{
    event.preventDefault();
    if(!canBroadcast||sending||!broadcastDraft.trim()||!teacherCount)return;
    const body=broadcastDraft;
    setSending(true);setError('');setBroadcastNotice('');
    try {
      const response=await apiService.broadcastToTeachers(body);
      if(!response.success||!response.data)throw new Error(response.message||'The message could not be sent.');
      setBroadcastDraft(current=>current===body?'':current);
      setBroadcastNotice(`Message sent to ${response.data.recipientCount} ${response.data.recipientCount===1?'teacher':'teachers'}.`);
      setRefresh(n=>n+1);
      window.dispatchEvent(new Event('staff-messages-updated'));
    }catch(e:any){setError(e.message||'The message was not sent. Your draft is kept here; please retry.');}
    finally{setSending(false);}
  };

  const peers = [...new Map([...conversations.map(c=>c.peer),...contacts].map(c=>[c.id,c])).values()]
    .filter(c=>`${c.name} ${getRoleDisplayName(c.role)}`.toLowerCase().includes(search.toLowerCase()));

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-on-surface">Staff Messages</h1><p className="text-sm text-on-surface-variant">Send a message to a colleague in your school.</p></div>
      <div className="flex flex-wrap items-center gap-3">{canBroadcast&&<button type="button" className="ui-button ui-button-primary" aria-pressed={broadcastOpen} onClick={()=>{setBroadcastOpen(true);setSelectedId('');}}>Message all teachers</button>}<span role="status" className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{unreadCount} unread</span></div>
    </div>
    {broadcastNotice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{broadcastNotice}</p>}
    {error&&<div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error"><span>{error}</span><button type="button" className="font-semibold underline" onClick={()=>{setError('');setRefresh(n=>n+1);setChatRetry(n=>n+1);}}>Retry</button></div>}
    <div className="grid min-h-[32rem] grid-cols-1 overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm md:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="border-b border-outline-variant/30 md:border-b-0 md:border-r">
        <div className="p-4"><label className="sr-only" htmlFor="staff-message-search">Find a staff member</label><input id="staff-message-search" className="ui-field w-full" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a staff member…"/></div>
        <div className="max-h-56 overflow-y-auto md:max-h-[36rem]">
          {loading&&<p className="p-4 text-sm" role="status">Loading staff…</p>}
          {!loading&&!peers.length&&<p className="p-4 text-sm text-on-surface-variant">{search?'No staff match your search.':'No other active staff accounts are available in your school.'}</p>}
          {peers.map(peer=>{
            const conversation=conversations.find(c=>c.peerId===peer.id);
            return <button type="button" key={peer.id} aria-pressed={selectedId===peer.id} onClick={()=>{setBroadcastOpen(false);setSelectedId(peer.id);}} className={`flex w-full items-start gap-3 border-b border-outline-variant/10 p-4 text-left hover:bg-surface-container-low ${selectedId===peer.id?'bg-primary/10':''}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{peer.name.slice(0,1)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-on-surface">{peer.name}</span><span className="block text-xs text-on-surface-variant">{getRoleDisplayName(peer.role)}{!peer.isActive?' · Inactive':''}</span><span className="mt-1 block truncate text-xs text-on-surface-variant">{conversation?.lastMessage.body||'Start a conversation'}</span></span>
              {!!conversation?.unreadCount&&<span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span>}
            </button>;
          })}
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        {broadcastOpen&&canBroadcast?<form onSubmit={broadcast} className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
          <div><h2 className="text-lg font-bold text-on-surface">Message all teachers</h2><p className="mt-2 text-sm text-on-surface-variant">Each teacher receives this in their own conversation with you. Replies are private.</p></div>
          <p className="rounded-xl bg-surface-container-low p-3 text-sm font-semibold">{loading?'Loading recipients…':`${teacherCount} active ${teacherCount===1?'teacher':'teachers'} in your school`}</p>
          {!loading&&!teacherCount&&<p className="text-sm text-on-surface-variant">There are no active teacher accounts to message.</p>}
          <label htmlFor="teacher-broadcast-body" className="text-sm font-semibold">Message to all teachers</label>
          <textarea id="teacher-broadcast-body" rows={8} maxLength={5000} value={broadcastDraft} onChange={event=>setBroadcastDraft(event.target.value)} disabled={sending} className="ui-field w-full resize-y" placeholder="Write the message every teacher should receive…"/>
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-on-surface-variant">{broadcastDraft.length}/5,000 characters</span><button type="submit" disabled={loading||sending||!teacherCount||!broadcastDraft.trim()} className="ui-button ui-button-primary disabled:opacity-50">{sending?'Sending…':`Send to all ${teacherCount} ${teacherCount===1?'teacher':'teachers'}`}</button></div>
          <button type="button" className="self-start text-sm font-semibold text-primary" onClick={()=>setBroadcastOpen(false)}>Back to staff messages</button>
        </form>:!selectedId?<div className="flex min-h-64 flex-1 flex-col items-center justify-center p-8 text-center text-on-surface-variant"><span className="material-symbols-outlined mb-3 text-4xl text-primary">forum</span><h2 className="font-semibold text-on-surface">Choose a staff member</h2><p className="mt-1 text-sm">Open a conversation or select a colleague to send your first message.</p></div>:<>
          <header className="border-b border-outline-variant/30 p-4"><h2 className="font-semibold text-on-surface">{selected?.name||'Staff conversation'}</h2><p className="text-xs text-on-surface-variant">{selected?getRoleDisplayName(selected.role):''}</p></header>
          <div className="max-h-[32rem] min-h-64 flex-1 space-y-3 overflow-y-auto p-4" aria-label="Conversation messages" aria-busy={chatLoading}>
            {hasMore&&<div className="text-center"><button type="button" disabled={olderLoading} onClick={()=>void loadOlder()} className="text-sm font-semibold text-primary disabled:opacity-50">{olderLoading?'Loading…':'Load earlier messages'}</button></div>}
            {chatLoading&&<p role="status" className="text-sm text-on-surface-variant">Loading conversation…</p>}
            {!chatLoading&&!messages.length&&<p className="py-12 text-center text-sm text-on-surface-variant">No messages yet. Start the conversation below.</p>}
            {messages.map(message=>{
              const mine=message.senderId===user?.id;
              return <article key={message.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[80%] ${mine?'bg-primary text-white':'bg-surface-container-low text-on-surface'}`}>
                  <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{message.body}</p>
                  <p className={`mt-1 text-[11px] ${mine?'text-white/80':'text-on-surface-variant'}`}><time dateTime={message.createdAt}>{time(message.createdAt)}</time>{mine&&<span> · {message.readAt?'Read':'Sent'}</span>}</p>
                </div>
              </article>;
            })}<div ref={bottomRef}/>
          </div>
          <form onSubmit={send} className="space-y-2 border-t border-outline-variant/30 p-4">
            <label htmlFor="staff-message-body" className="sr-only">Message to {selected?.name||'staff member'}</label>
            <textarea id="staff-message-body" rows={3} maxLength={5000} value={draft} disabled={sending||!selected?.isActive} onChange={e=>setDrafts(old=>({...old,[selectedId]:e.target.value}))} className="ui-field w-full resize-y disabled:opacity-60" placeholder={selected?.isActive?'Write a message…':'This staff account is inactive.'}/>
            <div className="flex items-center justify-between gap-3"><span role="status" className="text-xs text-on-surface-variant">{notice||`${draft.length}/5,000 characters`}</span><button type="submit" disabled={sending||!draft.trim()||!selected?.isActive} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><span className="material-symbols-outlined text-lg">send</span>{sending?'Sending…':'Send message'}</button></div>
          </form>
        </>}
      </div>
    </div>
  </section>;
};
