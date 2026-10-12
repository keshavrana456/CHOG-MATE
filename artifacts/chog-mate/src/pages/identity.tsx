import { type FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, ChevronDown, ExternalLink, Eye, LockKeyhole, LogOut, Save, ShieldCheck, Wallet } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  getGetChogQueryKey, getGetMeQueryKey, getGetNftOwnershipQueryKey,
  useGetChog, useGetMe, useGetNftOwnership, useLogoutWallet, useUpdateMeProfile,
} from '@workspace/api-client-react';
import type { ProfileInput } from '@workspace/api-client-react';
import { AppShell, ChogArtwork, EmptyState, Eyebrow, PageTitle, QueryState } from '@/components/shared';
import { supabase } from '@/lib/supabase';

export function MyChogPage() {
  const me = useGetMe();
  const [selected, setSelected] = useState('');
  const wallet = me.data?.walletAddress || '';
  const ownershipKey = getGetNftOwnershipQueryKey(wallet);
  const ownership = useGetNftOwnership(wallet, { query:{ enabled:!!wallet, queryKey:ownershipKey } });
  const tokenId = selected || me.data?.selectedChogTokenId || ownership.data?.chogs.find(item=>item.verified)?.tokenId || me.data?.chogs?.find(item=>item.verified)?.tokenId || '';
  const tokenKey = getGetChogQueryKey(tokenId);
  const chog = useGetChog(tokenId, { query:{ enabled:!!tokenId, queryKey:tokenKey } });
  const verifiedChogs = ownership.data?.verified ? ownership.data.chogs.filter(item=>item.verified) : [];
  const ownedCurrent = verifiedChogs.find(item=>item.tokenId===tokenId);
  const current = chog.data?.verified && chog.data.ownerWallet.toLowerCase()===wallet.toLowerCase() && verifiedChogs.some(item=>item.tokenId===chog.data?.tokenId) ? chog.data : ownedCurrent;
  const qc = useQueryClient();
  const update = useUpdateMeProfile();
  const profile = me.data?.profile;
  async function select(token: string) {
    if (!profile) return;
    const previous=selected || me.data?.selectedChogTokenId || tokenId;
    setSelected(token);
    if (!token) return;
    const input: ProfileInput = {
      username:profile.username, displayName:profile.displayName, bio:profile.bio || undefined,
      location:profile.location || undefined, timezone:profile.timezone || undefined,
      interests:profile.interests, skills:profile.skills, lookingFor:profile.lookingFor,
      selectedChogTokenId:token,
    };
    try {
      await update.mutateAsync({data:input});
      await qc.invalidateQueries({queryKey:getGetMeQueryKey()});
    } catch { setSelected(previous); }
  }
  return <AppShell displayName={profile?.displayName}><div className="page-enter">
    <PageTitle eyebrow="Your verified identity" title="My Chog." description="This is the Chog Genesis NFT your wallet actually holds. The collection is your identity — never editable here." />
    <QueryState loading={me.isLoading} error={me.isError} retry={()=>void me.refetch()}>
      {!me.data ? <EmptyState title="Connect your wallet first." detail="Your verified collection appears here after wallet sign-in."/> :
      <QueryState loading={ownership.isLoading} error={ownership.isError} retry={()=>void ownership.refetch()}>
        {!verifiedChogs.length ? <EmptyState title="No verified Chog found." detail="We couldn’t verify a Chog Genesis NFT in this wallet. Connect the wallet that owns your Chog to continue." mark="cm"/> :
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="surface overflow-hidden rounded-[30px]">
            <div className="grid min-h-[380px] md:grid-cols-[1.08fr_.92fr]">
              <div className="min-h-[300px] bg-[#dcd4ff]"><ChogArtwork chog={current}/></div>
              <div className="flex flex-col justify-center p-7 sm:p-9">
                <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#eef8ea] px-3 py-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#447a43]" data-testid="status-verified"><BadgeCheck size={14}/>Ownership verified</div>
                <Eyebrow>CHOG GENESIS</Eyebrow>
                <h2 className="display break-all text-[34px] font-extrabold tracking-[-.06em] text-[#24133f]" data-testid="text-token-id">#{current?.tokenId || '—'}</h2>
                {current?.name && <p className="mt-1 text-sm text-[#766a80]">{current.name}</p>}
                <div className="mt-6 space-y-3 text-xs text-[#80748b]"><div className="flex items-center gap-2"><Wallet size={14}/><span className="break-all" data-testid="text-owner-wallet">{current?.ownerWallet || wallet}</span></div><div className="flex items-center gap-2"><ShieldCheck size={14}/><span>Verified on the connected wallet</span></div></div>
                {current?.metadataUrl && <a href={current.metadataUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#7047ff]" data-testid="link-nft-metadata">View NFT metadata <ExternalLink size={13}/></a>}
                {chog.isError && <p className="mt-4 text-xs text-[#aa4848]" data-testid="status-token-error">Token metadata could not be loaded. Ownership is still verified.</p>}
              </div>
            </div>
          </section>
          <aside className="surface rounded-[28px] p-6">
            <Eyebrow>Collection traits</Eyebrow><h2 className="display text-[25px] font-extrabold text-[#24133f]">Only the real details.</h2>
            {current?.traits?.length ? <div className="mt-5 space-y-2">{current.traits.map((trait,index)=><div key={`${trait.traitType}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl bg-[#faf6ef] px-4 py-3" data-testid={`trait-${index}`}><span className="text-xs font-medium text-[#887c91]">{trait.traitType}</span><span className="text-right text-xs font-bold text-[#453454]">{trait.traitValue}{typeof trait.rarity==='number' && <span className="mt-1 block text-[10px] font-medium text-[#9a8da0]">Rarity {trait.rarity}%</span>}</span></div>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-[#ded4c7] px-4 py-5 text-sm leading-6 text-[#897e8e]" data-testid="state-no-traits">No trait metadata was returned for this Chog. We won’t guess at what isn’t there.</div>}
            {verifiedChogs.length>1 && <div className="mt-6 border-t border-[#24133f10] pt-5"><label className="mb-2 block text-xs font-bold text-[#564a62]" htmlFor="select-chog">Choose your profile Chog</label><div className="relative"><select id="select-chog" value={selected || tokenId} onChange={e=>void select(e.target.value)} disabled={!profile || update.isPending} className="field appearance-none pr-10 disabled:opacity-55" data-testid="select-profile-chog">{verifiedChogs.map(item=><option key={item.tokenId} value={item.tokenId}>Chog #{item.tokenId}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-[#8b7e93]" size={16}/></div>{!profile && <p className="mt-2 text-xs leading-5 text-[#887c90]">Create a profile before setting your featured Chog. <Link href="/profile" className="font-bold text-[#7047ff] underline-offset-4 hover:underline" data-testid="link-create-profile">Build your profile</Link></p>}{update.isPending && <p className="mt-2 text-xs text-[#7047ff]">Updating profile Chog…</p>}{update.isError && <p className="mt-2 text-xs text-[#aa4848]">Couldn’t save your selection. Try again.</p>}</div>}
          </aside>
        </div>}
      </QueryState>}
    </QueryState>
  </div></AppShell>;
}

const tags = (text: string) => text.split(',').map(value=>value.trim()).filter(Boolean);
const joinTags = (values?: string[]) => values?.join(', ') || '';

export function ProfilePage() {
  const me = useGetMe();
  const profile = me.data?.profile;
  const [username,setUsername] = useState('');
  const [displayName,setDisplayName] = useState('');
  const [bio,setBio] = useState('');
  const [location,setLocation] = useState('');
  const [timezone,setTimezone] = useState('');
  const [interests,setInterests] = useState('');
  const [skills,setSkills] = useState('');
  const [lookingFor,setLookingFor] = useState('');
  const [selectedChogTokenId,setSelectedChogTokenId] = useState('');
  const [notice,setNotice] = useState('');
  const [profileVisible,setProfileVisible] = useState<boolean | null>(null);
  const [initialized,setInitialized] = useState(false);
  useEffect(()=>{
    if(profile && !initialized) {
      setUsername(profile.username); setDisplayName(profile.displayName); setBio(profile.bio||'');
      setLocation(profile.location||''); setTimezone(profile.timezone||''); setInterests(joinTags(profile.interests));
      setSkills(joinTags(profile.skills)); setLookingFor(joinTags(profile.lookingFor));
      setSelectedChogTokenId(me.data?.selectedChogTokenId || profile.chog.tokenId);
       setProfileVisible(me.data?.profileVisible ?? true);
      setInitialized(true);
    }
  },[profile,me.data?.selectedChogTokenId,initialized]);
  const update = useUpdateMeProfile();
  const qc = useQueryClient();
  async function save(event: FormEvent) {
    event.preventDefault(); setNotice('');
    if (!lookingFor.trim()) { setNotice('Add at least one connection type to continue.'); return; }
    if (!selectedChogTokenId) { setNotice('Choose a verified Chog to show on your profile.'); return; }
    const data: ProfileInput = { username:username.trim(),displayName:displayName.trim(),bio:bio||undefined,location:location||undefined,timezone:timezone||undefined,interests:tags(interests),skills:tags(skills),lookingFor:tags(lookingFor),selectedChogTokenId,...(profileVisible===null?{}:{profileVisible}) };
    try { await update.mutateAsync({data}); await qc.invalidateQueries({queryKey:getGetMeQueryKey()}); setNotice('Profile saved. Your story, your way.'); }
    catch { setNotice('Your profile couldn’t be saved. Check the fields and try again.'); }
  }
  return <AppShell displayName={profile?.displayName}><div className="page-enter">
    <PageTitle eyebrow="Tell them a little more" title="Your profile." description="Your Chog proves you’re part of the community. The rest is yours to shape." />
    <QueryState loading={me.isLoading} error={me.isError} retry={()=>void me.refetch()}>
      {!me.data ? <EmptyState title="Connect to create your profile." detail="Sign in with the wallet holding your Chog Genesis NFT to get started."/> :
      (!me.data.hasChog || !me.data.chogs.some(chog=>chog.verified)) ? <EmptyState title="Your Chog is your invitation." detail="We couldn’t verify a Chog Genesis NFT for this wallet, so profile discovery isn’t available yet."/> :
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_330px]">
        <section className="surface rounded-[28px] p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="How people will meet you" maxLength={48} testId="input-display-name"/>
            <Field label="Username" value={username} onChange={v=>setUsername(v.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="Your public handle" maxLength={24} prefix="@" testId="input-username"/>
            <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-[#5c5067]">Your introduction</span><textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={4} className="field resize-y" placeholder="A little about what lights you up…" data-testid="input-bio"/><span className="mt-1 block text-right text-[10px] text-[#9c91a1]">{bio.length}/500</span></label>
            <Field label="Location" value={location} onChange={setLocation} placeholder="City, region" testId="input-location"/>
            <Field label="Timezone" value={timezone} onChange={setTimezone} placeholder="e.g. UTC−5" testId="input-timezone"/>
            <TagField label="Interests" value={interests} onChange={setInterests} placeholder="Art, climbing, long reads" testId="input-interests"/>
            <TagField label="Skills" value={skills} onChange={setSkills} placeholder="Design, writing, Solidity" testId="input-skills"/>
            <TagField label="What are you looking for?" value={lookingFor} onChange={setLookingFor} placeholder="Dates, friends, collaborators" testId="input-looking-for"/>
          </div>
          {notice && <p className={`mt-5 rounded-2xl px-4 py-3 text-sm ${notice.startsWith('Profile saved')?'bg-[#eef8ea] text-[#447a43]':'bg-[#fff2ec] text-[#914c3c]'}`} role="status" data-testid="status-profile-save">{notice}</p>}
          <div className="mt-6 flex flex-col-reverse justify-between gap-4 border-t border-[#24133f10] pt-5 sm:flex-row sm:items-center"><p className="text-xs text-[#908498]">Your wallet, verified ownership, and token ID can’t be edited.</p><button type="submit" disabled={update.isPending} className="button-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50" data-testid="button-save-profile"><Save size={16}/>{update.isPending?'Saving…':'Save profile'}</button></div>
        </section>
        <aside className="surface h-fit rounded-[28px] p-6">
          <Eyebrow>Verified Chogs</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">Show this one.</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">{me.data.chogs.filter(chog=>chog.verified).map(chog=><button type="button" onClick={()=>setSelectedChogTokenId(chog.tokenId)} key={chog.tokenId} className={`overflow-hidden rounded-2xl border-2 text-left transition ${selectedChogTokenId===chog.tokenId?'border-[#8a63ff] shadow-[0_0_0_3px_#8a63ff1c]':'border-transparent'}`} data-testid={`button-select-chog-${chog.tokenId}`}><div className="aspect-square"><ChogArtwork chog={chog}/></div><div className="bg-white px-3 py-2 text-xs font-bold text-[#51445f]">#{chog.tokenId}{selectedChogTokenId===chog.tokenId && <Check className="float-right text-[#7047ff]" size={14}/>}</div></button>)}</div>
          <div className="mt-6 border-t border-[#24133f10] pt-5"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#51445f]"><Eye size={15}/> Profile discoverability</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setProfileVisible(true)} aria-pressed={profileVisible===true} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${profileVisible===true?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-profile-show">Show profile</button><button type="button" onClick={()=>setProfileVisible(false)} aria-pressed={profileVisible===false} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${profileVisible===false?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-profile-hide">Hide from discovery</button></div><p className="mt-3 text-[11px] leading-5 text-[#998ea0]">{profileVisible===null?'Current visibility is not returned by the profile service. Choose an option to update it.':'Visibility is saved with your profile when you choose Save profile.'}</p></div>
        </aside>
      </form>}
    </QueryState>
  </div></AppShell>;
}

function Field({label,value,onChange,placeholder,maxLength,prefix,testId}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;maxLength?:number;prefix?:string;testId:string}) {
  return <label><span className="mb-2 block text-xs font-bold text-[#5c5067]">{label}</span><span className="relative block">{prefix && <span className="absolute left-3 top-3 text-[#9b8fa0]">{prefix}</span>}<input className={`field ${prefix?'pl-8':''}`} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} data-testid={testId}/></span></label>;
}
function TagField({label,value,onChange,placeholder,testId}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;testId:string}) {
  return <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-[#5c5067]">{label}</span><input className="field" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} data-testid={testId}/><span className="mt-1 block text-[10px] text-[#9b8fa0]">Separate each with a comma.</span></label>;
}

export function SettingsPage() {
  const me=useGetMe();
  const profile=me.data?.profile;
  const [visible,setVisible]=useState<boolean|null>(null);
  const [message,setMessage]=useState('');
  const update=useUpdateMeProfile();
  const logout=useLogoutWallet();
  const qc=useQueryClient();
  const [,navigate]=useLocation();
  useEffect(() => {
    if (visible === null && me.data?.profileVisible !== null && me.data?.profileVisible !== undefined) {
      setVisible(me.data.profileVisible);
    }
  }, [me.data?.profileVisible, visible]);
  async function saveVisibility() {
    const currentMe=me.data;
    if (!profile || !currentMe || !(currentMe.selectedChogTokenId || profile.chog.tokenId)) { setMessage('Create your profile and choose a Chog before changing discovery visibility.'); return; }
    if (visible===null) { setMessage('Choose whether your profile should appear in discovery.'); return; }
    try {
      await update.mutateAsync({data:{username:profile.username,displayName:profile.displayName,bio:profile.bio||undefined,location:profile.location||undefined,timezone:profile.timezone||undefined,interests:profile.interests,skills:profile.skills,lookingFor:profile.lookingFor,selectedChogTokenId:currentMe.selectedChogTokenId || profile.chog.tokenId,profileVisible:visible}});
      await qc.invalidateQueries({queryKey:getGetMeQueryKey()}); setMessage('Discovery visibility updated.');
    } catch {setMessage('We couldn’t update visibility. Please try again.');}
  }
  async function signOut() { if(!window.confirm('Disconnect this wallet from CHOG MATE?')) return; try { await logout.mutateAsync(); if(supabase) await supabase.auth.signOut(); const wallet = await import('@/lib/appkit'); await wallet.appKit?.disconnect('eip155'); await qc.clear(); navigate('/'); } catch { setMessage('Sign out did not complete. Please try again.'); } }
  return <AppShell displayName={profile?.displayName}><div className="page-enter">
    <PageTitle eyebrow="Your space, your rules" title="Settings." description="Keep your account comfortable, visible on your terms, and safe." />
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">{[['account','Account'],['discovery','Discovery'],['privacy','Privacy'],['safety','Safety']].map(([id,title])=><a key={id} href={`#${id}`} className="settings-tab shrink-0 rounded-full px-4 py-2.5 text-xs font-bold lg:block lg:rounded-2xl" data-testid={`link-settings-${id}`}>{title}</a>)}</aside>
      <div className="space-y-5">
        <section id="account" className="surface scroll-mt-24 rounded-[26px] p-6"><Eyebrow>Account</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">Wallet connection</h2>
          {me.isLoading ? <div className="skeleton mt-4 h-16 rounded-2xl"/> : me.data ? <div className="mt-4 flex flex-col justify-between gap-4 rounded-2xl bg-[#faf6ef] p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee8ff] text-[#7047ff]"><Wallet size={18}/></div><div><p className="text-xs font-bold text-[#594d64]">Connected wallet</p><p className="mt-1 break-all text-xs text-[#887c90]" data-testid="text-settings-wallet">{me.data.walletAddress}</p></div></div><button onClick={()=>void signOut()} disabled={logout.isPending} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e9d7d1] px-4 py-2.5 text-xs font-bold text-[#99534a] hover:bg-white disabled:opacity-50" data-testid="button-sign-out"><LogOut size={14}/>{logout.isPending?'Disconnecting…':'Disconnect wallet'}</button></div> : <p className="mt-3 text-sm text-[#887c90]">No connected wallet session. Connect from the home page to continue.</p>}
        </section>
        <section id="discovery" className="surface scroll-mt-24 rounded-[26px] p-6"><Eyebrow>Discovery & privacy</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">You choose who sees you.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#82778c]">When hidden, your profile won’t appear in discovery. You can still see your existing matches and conversations.</p>
          <p className="mt-5 text-xs font-bold text-[#5c5067]">Choose profile visibility</p><div className="mt-2 grid max-w-md grid-cols-2 gap-2"><button onClick={()=>setVisible(true)} aria-pressed={visible===true} className={`rounded-xl border px-3 py-3 text-xs font-bold ${visible===true?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-settings-show">Show me</button><button onClick={()=>setVisible(false)} aria-pressed={visible===false} className={`rounded-xl border px-3 py-3 text-xs font-bold ${visible===false?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-settings-hide">Hide me</button></div><p className="mt-2 text-[11px] leading-5 text-[#998ea0]">{visible===null?'Your current preference could not be loaded. Choose an option to update it.':`Your profile is currently ${visible?'visible':'hidden'} in discovery.`}</p>
          <button onClick={()=>void saveVisibility()} disabled={update.isPending||visible===null} className="button-primary mt-4 rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50" data-testid="button-save-visibility">{update.isPending?'Saving…':'Save visibility'}</button>
        </section>
        <section id="safety" className="surface scroll-mt-24 rounded-[26px] p-6"><Eyebrow>Safety</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">A little care goes a long way.</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#faf6ef] p-4"><ShieldCheck className="text-[#7047ff]" size={19}/><h3 className="mt-3 text-sm font-bold text-[#51445f]">Verified holders only</h3><p className="mt-1 text-xs leading-5 text-[#8b8091]">Discovery is limited to people with verified Chog Genesis ownership.</p></div><div className="rounded-2xl bg-[#faf6ef] p-4"><LockKeyhole className="text-[#7047ff]" size={19}/><h3 className="mt-3 text-sm font-bold text-[#51445f]">Block and report</h3><p className="mt-1 text-xs leading-5 text-[#8b8091]">Use the safety menu on a discover profile to report or block someone.</p></div></div><div className="mt-4 rounded-2xl border border-dashed border-[#ded4c7] px-4 py-3 text-xs leading-5 text-[#8b8091]" data-testid="status-block-list-setup">Blocked-account management and export controls aren’t available in this version. Your report and block actions are still available from profiles.</div></section>
        {message && <p role="status" className="rounded-2xl bg-[#f2ecff] px-4 py-3 text-sm text-[#594285]" data-testid="status-settings">{message}</p>}
      </div>
    </div>
  </div></AppShell>;
}
