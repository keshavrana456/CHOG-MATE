import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, FileText, Heart, Image as ImageIcon, MessageCircle, Mic, MoreHorizontal, Paperclip, Send, Sparkles, Video, X } from 'lucide-react';
import { Link } from 'wouter';
import {
  getDiscoverProfilesQueryKey, getGetMatchesQueryKey, getGetMessagesQueryKey,
  getGetMeQueryKey,
  useBlockProfile, useDiscoverProfiles, useGetMatches, useGetMessages,
  useGetMe, useReportProfile, useRequestMessageAttachmentUploadUrl, useSendMessage, useSwipeProfile, useUnmatchProfile,
} from '@workspace/api-client-react';
import { type DiscoverProfilesMode, type DiscoverProfilesParams, type Profile, ReportInputReason } from '@workspace/api-client-react';
import { AppShell, ChogArtwork, EmptyState, Eyebrow, PageTitle, ProfileAvatar, QueryState } from '@/components/shared';
import { WalletConnectionDialog } from '@/components/wallet-connection-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

function ReportControl({
  profile,
  canInteract,
  onAuthRequired,
}: {
  profile: Profile;
  canInteract: boolean;
  onAuthRequired: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<keyof typeof ReportInputReason>('other');
  const [details, setDetails] = useState('');
  const [notice, setNotice] = useState('');
  const report = useReportProfile();
  const block = useBlockProfile();
  const qc = useQueryClient();
  async function submitReport() {
    try {
      await report.mutateAsync({ data: { targetUserId: profile.userId, reason: ReportInputReason[reason], details: details || undefined } });
      setNotice('Report sent to the safety team. Thank you.');
      setOpen(false);
    } catch { setNotice('We could not send that report. Please try again.'); }
  }
  async function blockProfile() {
    if (!window.confirm(`Block @${profile.username}? You will no longer see this profile.`)) return;
    try {
      await block.mutateAsync({ data: { targetUserId: profile.userId } });
      await qc.invalidateQueries({ queryKey: getDiscoverProfilesQueryKey() });
      setNotice('Profile blocked.');
    } catch { setNotice('We could not block this profile. Please try again.'); }
  }
  return <div className="relative">
    <button onClick={() => canInteract ? setOpen(!open) : onAuthRequired()} className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-[#64566f] transition hover:bg-white" aria-label="Safety options" data-testid={`button-safety-${profile.userId}`}><MoreHorizontal size={19} /></button>
    {open && <div className="glass-popover absolute right-0 top-12 z-20 w-64 rounded-2xl p-4">
      <label className="text-xs font-bold text-[#51445f]">Report this profile</label>
      <select value={reason} onChange={e => setReason(e.target.value as keyof typeof ReportInputReason)} className="field mt-2 text-sm" data-testid={`select-report-reason-${profile.userId}`}>
        {Object.entries(ReportInputReason).map(([key,value]) => <option value={key} key={key}>{value.replace('_',' ')}</option>)}
      </select>
      <textarea value={details} onChange={e => setDetails(e.target.value)} className="field mt-2 min-h-20 resize-y text-sm" placeholder="Details (optional)" data-testid={`input-report-details-${profile.userId}`} />
      <button onClick={submitReport} disabled={report.isPending} className="button-primary mt-2 w-full rounded-xl py-2 text-xs font-bold disabled:opacity-50" data-testid={`button-submit-report-${profile.userId}`}>{report.isPending ? 'Sending…' : 'Send report'}</button>
      <button onClick={blockProfile} disabled={block.isPending} className="mt-2 w-full rounded-xl border border-[#eedbd6] py-2 text-xs font-bold text-[#9c4c42] hover:bg-[#fff4f0]" data-testid={`button-block-${profile.userId}`}>{block.isPending ? 'Blocking…' : 'Block profile'}</button>
    </div>}
    {notice && <div role="status" className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-[#ded4f5] bg-white p-3 text-xs leading-5 text-[#554477]" data-testid={`status-safety-${profile.userId}`}>{notice}</div>}
  </div>;
}

function DiscoverCard({
  profile,
  onAction,
  onOpenProfile,
  onAuthRequired,
  canInteract,
  pending,
}: {
  profile: Profile;
  onAction: (action: 'pass'|'like'|'super_like') => void;
  onOpenProfile: () => void;
  onAuthRequired: () => void;
  canInteract: boolean;
  pending: boolean;
}) {
  const touchStart = useRef<number | null>(null);
  function finishTouch(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0]?.clientX - touchStart.current;
    touchStart.current = null;
    if (distance > 70) onAction('like');
    else if (distance < -70) onAction('pass');
  }
  return <article className="surface mx-auto w-full max-w-[620px] overflow-hidden rounded-[30px]" data-testid={`card-profile-${profile.userId}`}>
    <div onTouchStart={event=>{touchStart.current=event.touches[0]?.clientX ?? null;}} onTouchEnd={finishTouch} className="relative h-[310px] touch-pan-y sm:h-[390px]" data-testid={`swipe-surface-${profile.userId}`}>
      <ChogArtwork chog={profile.chog} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#211332e8] via-[#21133278] to-transparent px-6 pb-5 pt-24 text-white sm:px-8">
        <div className="flex items-end justify-between gap-3"><div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] backdrop-blur"><BadgeCheck size={12} />Holder verified</div><h2 className="display text-[34px] font-extrabold leading-none tracking-[-.05em]">{profile.displayName}</h2><p className="mt-1 text-sm text-white/75">@{profile.username}{profile.location ? ` · ${profile.location}` : ''}</p></div>
          {typeof profile.compatibility === 'number' && <div className="rounded-2xl border border-white/30 bg-white/15 px-3 py-2 text-center backdrop-blur"><span className="display block text-xl font-extrabold">{profile.compatibility}%</span><span className="text-[9px] font-bold uppercase tracking-[.12em] text-white/75">fit</span></div>}
        </div>
      </div>
      <div className="absolute right-4 top-4"><ReportControl profile={profile} canInteract={canInteract} onAuthRequired={onAuthRequired} /></div>
      <span className="absolute bottom-3 right-4 text-[9px] font-semibold tracking-wide text-white/60 sm:hidden">Swipe to pass or like</span>
    </div>
    <div className="px-6 py-5 sm:px-8">
      <p className="text-sm leading-6 text-[#6d6178]">{profile.bio || 'A verified holder, ready to make a new connection.'}</p>
      <div className="mt-4 flex flex-wrap gap-2">{profile.lookingFor.map(item=><span key={item} className="rounded-full bg-[#f2ecff] px-3 py-1.5 text-[11px] font-bold text-[#6246b0]">{item}</span>)}</div>
      {profile.whyYouMatch?.length ? <div className="mt-4 rounded-2xl bg-[#fff6e9] px-4 py-3"><p className="mb-1 text-[10px] font-bold uppercase tracking-[.13em] text-[#9b6b3c]">A reason to say hello</p><p className="text-sm leading-5 text-[#735a43]">{profile.whyYouMatch[0]}</p></div> : null}
      {profile.interests.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{profile.interests.slice(0,5).map(item=><span key={item} className="rounded-full border border-[#e9e1d7] px-3 py-1 text-[11px] font-medium text-[#7c7185]">{item}</span>)}</div>}
      <button type="button" onClick={onOpenProfile} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#7047ff] underline-offset-4 hover:underline" data-testid={`button-open-profile-${profile.userId}`}>View full profile <ArrowRight size={13}/></button>
      <div className="mt-6 flex items-center justify-center gap-4">
        <button disabled={pending} onClick={()=>onAction('pass')} className="grid h-12 w-12 place-items-center rounded-full border border-[#e8dfd5] bg-white text-[#8a798a] transition hover:-translate-y-1 hover:border-[#e9a5af] hover:text-[#d35e70] disabled:opacity-50" aria-label="Pass" data-testid={`button-pass-${profile.userId}`}><X size={21}/></button>
        <button disabled={pending} onClick={()=>onAction('super_like')} className="grid h-11 w-11 place-items-center rounded-full bg-[#f2ecff] text-[#7851d9] transition hover:-translate-y-1 hover:bg-[#e6dcff] disabled:opacity-50" aria-label="Super like" data-testid={`button-super-like-${profile.userId}`}><Sparkles size={18}/></button>
        <button disabled={pending} onClick={()=>onAction('like')} className="button-primary grid h-14 w-14 place-items-center rounded-full disabled:opacity-50" aria-label="Like" data-testid={`button-like-${profile.userId}`}><Heart size={23} fill="currentColor"/></button>
      </div>
    </div>
  </article>;
}

function ProfileDetailsDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!profile) return null;
  const sections = [
    { title: 'Interests', values: profile.interests },
    { title: 'Hobbies', values: profile.hobbies },
    { title: 'Skills', values: profile.skills },
    { title: 'Languages', values: profile.languages },
  ].filter(section => section.values.length > 0);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="surface max-w-2xl overflow-hidden rounded-[28px] border-[#e8dfd5] bg-[#fffaf6] p-0">
      <div className="relative h-56 bg-[#e8ddff] sm:h-72"><ChogArtwork chog={profile.chog}/><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#211332e8] to-transparent px-6 pb-5 pt-20 text-white sm:px-8"><div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] backdrop-blur"><BadgeCheck size={12}/>Holder verified</div><h2 className="display text-3xl font-extrabold tracking-[-.04em]">{profile.displayName}</h2><p className="mt-1 text-sm text-white/80">@{profile.username}{profile.location ? ` · ${profile.location}` : ''}{profile.age ? ` · ${profile.age}` : ''}</p></div></div>
      <div className="max-h-[45vh] overflow-y-auto px-6 pb-7 pt-5 sm:px-8">
        <DialogHeader className="text-left">
          <DialogTitle className="sr-only">{profile.displayName}’s profile</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#6d6178]">{profile.bio || 'A verified holder, ready to make a new connection.'}</DialogDescription>
        </DialogHeader>
        {(profile.name || profile.gender) && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#81758a]">{profile.name && <span><strong className="font-bold text-[#594d64]">Name:</strong> {profile.name}</span>}{profile.gender && <span><strong className="font-bold text-[#594d64]">Gender:</strong> {profile.gender}</span>}</div>}
        {profile.lookingFor.length > 0 && <section className="mt-5" aria-label="Looking for"><h3 className="text-[10px] font-bold uppercase tracking-[.13em] text-[#9b6b3c]">Looking for</h3><div className="mt-2 flex flex-wrap gap-2">{profile.lookingFor.map(item=><span key={item} className="rounded-full bg-[#f2ecff] px-3 py-1.5 text-[11px] font-bold text-[#6246b0]">{item}</span>)}</div></section>}
        {sections.map(section=><section key={section.title} className="mt-5"><h3 className="text-[10px] font-bold uppercase tracking-[.13em] text-[#9b6b3c]">{section.title}</h3><div className="mt-2 flex flex-wrap gap-2">{section.values.map(item=><span key={item} className="rounded-full border border-[#e9e1d7] px-3 py-1.5 text-[11px] font-medium text-[#7c7185]">{item}</span>)}</div></section>)}
        <p className="mt-6 flex items-center gap-2 border-t border-[#24133f12] pt-4 text-xs text-[#81758a]"><BadgeCheck size={15} className="text-[#447a43]"/>Chog #{profile.chog.tokenId} · ownership checked on Monad</p>
      </div>
    </DialogContent>
  </Dialog>;
}

export function DiscoverPage() {
  const [cursor, setCursor] = useState<string | undefined>();
  const [mode, setMode] = useState<DiscoverProfilesMode>('discover');
  const [toast, setToast] = useState('');
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const hasWalletSession = Boolean(me.data);
  const canInteract = Boolean(me.data?.profile);
  const params: DiscoverProfilesParams = useMemo(()=>({ mode, limit:20, ...(cursor ? { cursor } : {}) }),[cursor,mode]);
  const key = getDiscoverProfilesQueryKey(params);
  const { data, isLoading, isError, refetch } = useDiscoverProfiles(params, { query: { queryKey:key, retry:false } });
  const swipe = useSwipeProfile();
  const qc = useQueryClient();
  const profiles = data?.profiles || [];
  useEffect(() => {
    if (canInteract) setWalletDialogOpen(false);
  }, [canInteract]);
  async function action(profile: Profile, selected: 'pass'|'like'|'super_like') {
    if (!canInteract) {
      setWalletDialogOpen(true);
      return;
    }
    try {
      const result = await swipe.mutateAsync({ data: { targetUserId: profile.userId, action: selected } });
      setToast(result.matched ? `It’s mutual. You and @${profile.username} matched.` : selected === 'pass' ? 'Passed. Your next Chog connection awaits.' : 'Like sent. If it’s mutual, you’ll find each other in Matches.');
      await qc.invalidateQueries({ queryKey:key });
      if (result.matched) await qc.invalidateQueries({ queryKey:getGetMatchesQueryKey() });
    } catch { setToast('That action could not be saved. Please try again.'); }
  }
  return <AppShell><div className="page-enter">
    <PageTitle eyebrow="The good kind of scrolling" title="Find your people." description="Every profile here belongs to an eligible Chog holder. Choose the kind of connection that feels right." />
     <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Connection type">{([{value:'discover',label:'All paths'},{value:'date',label:'Dating'},{value:'friends',label:'Friendship'},{value:'network',label:'Networking'},{value:'collab',label:'Collaboration'}] as {value:DiscoverProfilesMode;label:string}[]).map(item=><button key={item.value} onClick={()=>{setMode(item.value);setCursor(undefined);setToast('');}} className={`mode-tab shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition ${mode===item.value?'active':''}`} aria-pressed={mode===item.value} data-testid={`button-mode-${item.value}`}>{item.label}</button>)}</div>
    {toast && <div className="mx-auto mb-4 max-w-[620px] rounded-2xl border border-[#ded4f5] bg-white px-4 py-3 text-sm text-[#514177]" role="status" data-testid="status-swipe">{toast}<button className="float-right font-bold" onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={16}/></button></div>}
    <QueryState loading={isLoading} error={isError} retry={()=>void refetch()}>
      {profiles.length ? <><DiscoverCard profile={profiles[0]} onAction={selected => void action(profiles[0],selected)} onOpenProfile={()=>setViewingProfile(profiles[0])} onAuthRequired={()=>setWalletDialogOpen(true)} canInteract={hasWalletSession} pending={swipe.isPending} />
        <div className="mx-auto mt-5 flex max-w-[620px] items-center justify-between"><p className="text-xs text-[#92869a]">Real holders. Real possibilities.</p>{data?.nextCursor && <button onClick={()=>setCursor(data.nextCursor || undefined)} className="button-soft inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold" data-testid="button-load-more">More people <ArrowRight size={14}/></button>}</div>
      </> : <EmptyState mark="cm" title="No one new, for now." detail="You’ve reached the end of the eligible Chog holders available to discover. Check back as the community grows." action={<button onClick={()=>void refetch()} className="button-soft rounded-full px-5 py-2.5 text-sm font-bold" data-testid="button-refresh-discovery">Check again</button>} />}
    </QueryState>
    <ProfileDetailsDialog profile={viewingProfile} open={Boolean(viewingProfile)} onOpenChange={open=>{if(!open)setViewingProfile(null);}}/>
    <WalletConnectionDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}/>
  </div></AppShell>;
}

export function MatchesPage() {
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const { data, isLoading, isError, refetch } = useGetMatches({
    query: { enabled: Boolean(me.data), queryKey: getGetMatchesQueryKey() },
  });
  const [walletDialogOpen, setWalletDialogOpen] = useState(true);
  const qc = useQueryClient();
  const matches = data || [];
  if (me.isLoading) return <AppShell><div className="skeleton h-96 rounded-[28px]"/></AppShell>;
  if (me.isError && !isUnauthorized(me.error)) return <AppShell><QueryState loading={false} error retry={()=>void me.refetch()}><div/></QueryState></AppShell>;
  if (!me.data) return <AppShell><div className="page-enter"><PageTitle eyebrow="The feeling is mutual" title="Your matches." description="Sign in to view your mutual connections."/><EmptyState title="Connect your wallet to continue." detail="Your matches are private. Verify your wallet to view them."/></div><WalletConnectionDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}/></AppShell>;
  return <AppShell><div className="page-enter">
    <PageTitle eyebrow="The feeling is mutual" title="Your matches." description="Only real mutual connections live here. Take a look around." />
    <QueryState loading={isLoading} error={isError} retry={()=>void refetch()}>
      {matches.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{matches.map(match=><article className="surface rounded-[26px] p-5" key={match.id} data-testid={`card-match-${match.id}`}>
        <div className="flex items-center gap-4"><ProfileAvatar profile={match.profile} size="lg"/><div className="min-w-0 flex-1"><h2 className="display truncate text-xl font-extrabold text-[#24133f]">{match.profile.displayName}</h2><p className="text-xs text-[#82778c]">@{match.profile.username}</p></div><span className="rounded-full bg-[#f2ecff] px-3 py-1.5 text-xs font-bold text-[#6246b0]">{match.compatibility}%</span></div>
        <div className="mt-5 flex items-center justify-between border-t border-[#24133f10] pt-4"><p className="text-xs text-[#887c90]">Matched {new Date(match.createdAt).toLocaleDateString()}</p><Link href={`/messages?match=${encodeURIComponent(match.id)}`} className="button-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold" data-testid={`link-message-${match.id}`}><MessageCircle size={15}/>Message</Link></div>
        <MatchActions matchId={match.id} username={match.profile.username} onDone={()=>void qc.invalidateQueries({queryKey:getGetMatchesQueryKey()})}/>
      </article>)}</div> : <EmptyState mark="cm" title="Your first match is out there." detail="When someone you like likes you back, you’ll find your mutual connection here." action={<Link href="/discover" className="button-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold" data-testid="link-discover-from-matches">Meet people <ArrowRight size={15}/></Link>} />}
    </QueryState>
  </div></AppShell>;
}

function MatchActions({ matchId, username, onDone }: { matchId: string; username: string; onDone: () => void }) {
  const unmatch = useUnmatchProfile();
  return <button onClick={()=>{if(window.confirm(`Unmatch with @${username}? This removes the mutual connection.`)) unmatch.mutate({matchId},{onSuccess:onDone});}} disabled={unmatch.isPending} className="mt-4 text-xs font-semibold text-[#998e9e] underline-offset-4 hover:text-[#9a4a4a] hover:underline disabled:opacity-50" data-testid={`button-unmatch-${matchId}`}>{unmatch.isPending ? 'Removing…' : 'Unmatch'}</button>;
}

export function MessagesPage() {
  const [selectedMatch, setSelectedMatch] = useState(()=>typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('match') || '' : '');
  const currentProfile = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const { data: matches, isLoading: matchesLoading, isError: matchesError, refetch: retryMatches } = useGetMatches({
    query: { enabled: Boolean(currentProfile.data), queryKey: getGetMatchesQueryKey() },
  });
  const match = matches?.find(item=>item.id === selectedMatch) || matches?.[0];
  const matchId = match?.id || '';
  const messageKey = getGetMessagesQueryKey(matchId);
  const { data: messages, isLoading, isError, refetch } = useGetMessages(matchId, { query: { enabled:!!matchId && Boolean(currentProfile.data), queryKey:messageKey } });
  const [content, setContent] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceDraft, setVoiceDraft] = useState<File | null>(null);
  const send = useSendMessage();
  const requestUpload = useRequestMessageAttachmentUploadUrl();
  const qc = useQueryClient();
  const currentUserId = currentProfile.data?.profile?.userId;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceDraftUrl = useMemo(
    () => voiceDraft ? URL.createObjectURL(voiceDraft) : null,
    [voiceDraft],
  );
  useEffect(() => () => {
    if (voiceDraftUrl) URL.revokeObjectURL(voiceDraftUrl);
  }, [voiceDraftUrl]);
  useEffect(() => {
    if (!recording) {
      setRecordingSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setRecordingSeconds(seconds => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    const client = supabase;
    if (!matchId || !client) return;
    const channel = client
      .channel(`match-messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        () => {
          void qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(matchId) });
          void qc.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [matchId, qc]);

  async function sendMedia(file: File, messageType: 'voice' | 'image' | 'file') {
    if (!matchId) return;
    setMediaError('');
    if (!supabase) {
      setMediaError('Private file storage is not configured.');
      return;
    }
    if (!file.size || file.size > 15 * 1024 * 1024 || !file.type) {
      setMediaError('Choose a supported file with a known type, up to 15 MB.');
      return;
    }
    setMediaBusy(true);
    try {
      const upload = await requestUpload.mutateAsync({
        matchId,
        data: {
          fileName: file.name.slice(0, 180),
          contentType: file.type.split(';')[0].trim().toLowerCase(),
          size: file.size,
          messageType,
        },
      });
      const { error: uploadError } = await supabase.storage
        .from(upload.bucket)
        .uploadToSignedUrl(upload.objectPath, upload.uploadToken, file, {
          contentType: file.type.split(';')[0].trim().toLowerCase(),
          cacheControl: '3600',
        });
      if (uploadError) throw new Error('The file upload failed. Please try again.');
      await send.mutateAsync({
        matchId,
        data: {
          messageType,
          attachmentPath: upload.objectPath,
          attachmentName: file.name.slice(0, 180),
          attachmentContentType: file.type.split(';')[0].trim().toLowerCase(),
          attachmentSize: file.size,
        },
      });
      setVoiceDraft(null);
      await qc.invalidateQueries({ queryKey: messageKey });
      await qc.invalidateQueries({ queryKey: getGetMatchesQueryKey() });
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'The attachment could not be sent.');
    } finally {
      setMediaBusy(false);
    }
  }

  async function startVoiceRecording() {
    setMediaError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMediaError('Voice recording is not supported by this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const formats = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = formats.find(format => MediaRecorder.isTypeSupported(format));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const extension = type.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type });
        if (blob.size) setVoiceDraft(new File([blob], `voice-message.${extension}`, { type }));
        stream.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setMediaError('Microphone access was denied or is unavailable.');
    }
  }

  function stopVoiceRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  function cancelVoiceRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;
        audioChunksRef.current = [];
        setRecording(false);
      };
      recorder.stop();
    } else {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setRecording(false);
    }
    setVoiceDraft(null);
    setMediaError('');
  }

  function selectAttachment(event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) void sendMedia(file, type);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() || !matchId) return;
    try {
      await send.mutateAsync({ matchId, data:{content:content.trim()} });
      setContent('');
      await qc.invalidateQueries({queryKey:messageKey});
    } catch { /* The inline mutation error below remains visible. */ }
  }
  function choose(id:string) { setSelectedMatch(id); }
  const [walletDialogOpen, setWalletDialogOpen] = useState(true);
  if (currentProfile.isLoading) return <AppShell><div className="skeleton h-96 rounded-[28px]"/></AppShell>;
  if (currentProfile.isError && !isUnauthorized(currentProfile.error)) return <AppShell><QueryState loading={false} error retry={()=>void currentProfile.refetch()}><div/></QueryState></AppShell>;
  if (!currentProfile.data) return <AppShell><div className="page-enter"><PageTitle eyebrow="Your conversations" title="Messages." description="Sign in to view or send messages."/><EmptyState title="Connect your wallet to continue." detail="Messages are available after you verify your wallet and make a mutual match."/></div><WalletConnectionDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}/></AppShell>;
  if (matchesLoading) return <AppShell><div className="skeleton h-96 rounded-[28px]"/></AppShell>;
  if (matchesError) return <AppShell><QueryState loading={false} error retry={()=>void retryMatches()}><div/></QueryState></AppShell>;
  if (!matches?.length) return <AppShell><PageTitle eyebrow="A good conversation starts here" title="Messages."/><EmptyState title="No chats just yet." detail="A conversation opens after a mutual match. Your messages will be waiting here." action={<Link href="/discover" className="button-primary rounded-full px-5 py-3 text-sm font-bold" data-testid="link-discover-from-messages">Discover holders</Link>}/></AppShell>;
  return <AppShell><div className="page-enter">
    <PageTitle eyebrow="Your conversations" title="Messages." description="A little hello can go a long way." />
    <div className="surface grid min-h-[570px] overflow-hidden rounded-[28px] md:grid-cols-[300px_1fr]">
      <aside className="border-b border-[#24133f12] bg-[#eee7fb] md:border-b-0 md:border-r"><div className="px-5 py-4"><Eyebrow>Mutual connections</Eyebrow><h2 className="display text-xl font-extrabold text-[#24133f]">Your people</h2></div><div className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:px-2">{matches.map(item=><button onClick={()=>choose(item.id)} key={item.id} className={`flex min-w-[200px] items-center gap-3 rounded-2xl p-3 text-left transition md:w-full ${matchId===item.id?'bg-[#eee8ff]':'hover:bg-[#f6f1e9]'}`} data-testid={`button-conversation-${item.id}`}><ProfileAvatar profile={item.profile} size="sm"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#35264b]">{item.profile.displayName}</span><span className="block truncate text-xs text-[#8b8091]">@{item.profile.username}</span></span>{(item.unreadCount||0)>0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#7047ff] px-1 text-[10px] font-bold text-white">{item.unreadCount}</span>}</button>)}</div></aside>
      <section className="flex min-h-[460px] flex-col">
        {match && <header className="flex items-center gap-3 border-b border-[#24133f12] px-5 py-4"><ProfileAvatar profile={match.profile} size="sm"/><div className="min-w-0 flex-1"><p className="font-bold text-[#35264b]">{match.profile.displayName}</p><p className="text-xs text-[#887c90]">@{match.profile.username} · Chog holder</p></div><button disabled title="Voice and video calling are not available yet" className="flex items-center gap-2 rounded-full border border-[#e9e0d3] px-3 py-2 text-xs font-semibold text-[#988d9f] disabled:cursor-not-allowed" data-testid="button-call-unavailable"><Video size={15}/>Calls unavailable</button></header>}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,#f7f2ff_0,transparent_68%)] p-5">
          <QueryState loading={isLoading} error={isError} retry={()=>void refetch()}>{messages?.length ? messages.map(message=>{
            const mine=message.senderId===currentUserId;
            return <div key={message.id} className={`max-w-[82%] rounded-[20px] px-4 py-3 text-sm leading-5 ${mine?'ml-auto rounded-br-md bg-[#7047ff] text-white':'mr-auto rounded-bl-md border border-[#eee5d9] bg-white text-[#51445f]'}`} data-testid={`message-${message.id}`}>
              {message.messageType === 'image' && message.attachmentUrl
                ? <a href={message.attachmentUrl} target="_blank" rel="noreferrer"><img src={message.attachmentUrl} alt={message.attachmentName || 'Chat attachment'} className="max-h-72 max-w-full rounded-xl object-contain" loading="lazy"/></a>
                : message.messageType === 'voice' && message.attachmentUrl
                  ? <audio src={message.attachmentUrl} controls className="max-w-full" aria-label="Voice message"/>
                  : message.messageType === 'file' && message.attachmentUrl
                    ? <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 underline underline-offset-2 ${mine?'text-white':'text-[#7047ff]'}`}><FileText size={17}/><span className="break-all">{message.attachmentName || 'Download file'}</span></a>
                    : <p>{message.content}</p>}
              {message.messageType !== 'text' && !message.attachmentUrl && <p className="text-xs opacity-80">Attachment unavailable</p>}
              <time className={`mt-1 block text-[10px] ${mine?'text-white/70':'text-[#9b8fa0]'}`}>{new Date(message.createdAt).toLocaleString()}</time>
            </div>;
          }) : <div className="m-auto max-w-sm py-10 text-center"><div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#eee8ff] text-[#7047ff]"><MessageCircle size={20}/></div><h3 className="display text-xl font-extrabold text-[#35264b]">Start with a hello.</h3><p className="mt-2 text-sm leading-5 text-[#8b8091]">This is the beginning of your conversation with {match?.profile.displayName}.</p></div>}</QueryState>
          {send.isError && <p className="text-right text-xs text-[#a34646]" role="alert" data-testid="status-send-error">Message not sent. Please try again.</p>}
          {mediaError && <p className="text-right text-xs text-[#a34646]" role="alert" data-testid="status-media-error">{mediaError}</p>}
        </div>
        <form onSubmit={submit} className="border-t border-[#24133f12] p-4">
          {voiceDraft && voiceDraftUrl && <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[#f5f0ff] p-3"><audio src={voiceDraftUrl} controls className="min-w-0 flex-1" aria-label="Voice message preview"/><button type="button" onClick={()=>setVoiceDraft(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#7357a7]" aria-label="Discard voice message"><X size={17}/></button><button type="button" onClick={()=>void sendMedia(voiceDraft,'voice')} disabled={mediaBusy} className="button-primary rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50">{mediaBusy?'Sending…':'Send voice'}</button></div>}
          <div className="flex gap-2">
            <input value={content} onChange={e=>setContent(e.target.value)} maxLength={4000} placeholder="Write a message…" className="field min-w-0 flex-1" aria-label="Message" data-testid="input-message"/>
            <button type="submit" disabled={!content.trim()||send.isPending} className="button-primary grid h-12 w-12 shrink-0 place-items-center rounded-2xl disabled:opacity-50" aria-label="Send message" data-testid="button-send-message"><Send size={17}/></button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={event=>selectAttachment(event,'image')} aria-label="Choose an image"/>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.zip,.json,.doc,.docx,.xls,.xlsx" className="sr-only" onChange={event=>selectAttachment(event,'file')} aria-label="Choose a file"/>
            <button type="button" onClick={()=>imageInputRef.current?.click()} disabled={mediaBusy||recording} className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dcef] px-3 py-2 text-xs font-semibold text-[#635178] hover:bg-[#f8f4ff] disabled:opacity-50"><ImageIcon size={15}/>Image</button>
            <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={mediaBusy||recording} className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dcef] px-3 py-2 text-xs font-semibold text-[#635178] hover:bg-[#f8f4ff] disabled:opacity-50"><Paperclip size={15}/>File</button>
            {!recording
              ? <button type="button" onClick={()=>void startVoiceRecording()} disabled={mediaBusy||Boolean(voiceDraft)} className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dcef] px-3 py-2 text-xs font-semibold text-[#635178] hover:bg-[#f8f4ff] disabled:opacity-50"><Mic size={15}/>Record voice</button>
              : <><span className="text-xs font-semibold text-[#a34646]" aria-live="polite">Recording · {recordingSeconds}s</span><button type="button" onClick={cancelVoiceRecording} className="rounded-full border border-[#e5dcef] px-3 py-2 text-xs font-semibold text-[#635178]">Cancel</button><button type="button" onClick={stopVoiceRecording} className="rounded-full bg-[#7047ff] px-3 py-2 text-xs font-bold text-white"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-white"/>Stop</span></button></>}
            {mediaBusy && <span className="text-xs text-[#8b8091]" role="status">Uploading attachment…</span>}
          </div>
        </form>
      </section>
    </div>
  </div></AppShell>;
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && 'status' in error && error.status === 401;
}
