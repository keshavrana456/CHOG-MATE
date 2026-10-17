import { type FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, BadgeCheck, Check, ChevronDown, ExternalLink, Eye, LockKeyhole, LogOut, Save, ShieldCheck, Wallet } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { isAddress } from 'viem';
import { useConnection, useDisconnect } from 'wagmi';
import {
  getGetChogQueryKey, getGetMeQueryKey, getGetNftOwnershipQueryKey,
  useGetChog, useGetMe, useGetNftOwnership, useLogoutWallet, useSelectActiveChog, useUpdateMeProfile,
} from '@workspace/api-client-react';
import type { Chog, Profile, ProfileInput } from '@workspace/api-client-react';
import { AppShell, ChogArtwork, EmptyState, Eyebrow, PageTitle, QueryState } from '@/components/shared';
import {
  emptyManualTestProfileFields,
  readManualTestFlow,
  readManualTestProfile,
  writeManualTestProfile,
  type ManualTestProfileFields,
  type ManualTestProfileRecord,
} from '@/lib/manual-test-profile';
import { supabase } from '@/lib/supabase';

export function MyChogPage() {
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), refetchOnWindowFocus: true } });
  const wallet = me.data?.walletAddress || '';
  const ownershipKey = getGetNftOwnershipQueryKey(wallet);
  const ownership = useGetNftOwnership(wallet, { query:{ enabled:!!wallet, queryKey:ownershipKey, refetchOnWindowFocus:true } });
  const verifiedChogs = ownership.data?.verified ? ownership.data.chogs.filter(item=>item.verified) : [];
  const [selected, setSelected] = useState('');
  const tokenId = (verifiedChogs.some(item=>item.tokenId===selected) ? selected : '') ||
    (verifiedChogs.some(item=>item.tokenId===me.data?.selectedChogTokenId) ? me.data?.selectedChogTokenId : '') ||
    verifiedChogs[0]?.tokenId || '';
  const tokenKey = getGetChogQueryKey(tokenId);
  const chog = useGetChog(tokenId, { query:{ enabled:!!tokenId, queryKey:tokenKey } });
  const ownedCurrent = verifiedChogs.find(item=>item.tokenId===tokenId);
  const current = chog.data?.verified && chog.data.ownerWallet.toLowerCase()===wallet.toLowerCase() && verifiedChogs.some(item=>item.tokenId===chog.data?.tokenId) ? chog.data : ownedCurrent;
  const qc = useQueryClient();
  const selectActiveChog = useSelectActiveChog();
  const profile = me.data?.profile;
  const [notice, setNotice] = useState('');
  async function useAsProfileChog(tokenId: string) {
    setNotice('');
    if (!me.data?.hasProfile || !verifiedChogs.some(item=>item.tokenId===tokenId)) return;
    setSelected(tokenId);
    if (tokenId === me.data.selectedChogTokenId) return;
    try {
      await selectActiveChog.mutateAsync({data:{tokenId}});
      await Promise.all([
        qc.invalidateQueries({queryKey:getGetMeQueryKey()}),
        qc.invalidateQueries({queryKey:ownershipKey}),
      ]);
      setNotice(`Chog #${tokenId} is now active. Your profile details were unchanged.`);
    } catch {
      setSelected(me.data.selectedChogTokenId || '');
      setNotice('Couldn’t switch your active Chog. Ownership may have changed; refresh and try again.');
    }
  }
  function chooseChog(tokenId: string) {
    if (selectActiveChog.isPending) return;
    if (me.data?.hasProfile) {
      void useAsProfileChog(tokenId);
      return;
    }
    setSelected(tokenId);
    setNotice('');
  }
  return <AppShell displayName={profile?.displayName}><div className="page-enter">
    <PageTitle eyebrow="Your verified collection" title="My Chogs." description="Every Chog you own, in one place. Switch your active Chog without changing your profile details." />
    <QueryState loading={me.isLoading} error={me.isError} retry={()=>void me.refetch()}>
      {!me.data ? <EmptyState title="Connect your wallet first." detail="Your verified collection appears here after wallet sign-in."/> :
      <QueryState loading={ownership.isLoading} error={ownership.isError} retry={()=>void ownership.refetch()}>
        {!verifiedChogs.length ? <EmptyState title="No Chog Found" detail="A Chog NFT is required to create a CHOG MATE profile. Connect the wallet that owns a Chog NFT to continue." mark="cm"/> :
        <div className="space-y-6">
          <section className="surface rounded-[28px] p-5 sm:p-7">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <Eyebrow>Chog Genesis</Eyebrow>
                <h2 className="display text-[25px] font-extrabold text-[#24133f]">Your Chog collection</h2>
              </div>
              <p className="text-xs text-[#81758a]">{verifiedChogs.length} verified {verifiedChogs.length===1?'Chog':'Chogs'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {verifiedChogs.map(item => {
                const isSelected = item.tokenId === tokenId;
                return <button
                  type="button"
                  key={item.tokenId}
                  onClick={()=>chooseChog(item.tokenId)}
                  disabled={selectActiveChog.isPending}
                  aria-pressed={isSelected}
                  className={`group overflow-hidden rounded-[20px] border-2 bg-white text-left transition hover:-translate-y-0.5 ${isSelected?'border-[#8a63ff] shadow-[0_0_0_3px_#8a63ff1c]':'border-transparent hover:border-[#dacbf3]'}`}
                  data-testid={`card-owned-chog-${item.tokenId}`}
                >
                  <div className="relative aspect-square bg-[#f4eddf]">
                    <ChogArtwork chog={item}/>
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/85 px-2 py-1 text-[9px] font-bold text-[#447a43] shadow-sm backdrop-blur">
                      <BadgeCheck size={11}/> Verified
                    </span>
                    {me.data.selectedChogTokenId===item.tokenId && <span className="absolute right-2 top-2 rounded-full bg-[#7047ff] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">Active</span>}
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="display text-base font-extrabold text-[#24133f]">Chog #{item.tokenId}</p>
                    {item.tier && <p className="mt-1 text-[10px] font-semibold text-[#715795]">Tier: {item.tier}</p>}
                    <div className="mt-2 flex min-h-7 flex-wrap gap-1">
                      {item.traits?.slice(0,2).map((trait,index)=><span key={`${trait.traitType}-${index}`} className="max-w-full truncate rounded-full bg-[#f4effb] px-2 py-1 text-[9px] font-semibold text-[#715795]">{trait.traitType}: {trait.traitValue}</span>)}
                      {!item.traits?.length && <span className="text-[10px] text-[#958a9b]">No trait data returned</span>}
                    </div>
                    <span className="mt-3 block text-[10px] font-bold text-[#7047ff]">
                      {me.data.hasProfile
                        ? me.data.selectedChogTokenId===item.tokenId
                          ? 'Active identity · View details'
                          : selectActiveChog.isPending && selected===item.tokenId
                            ? 'Switching identity…'
                            : 'Select as active identity'
                        : 'Choose for your profile'}
                    </span>
                  </div>
                </button>;
              })}
            </div>
          </section>

          {current && <section className="surface overflow-hidden rounded-[28px]" aria-labelledby="selected-chog-details">
            <div className="grid md:grid-cols-[minmax(220px,.8fr)_1.2fr]">
              <div className="aspect-square max-h-[440px] bg-[#f4eddf] md:h-full md:aspect-auto"><ChogArtwork chog={current}/></div>
              <div className="p-5 sm:p-7">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef8ea] px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#447a43]" data-testid="status-verified"><BadgeCheck size={13}/>On-chain ownership verified</div>
                <Eyebrow>Selected NFT</Eyebrow>
                <h2 id="selected-chog-details" className="display break-all text-[32px] font-extrabold tracking-[-.06em] text-[#24133f]" data-testid="text-token-id">Chog #{current.tokenId}</h2>
                {current.name && <p className="mt-1 text-sm text-[#766a80]">{current.name}</p>}
                {current.tier && <p className="mt-2 inline-flex rounded-full bg-[#f2ecff] px-3 py-1.5 text-xs font-bold text-[#6246b0]" data-testid="text-chog-tier">Tier: {current.tier}</p>}
                {current.description && <p className="mt-3 max-w-xl text-sm leading-6 text-[#766a80]" data-testid="text-chog-description">{current.description}</p>}
                <div className="mt-5 space-y-2.5 text-xs text-[#80748b]">
                  <div className="flex items-start gap-2"><Wallet size={14} className="mt-0.5 shrink-0"/><span className="break-all" data-testid="text-owner-wallet">{current.ownerWallet}</span></div>
                  <div className="flex items-center gap-2"><ShieldCheck size={14}/><span>Contract: <span className="break-all">{current.contractAddress}</span></span></div>
                </div>
                {current.metadataUrl && <a href={current.metadataUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#7047ff]" data-testid="link-nft-metadata">View NFT metadata <ExternalLink size={13}/></a>}
                <div className="mt-6 border-t border-[#24133f10] pt-5">
                  <h3 className="display text-lg font-extrabold text-[#24133f]">Traits</h3>
                  {current.traits?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{current.traits.map((trait,index)=><div key={`${trait.traitType}-${index}`} className="flex items-start justify-between gap-3 rounded-2xl bg-[#faf6ef] px-3 py-2.5" data-testid={`trait-${index}`}><span className="text-[11px] font-medium text-[#887c91]">{trait.traitType}</span><span className="text-right text-[11px] font-bold text-[#453454]">{trait.traitValue}{typeof trait.rarity==='number' && <span className="mt-1 block text-[9px] font-medium text-[#9a8da0]">Rarity {trait.rarity}%</span>}</span></div>)}</div> : <p className="mt-3 rounded-2xl border border-dashed border-[#ded4c7] px-4 py-4 text-xs leading-5 text-[#897e8e]" data-testid="state-no-traits">No trait metadata was returned for this Chog. We won’t guess at what isn’t there.</p>}
                </div>
                {chog.isError && <p className="mt-4 text-xs text-[#aa4848]" data-testid="status-token-error">Token metadata could not be refreshed. The collection listing still comes from verified wallet ownership.</p>}
                {!me.data.hasProfile ? <Link href={`/profile?chog=${encodeURIComponent(current.tokenId)}`} className="button-primary mt-5 inline-flex rounded-full px-5 py-3 text-xs font-bold" data-testid="link-create-profile">Create your profile with Chog #{current.tokenId}</Link> :
                  <p className="mt-5 text-xs font-semibold text-[#447a43]" role="status" data-testid="status-active-chog">
                    {me.data.selectedChogTokenId===current.tokenId
                      ? `Chog #${current.tokenId} is your active identity.`
                      : selectActiveChog.isPending
                        ? `Switching to Chog #${current.tokenId}…`
                        : 'Select a Chog above to make it your active identity.'}
                  </p>}
                {selectActiveChog.isPending && <p className="mt-2 text-xs text-[#7047ff]" role="status">Revalidating ownership and switching your Chog…</p>}
                {notice && <p className={`mt-3 rounded-xl px-3 py-2 text-xs ${notice.startsWith('Chog #')?'bg-[#eef8ea] text-[#447a43]':'bg-[#fff2ec] text-[#914c3c]'}`} role="status">{notice}</p>}
              </div>
            </div>
          </section>}
        </div>}
      </QueryState>}
    </QueryState>
  </div></AppShell>;
}

const tags = (text: string) => text.split(',').map(value=>value.trim()).filter(Boolean);
const joinTags = (values?: string[]) => values?.join(', ') || '';

type ProfilePreviewData = Pick<
  Profile,
  | 'username'
  | 'displayName'
  | 'name'
  | 'gender'
  | 'age'
  | 'bio'
  | 'location'
  | 'timezone'
  | 'interests'
  | 'hobbies'
  | 'skills'
  | 'languages'
  | 'lookingFor'
  | 'chog'
>;

function ProfilePreview({profile,testMode=false}:{profile:ProfilePreviewData;testMode?:boolean}) {
  return <section className="surface overflow-hidden rounded-[28px]" aria-label="Public profile preview" data-testid="profile-preview">
    <div className="grid md:grid-cols-[230px_1fr]">
      <div className="aspect-square bg-[#f4eddf] md:h-full"><ChogArtwork chog={profile.chog}/></div>
      <div className="p-5 sm:p-7">
        <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] ${testMode?'bg-[#fff5da] text-[#79521a]':'bg-[#eef8ea] text-[#447a43]'}`}>{testMode?<Activity size={13}/>:<BadgeCheck size={13}/ >}{testMode?`TEST MODE · Chog #${profile.chog.tokenId}`:`Verified Chog holder · #${profile.chog.tokenId}`}</div>
        <h2 className="display text-3xl font-extrabold text-[#24133f]">{profile.displayName}</h2>
        <p className="mt-1 text-sm text-[#887c90]">@{profile.username}</p>
        <p className="mt-4 text-sm leading-6 text-[#6d6178]">{profile.bio || 'Add an introduction to help other Chog holders get to know you.'}</p>
        <div className="mt-4 grid gap-x-5 gap-y-2 text-xs text-[#796d83] sm:grid-cols-2">
          {profile.name && <p><span className="font-bold text-[#51445f]">Name</span> · {profile.name}</p>}
          {testMode && profile.age !== null && <p><span className="font-bold text-[#51445f]">Age</span> · {profile.age}</p>}
          {profile.gender && <p><span className="font-bold text-[#51445f]">Gender</span> · {profile.gender}</p>}
          {profile.location && <p><span className="font-bold text-[#51445f]">Location</span> · {profile.location}</p>}
          {profile.timezone && <p><span className="font-bold text-[#51445f]">Timezone</span> · {profile.timezone}</p>}
        </div>
        {profile.interests.length>0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">Interests</p><div className="mt-2 flex flex-wrap gap-2">{profile.interests.map(value=><span key={value} className="rounded-full bg-[#f2ecff] px-3 py-1.5 text-[11px] font-semibold text-[#6246b0]">{value}</span>)}</div></div>}
        {profile.hobbies.length>0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">Hobbies</p><div className="mt-2 flex flex-wrap gap-2">{profile.hobbies.map(value=><span key={value} className="rounded-full bg-[#f2ecff] px-3 py-1.5 text-[11px] font-semibold text-[#6246b0]">{value}</span>)}</div></div>}
        {profile.skills.length>0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">Skills</p><div className="mt-2 flex flex-wrap gap-2">{profile.skills.map(value=><span key={value} className="rounded-full border border-[#e9e1d7] px-3 py-1 text-[11px] text-[#7c7185]">{value}</span>)}</div></div>}
        {profile.languages.length>0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">Languages</p><div className="mt-2 flex flex-wrap gap-2">{profile.languages.map(value=><span key={value} className="rounded-full border border-[#e9e1d7] px-3 py-1 text-[11px] text-[#7c7185]">{value}</span>)}</div></div>}
        <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">Looking for</p><div className="mt-2 flex flex-wrap gap-2">{profile.lookingFor.map(value=><span key={value} className="rounded-full bg-[#fff6e9] px-3 py-1.5 text-[11px] font-semibold text-[#9b6b3c]">{value}</span>)}</div></div>
      </div>
    </div>
  </section>;
}

function testProfilePreview(
  fields: ManualTestProfileFields,
  chog: Chog,
): ProfilePreviewData {
  return {
    username: fields.username,
    displayName: fields.displayName,
    name: fields.name || null,
    gender: fields.gender || null,
    age: fields.age ? Number(fields.age) : null,
    bio: fields.bio || null,
    location: fields.location || null,
    timezone: fields.timezone || null,
    interests: tags(fields.interests),
    hobbies: tags(fields.hobbies),
    skills: tags(fields.skills),
    languages: tags(fields.languages),
    lookingFor: tags(fields.lookingFor),
    chog,
  };
}

function ManualTestProfilePage() {
  const [flow] = useState(readManualTestFlow);
  const [record, setRecord] = useState<ManualTestProfileRecord | null>(() =>
    flow?.selectedTokenId
      ? readManualTestProfile(flow.walletAddress, flow.selectedTokenId)
      : null,
  );
  const [notice, setNotice] = useState('');
  const ownership = useGetNftOwnership(flow?.walletAddress ?? '', {
    query: {
      enabled: Boolean(flow?.walletAddress && flow.selectedTokenId),
      queryKey: flow
        ? [
            ...getGetNftOwnershipQueryKey(flow.walletAddress),
            'manual-test-profile',
            flow.selectedTokenId,
          ]
        : ['manual-test-profile', 'no-selected-chog'],
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
    },
  });
  const chog =
    ownership.data?.verified && flow
      ? ownership.data.chogs.find(
          (item) =>
            item.verified &&
            item.tokenId === flow.selectedTokenId &&
            item.ownerWallet.toLowerCase() === flow.walletAddress.toLowerCase(),
        ) ?? null
      : null;

  function updateField(key: keyof ManualTestProfileFields, value: string) {
    if (!record) return;
    const next = { ...record, draft: { ...record.draft, [key]: value } };
    setRecord(next);
    setNotice('');
    try {
      writeManualTestProfile(next);
    } catch {
      setNotice('This browser could not save the test draft locally.');
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (!record || !flow || !chog) {
      setNotice('The selected Chog could not be verified again. Return to the scan and choose a current Chog.');
      return;
    }
    const fields = record.draft;
    if (!fields.displayName.trim()) {
      setNotice('Add a display name to continue.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{2,24}$/.test(fields.username.trim())) {
      setNotice('Use a username with 2–24 letters, numbers, or underscores.');
      return;
    }
    const age = fields.age.trim() ? Number(fields.age) : null;
    if (age !== null && (!Number.isInteger(age) || age < 18 || age > 120)) {
      setNotice('Age must be a whole number from 18 to 120, or left blank.');
      return;
    }
    if (!tags(fields.lookingFor).length) {
      setNotice('Add at least one connection type under Looking For.');
      return;
    }
    const savedFields = { ...fields, displayName: fields.displayName.trim(), username: fields.username.trim() };
    const next = { ...record, draft: savedFields, saved: savedFields };
    try {
      writeManualTestProfile(next);
      setRecord(next);
      setNotice('Test profile saved in this browser.');
    } catch {
      setNotice('This browser could not save the test profile. Check browser storage settings and try again.');
    }
  }

  return <AppShell>
    <div className="page-enter">
      <PageTitle
        eyebrow="Read-only wallet test"
        title="Create your profile."
        description="Use the selected Chog to preview the existing profile flow. This test profile is not published."
        action={<Link href="/" className="button-soft inline-flex items-center rounded-full px-4 py-2.5 text-xs font-bold" data-testid="link-test-profile-back-to-scan">Back to scan</Link>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e7c98b] bg-[#fff8e8] px-4 py-3 text-xs leading-5 text-[#79521a]" data-testid="notice-test-profile-local-only">
        <span className="rounded-full bg-[#f5e5bb] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.12em]">TEST MODE</span>
        <span>Address-only ownership check. Not connected or authenticated; profile data is saved only in this browser and is not visible to other users.</span>
      </div>
      {!flow || !flow.selectedTokenId ? (
        <EmptyState
          title="Choose a Chog to continue."
          detail="Return to the wallet scan, scan a valid address, then select one of its verified Chogs."
          action={<Link href="/" className="button-primary inline-flex rounded-full px-5 py-3 text-xs font-bold">Return to scan</Link>}
        />
      ) : ownership.isLoading ? (
        <p className="surface rounded-2xl px-5 py-4 text-sm text-[#766a80]" role="status">Rechecking Chog ownership before opening the test profile…</p>
      ) : ownership.isError ? (
        <div className="surface rounded-2xl p-5" role="alert">
          <p className="text-sm text-[#914c3c]">The selected Chog could not be rechecked. No profile data was submitted.</p>
          <button type="button" onClick={() => void ownership.refetch()} className="button-primary mt-4 rounded-full px-5 py-3 text-xs font-bold">Try again</button>
        </div>
      ) : !chog ? (
        <EmptyState
          title="No Chog Found"
          detail="The selected token is no longer verified as owned by this address. Return to the scan and choose a current Chog."
          action={<Link href="/" className="button-primary inline-flex rounded-full px-5 py-3 text-xs font-bold">Return to scan</Link>}
        />
      ) : record ? (
        <div className="space-y-5">
          {record.saved && <ProfilePreview profile={testProfilePreview(record.saved, chog)} testMode />}
          <form id="edit-profile" onSubmit={save} className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_330px]">
            <section className="surface rounded-[28px] p-5 sm:p-8">
              <div className="mb-5">
                <Eyebrow>CREATE YOUR PROFILE · TEST MODE</Eyebrow>
                <h2 className="display mt-1 text-2xl font-extrabold text-[#24133f]">Tell them a little more.</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Display name" value={record.draft.displayName} onChange={value=>updateField('displayName',value)} placeholder="How people will meet you" maxLength={48} testId="input-display-name"/>
                <Field label="Username" value={record.draft.username} onChange={value=>updateField('username',value.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="Your public handle" maxLength={24} prefix="@" testId="input-username"/>
                <Field label="Name" value={record.draft.name} onChange={value=>updateField('name',value)} placeholder="Name shown on your profile" maxLength={80} testId="input-profile-name"/>
                <label><span className="mb-2 block text-xs font-bold text-[#5c5067]">Age <span className="font-normal text-[#958a9b]">(optional)</span></span><input className="field" type="number" min="18" max="120" step="1" inputMode="numeric" value={record.draft.age} onChange={event=>updateField('age',event.target.value)} placeholder="18+" data-testid="input-profile-age"/><span className="mt-1 block text-[10px] text-[#9b8fa0]">If entered, use a whole number from 18 to 120.</span></label>
                <Field label="Gender" value={record.draft.gender} onChange={value=>updateField('gender',value)} placeholder="Optional" maxLength={50} testId="input-profile-gender"/>
                <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-[#5c5067]">Your introduction</span><textarea value={record.draft.bio} onChange={event=>updateField('bio',event.target.value)} maxLength={500} rows={4} className="field resize-y" placeholder="A little about what lights you up…" data-testid="input-bio"/><span className="mt-1 block text-right text-[10px] text-[#9c91a1]">{record.draft.bio.length}/500</span></label>
                <Field label="Location" value={record.draft.location} onChange={value=>updateField('location',value)} placeholder="City, region" maxLength={100} testId="input-location"/>
                <Field label="Timezone" value={record.draft.timezone} onChange={value=>updateField('timezone',value)} placeholder="e.g. UTC−5" maxLength={100} testId="input-timezone"/>
                <TagField label="Interests" value={record.draft.interests} onChange={value=>updateField('interests',value)} placeholder="Art, climbing, long reads" testId="input-interests"/>
                <TagField label="Hobbies" value={record.draft.hobbies} onChange={value=>updateField('hobbies',value)} placeholder="Hiking, cooking, photography" testId="input-hobbies"/>
                <TagField label="Skills" value={record.draft.skills} onChange={value=>updateField('skills',value)} placeholder="Design, writing, Solidity" testId="input-skills"/>
                <TagField label="Languages" value={record.draft.languages} onChange={value=>updateField('languages',value)} placeholder="English, Hindi, Spanish" testId="input-languages"/>
                <TagField label="What are you looking for?" value={record.draft.lookingFor} onChange={value=>updateField('lookingFor',value)} placeholder="Dates, friends, collaborators" testId="input-looking-for"/>
              </div>
              {notice && <p className={`mt-5 rounded-2xl px-4 py-3 text-sm ${notice.startsWith('Test profile saved')?'bg-[#eef8ea] text-[#447a43]':'bg-[#fff2ec] text-[#914c3c]'}`} role="status" data-testid="status-profile-save">{notice}</p>}
              <div className="mt-6 flex flex-col-reverse justify-between gap-4 border-t border-[#24133f10] pt-5 sm:flex-row sm:items-center">
                <p className="text-xs leading-5 text-[#908498]">This creates a local test preview only. It does not create an account, connect the scanned address, or publish your profile.</p>
                <button type="submit" className="button-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold" data-testid="button-save-profile"><Save size={16}/>Save profile</button>
              </div>
            </section>
            <aside className="surface h-fit rounded-[28px] p-5 sm:p-6">
              <Eyebrow>Selected test NFT</Eyebrow>
              <h2 className="display mt-1 text-2xl font-extrabold text-[#24133f]">Chog #{chog.tokenId}</h2>
              <div className="mt-4 aspect-square overflow-hidden rounded-2xl bg-[#f4eddf]"><ChogArtwork chog={chog}/></div>
              <p className="mt-4 break-all text-[10px] leading-5 text-[#82778c]">Scanned address: {flow.walletAddress}</p>
              <p className="mt-3 text-[11px] leading-5 text-[#998ea0]">The NFT image and token ID come from the verified Chog record. Ownership of the address is not proof that you control it.</p>
            </aside>
          </form>
        </div>
      ) : null}
    </div>
  </AppShell>;
}

export function ProfilePage() {
  return new URLSearchParams(window.location.search).get('mode') === 'test'
    ? <ManualTestProfilePage />
    : <ConnectedProfilePage />;
}

function ConnectedProfilePage() {
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), refetchOnWindowFocus: true } });
  const profile = me.data?.profile;
  const [username,setUsername] = useState('');
  const [displayName,setDisplayName] = useState('');
  const [name,setName] = useState('');
  const [gender,setGender] = useState('');
  const [age,setAge] = useState('');
  const [bio,setBio] = useState('');
  const [location,setLocation] = useState('');
  const [timezone,setTimezone] = useState('');
  const [interests,setInterests] = useState('');
  const [hobbies,setHobbies] = useState('');
  const [skills,setSkills] = useState('');
  const [languages,setLanguages] = useState('');
  const [lookingFor,setLookingFor] = useState('');
  const [selectedChogTokenId,setSelectedChogTokenId] = useState('');
  const [notice,setNotice] = useState('');
  const [profileVisible,setProfileVisible] = useState<boolean | null>(null);
  const [initialized,setInitialized] = useState(false);
  useEffect(()=>{
    if(!me.data || initialized) return;
    if(profile) {
      setUsername(profile.username); setDisplayName(profile.displayName); setName(profile.name||''); setGender(profile.gender||''); setAge(profile.age ? String(profile.age) : ''); setBio(profile.bio||'');
      setLocation(profile.location||''); setTimezone(profile.timezone||''); setInterests(joinTags(profile.interests));
      setHobbies(joinTags(profile.hobbies)); setSkills(joinTags(profile.skills));
      setLanguages(joinTags(profile.languages)); setLookingFor(joinTags(profile.lookingFor));
      setSelectedChogTokenId(me.data.selectedChogTokenId || profile.chog.tokenId);
      setProfileVisible(me.data.profileVisible ?? true);
    } else {
      const requestedTokenId = new URLSearchParams(window.location.search).get('chog');
      const requestedChog = me.data.chogs.find(chog=>chog.verified && chog.tokenId===requestedTokenId);
      setSelectedChogTokenId(requestedChog?.tokenId || '');
      setProfileVisible(true);
    }
    setInitialized(true);
  },[profile,me.data,initialized]);
  const update = useUpdateMeProfile();
  const selectActiveChog = useSelectActiveChog();
  const qc = useQueryClient();
  async function save(event: FormEvent) {
    event.preventDefault(); setNotice('');
    if (!lookingFor.trim()) { setNotice('Add at least one connection type to continue.'); return; }
    const tokenIdForSave = profile
      ? me.data?.selectedChogTokenId || profile.chog.tokenId
      : selectedChogTokenId;
    if (!tokenIdForSave) { setNotice('Choose a verified Chog to show on your profile.'); return; }
    const isDating = tags(lookingFor).some(value=>/date|romantic/i.test(value));
    const numericAge = age.trim() ? Number(age) : null;
    if (isDating && numericAge !== null && (!Number.isInteger(numericAge) || numericAge < 18 || numericAge > 120)) { setNotice('Dating profiles must use an age between 18 and 120.'); return; }
    const data: ProfileInput = { username:username.trim(),displayName:displayName.trim(),name:name.trim()||null,gender:gender.trim()||null,age:isDating?numericAge:null,bio:bio||undefined,location:location||undefined,timezone:timezone||undefined,interests:tags(interests),hobbies:tags(hobbies),skills:tags(skills),languages:tags(languages),lookingFor:tags(lookingFor),selectedChogTokenId:tokenIdForSave,...(profileVisible===null?{}:{profileVisible}) };
    try { await update.mutateAsync({data}); await qc.invalidateQueries({queryKey:getGetMeQueryKey()}); setNotice('Profile saved. Your story, your way.'); }
    catch { setNotice('Your profile couldn’t be saved. Check the fields and try again.'); }
  }
  async function switchActiveChog() {
    setNotice('');
    const walletAddress = me.data?.walletAddress;
    const chosen = me.data?.chogs.find(chog=>chog.verified && chog.tokenId===selectedChogTokenId);
    if (!profile || !walletAddress || !chosen || chosen.tokenId===me.data?.selectedChogTokenId) return;
    try {
      await selectActiveChog.mutateAsync({data:{tokenId:chosen.tokenId}});
      await Promise.all([
        qc.invalidateQueries({queryKey:getGetMeQueryKey()}),
        qc.invalidateQueries({queryKey:getGetNftOwnershipQueryKey(walletAddress)}),
      ]);
      setNotice(`Chog #${chosen.tokenId} is now active. Your profile details were unchanged.`);
    } catch {
      setNotice('Couldn’t switch your active Chog. Ownership may have changed; refresh and try again.');
    }
  }
  return <AppShell displayName={profile?.displayName}><div className="page-enter">
    <PageTitle eyebrow="Tell them a little more" title="Your profile." description="Your Chog proves you’re part of the community. The rest is yours to shape." action={<div className="flex flex-wrap gap-2"><a href="#edit-profile" className="button-primary inline-flex items-center rounded-full px-4 py-2.5 text-xs font-bold" data-testid="link-edit-profile">Edit profile</a><Link href="/my-chog" className="button-soft inline-flex items-center rounded-full px-4 py-2.5 text-xs font-bold" data-testid="link-profile-my-chog">My Chogs</Link><Link href="/settings" className="button-soft inline-flex items-center rounded-full px-4 py-2.5 text-xs font-bold" data-testid="link-profile-settings">Settings</Link></div>} />
    <QueryState loading={me.isLoading} error={me.isError} retry={()=>void me.refetch()}>
      {!me.data ? <EmptyState title="Connect to create your profile." detail="Sign in with the wallet holding your Chog Genesis NFT to get started."/> :
       (!me.data.hasChog || !me.data.chogs.some(chog=>chog.verified)) ? <EmptyState title="No Chog Found" detail="A Chog NFT is required to create a CHOG MATE profile. Connect the wallet that owns a Chog NFT to continue."/> :
       (me.data.hasProfile && !profile) ? <EmptyState title="Choose an active Chog." detail="Your previous active Chog is no longer in this wallet. Choose another verified Chog to restore your profile; your saved details will stay unchanged." action={<Link href="/my-chog" className="button-primary inline-flex rounded-full px-5 py-3 text-xs font-bold" data-testid="link-restore-active-chog">Choose a Chog</Link>}/> :
       <div className="space-y-5">
       {profile && <ProfilePreview profile={profile}/>}
       <form id="edit-profile" onSubmit={save} className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_330px]">
        <section className="surface rounded-[28px] p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="How people will meet you" maxLength={48} testId="input-display-name"/>
            <Field label="Username" value={username} onChange={v=>setUsername(v.replace(/[^a-zA-Z0-9_]/g,''))} placeholder="Your public handle" maxLength={24} prefix="@" testId="input-username"/>
             <Field label="Name" value={name} onChange={setName} placeholder="Name shown on your profile" maxLength={80} testId="input-profile-name"/>
             <Field label="Gender" value={gender} onChange={setGender} placeholder="Optional" maxLength={50} testId="input-profile-gender"/>
             {tags(lookingFor).some(value=>/date|romantic/i.test(value)) && <label><span className="mb-2 block text-xs font-bold text-[#5c5067]">Age <span className="font-normal text-[#958a9b]">(dating only)</span></span><input className="field" type="number" min="18" max="120" step="1" inputMode="numeric" value={age} onChange={event=>setAge(event.target.value)} placeholder="18+" data-testid="input-profile-age"/><span className="mt-1 block text-[10px] text-[#9b8fa0]">Shown to other holders only in Dating mode. You must be 18 or older.</span></label>}
            <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-[#5c5067]">Your introduction</span><textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} rows={4} className="field resize-y" placeholder="A little about what lights you up…" data-testid="input-bio"/><span className="mt-1 block text-right text-[10px] text-[#9c91a1]">{bio.length}/500</span></label>
            <Field label="Location" value={location} onChange={setLocation} placeholder="City, region" testId="input-location"/>
            <Field label="Timezone" value={timezone} onChange={setTimezone} placeholder="e.g. UTC−5" testId="input-timezone"/>
            <TagField label="Interests" value={interests} onChange={setInterests} placeholder="Art, climbing, long reads" testId="input-interests"/>
             <TagField label="Hobbies" value={hobbies} onChange={setHobbies} placeholder="Hiking, cooking, photography" testId="input-hobbies"/>
            <TagField label="Skills" value={skills} onChange={setSkills} placeholder="Design, writing, Solidity" testId="input-skills"/>
             <TagField label="Languages" value={languages} onChange={setLanguages} placeholder="English, Hindi, Spanish" testId="input-languages"/>
            <TagField label="What are you looking for?" value={lookingFor} onChange={setLookingFor} placeholder="Dates, friends, collaborators" testId="input-looking-for"/>
          </div>
          {notice && <p className={`mt-5 rounded-2xl px-4 py-3 text-sm ${notice.startsWith('Profile saved')?'bg-[#eef8ea] text-[#447a43]':'bg-[#fff2ec] text-[#914c3c]'}`} role="status" data-testid="status-profile-save">{notice}</p>}
          <div className="mt-6 flex flex-col-reverse justify-between gap-4 border-t border-[#24133f10] pt-5 sm:flex-row sm:items-center"><p className="text-xs text-[#908498]">Your wallet, verified ownership, and token ID can’t be edited.</p><button type="submit" disabled={update.isPending} className="button-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50" data-testid="button-save-profile"><Save size={16}/>{update.isPending?'Saving…':'Save profile'}</button></div>
        </section>
        <aside className="surface h-fit rounded-[28px] p-6">
           <Eyebrow>Verified Chogs</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">{profile?'Choose your active Chog.':'Choose your Chog.'}</h2>
           <div className="mt-5 grid grid-cols-2 gap-3">{me.data.chogs.filter(chog=>chog.verified).map(chog=><button type="button" onClick={()=>setSelectedChogTokenId(chog.tokenId)} key={chog.tokenId} className={`overflow-hidden rounded-2xl border-2 text-left transition ${selectedChogTokenId===chog.tokenId?'border-[#8a63ff] shadow-[0_0_0_3px_#8a63ff1c]':'border-transparent'}`} data-testid={`button-select-chog-${chog.tokenId}`}><div className="relative aspect-square"><ChogArtwork chog={chog}/>{me.data.selectedChogTokenId===chog.tokenId && <span className="absolute right-2 top-2 rounded-full bg-[#7047ff] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">Active</span>}</div><div className="bg-white px-3 py-2 text-xs font-bold text-[#51445f]">#{chog.tokenId}{chog.tier && <span className="mt-1 block text-[10px] font-medium text-[#715795]">Tier: {chog.tier}</span>}{selectedChogTokenId===chog.tokenId && <Check className="float-right text-[#7047ff]" size={14}/>}</div></button>)}</div>
           {profile ? <div className="mt-5 border-t border-[#24133f10] pt-5"><p className="text-xs leading-5 text-[#82778c]">Switching changes only your active Chog identity. Your name, username, bio, preferences, and other profile details stay the same.</p><button type="button" onClick={()=>void switchActiveChog()} disabled={selectActiveChog.isPending || !selectedChogTokenId || selectedChogTokenId===me.data.selectedChogTokenId} className="button-primary mt-4 w-full rounded-full px-5 py-3 text-xs font-bold disabled:opacity-50" data-testid="button-set-active-chog">{selectActiveChog.isPending?'Revalidating ownership…':selectedChogTokenId===me.data.selectedChogTokenId?'Active Chog':'Make active Chog'}</button></div> : <p className="mt-4 text-[11px] leading-5 text-[#998ea0]">Your selected Chog will become your active identity when you save your profile.</p>}
          <div className="mt-6 border-t border-[#24133f10] pt-5"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#51445f]"><Eye size={15}/> Profile discoverability</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setProfileVisible(true)} aria-pressed={profileVisible===true} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${profileVisible===true?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-profile-show">Show profile</button><button type="button" onClick={()=>setProfileVisible(false)} aria-pressed={profileVisible===false} className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${profileVisible===false?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-profile-hide">Hide from discovery</button></div><p className="mt-3 text-[11px] leading-5 text-[#998ea0]">{profileVisible===null?'Current visibility is not returned by the profile service. Choose an option to update it.':'Visibility is saved with your profile when you choose Save profile.'}</p></div>
        </aside>
       </form>
       </div>}
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
  const [scanInput,setScanInput]=useState('');
  const [scanAddress,setScanAddress]=useState('');
  const [scanNonce,setScanNonce]=useState(0);
  const [scanError,setScanError]=useState('');
  const walletScan=useGetNftOwnership(scanAddress,{query:{enabled:!!scanAddress,queryKey:[...getGetNftOwnershipQueryKey(scanAddress),scanNonce],refetchOnWindowFocus:false,retry:1}});
  const update=useUpdateMeProfile();
  const logout=useLogoutWallet();
  const walletConnection=useConnection();
  const walletDisconnect=useDisconnect();
  const qc=useQueryClient();
  const [,navigate]=useLocation();
  function scanWallet(event:FormEvent) {
    event.preventDefault();
    setScanError('');
    const address=scanInput.trim();
    if(!isAddress(address,{strict:false})) {
      setScanError('Enter a valid EVM wallet address and try again.');
      setScanAddress('');
      return;
    }
    setScanAddress(address);
    setScanNonce(value=>value+1);
  }
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
      await update.mutateAsync({data:{username:profile.username,displayName:profile.displayName,name:profile.name,gender:profile.gender,age:profile.age,bio:profile.bio||undefined,location:profile.location||undefined,timezone:profile.timezone||undefined,interests:profile.interests,hobbies:profile.hobbies,skills:profile.skills,languages:profile.languages,lookingFor:profile.lookingFor,selectedChogTokenId:currentMe.selectedChogTokenId || profile.chog.tokenId,profileVisible:visible}});
      await qc.invalidateQueries({queryKey:getGetMeQueryKey()}); setMessage('Discovery visibility updated.');
    } catch {setMessage('We couldn’t update visibility. Please try again.');}
  }
  async function signOut() { if(!window.confirm('Disconnect this wallet from CHOG MATE?')) return; try { await logout.mutateAsync(); if(supabase) await supabase.auth.signOut(); if(walletConnection.connector) await walletDisconnect.disconnectAsync({connector:walletConnection.connector}); await qc.clear(); navigate('/'); } catch { setMessage('Sign out did not complete. Please try again.'); } }
  return <AppShell displayName={profile?.displayName}><div className="page-enter">
    <PageTitle eyebrow="Your space, your rules" title="Settings." description="Keep your account comfortable, visible on your terms, and safe." />
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">{[['account','Account'],['discovery','Discovery'],['privacy','Privacy'],['safety','Safety']].map(([id,title])=><a key={id} href={`#${id}`} className="settings-tab shrink-0 rounded-full px-4 py-2.5 text-xs font-bold lg:block lg:rounded-2xl" data-testid={`link-settings-${id}`}>{title}</a>)}</aside>
      <div className="space-y-5">
        <section id="account" className="surface scroll-mt-24 rounded-[26px] p-6"><Eyebrow>Account</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">Wallet connection</h2>
          {me.isLoading ? <div className="skeleton mt-4 h-16 rounded-2xl"/> : me.data ? <div className="mt-4 flex flex-col justify-between gap-4 rounded-2xl bg-[#faf6ef] p-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eee8ff] text-[#7047ff]"><Wallet size={18}/></div><div><p className="text-xs font-bold text-[#594d64]">Connected wallet</p><p className="mt-1 break-all text-xs text-[#887c90]" data-testid="text-settings-wallet">{me.data.walletAddress}</p></div></div><button onClick={()=>void signOut()} disabled={logout.isPending||walletDisconnect.isPending} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e9d7d1] px-4 py-2.5 text-xs font-bold text-[#99534a] hover:bg-white disabled:opacity-50" data-testid="button-sign-out"><LogOut size={14}/>{logout.isPending||walletDisconnect.isPending?'Disconnecting…':'Disconnect wallet'}</button></div> : <p className="mt-3 text-sm text-[#887c90]">No connected wallet session. Connect from the home page to continue.</p>}
        </section>
        <section id="discovery" className="surface scroll-mt-24 rounded-[26px] p-6"><Eyebrow>Discovery & privacy</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">You choose who sees you.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#82778c]">When hidden, your profile won’t appear in discovery. You can still see your existing matches and conversations.</p>
          <p className="mt-5 text-xs font-bold text-[#5c5067]">Choose profile visibility</p><div className="mt-2 grid max-w-md grid-cols-2 gap-2"><button onClick={()=>setVisible(true)} aria-pressed={visible===true} className={`rounded-xl border px-3 py-3 text-xs font-bold ${visible===true?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-settings-show">Show me</button><button onClick={()=>setVisible(false)} aria-pressed={visible===false} className={`rounded-xl border px-3 py-3 text-xs font-bold ${visible===false?'border-[#8a63ff] bg-[#f2ecff] text-[#6246b0]':'border-[#e9e0d3] bg-white text-[#7c7185]'}`} data-testid="button-settings-hide">Hide me</button></div><p className="mt-2 text-[11px] leading-5 text-[#998ea0]">{visible===null?'Your current preference could not be loaded. Choose an option to update it.':`Your profile is currently ${visible?'visible':'hidden'} in discovery.`}</p>
          <button onClick={()=>void saveVisibility()} disabled={update.isPending||visible===null} className="button-primary mt-4 rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50" data-testid="button-save-visibility">{update.isPending?'Saving…':'Save visibility'}</button>
        </section>
        <section id="wallet-scanner" className="surface scroll-mt-24 rounded-[26px] p-6" aria-labelledby="wallet-scanner-title">
          <Eyebrow>On-chain verification</Eyebrow>
          <h2 id="wallet-scanner-title" className="display text-2xl font-extrabold text-[#24133f]">Chog wallet scanner</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#82778c]">Check any EVM address against the Chog Genesis NFT contract on Monad Mainnet. The scan reads current ownership from the chain; it does not check the $CHOG token.</p>
          <form onSubmit={scanWallet} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="flex-1"><span className="mb-2 block text-xs font-bold text-[#5c5067]">EVM wallet address</span><input className="field" value={scanInput} onChange={event=>setScanInput(event.target.value)} placeholder="0x..." autoComplete="off" spellCheck={false} aria-label="EVM wallet address" data-testid="input-wallet-scanner"/></label>
            <button type="submit" disabled={walletScan.isFetching} className="button-primary mt-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-5 text-xs font-bold disabled:opacity-55" data-testid="button-scan-wallet"><Activity size={15}/>{walletScan.isFetching?'Scanning wallet…':'Scan wallet'}</button>
          </form>
          <p className="mt-2 text-[10px] leading-5 text-[#9a8ea1]">Network: Monad Mainnet · Chain ID 143 · Chog Genesis contract 0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763</p>
          {scanError && <p role="alert" className="mt-4 rounded-2xl border border-[#edc8bc] bg-[#fff2ec] px-4 py-3 text-sm text-[#914c3c]" data-testid="status-wallet-scan-validation">{scanError}</p>}
          {scanAddress && walletScan.isFetching && <p role="status" className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f2ecff] px-4 py-3 text-sm font-semibold text-[#6246b0]" data-testid="status-wallet-scanning"><Activity size={15} className="animate-pulse"/>Scanning wallet on Monad…</p>}
          {scanAddress && walletScan.isError && !walletScan.isFetching && <p role="alert" className="mt-4 rounded-2xl border border-[#edc8bc] bg-[#fff2ec] px-4 py-3 text-sm leading-5 text-[#914c3c]" data-testid="status-wallet-scan-error">We couldn’t verify this wallet right now. A network or indexer error is not treated as zero Chogs; try scanning again.</p>}
          {scanAddress && walletScan.data && !walletScan.isFetching && walletScan.data.verified && <div className="mt-4 rounded-2xl border border-[#cde4c5] bg-[#f3faf0] p-4" role="status" data-testid="status-chog-found"><p className="flex items-center gap-2 text-sm font-extrabold text-[#447a43]"><BadgeCheck size={17}/>CHOG FOUND</p><p className="mt-1 break-all text-xs leading-5 text-[#687a65]">{walletScan.data.chogs.length} verified Chog{walletScan.data.chogs.length===1?'':'s'} held by {walletScan.data.walletAddress}.</p><div className="mt-3 flex flex-wrap gap-2">{walletScan.data.chogs.map(chog=><span key={chog.tokenId} className="rounded-full border border-[#d8e9d1] bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#4f7650]">Chog #{chog.tokenId}</span>)}</div></div>}
          {scanAddress && walletScan.data && !walletScan.isFetching && !walletScan.data.verified && <div className="mt-4 rounded-2xl border border-[#e5d8c8] bg-[#fffaf1] p-4" role="status" data-testid="status-no-chog"><p className="text-sm font-extrabold text-[#815f43]">NO CHOG FOUND</p><p className="mt-1 text-xs leading-5 text-[#8b7868]">This address currently has no verified Chog Genesis NFTs. CHOG MATE is only for verified Chog holders.</p></div>}
        </section>
        <section id="safety" className="surface scroll-mt-24 rounded-[26px] p-6"><Eyebrow>Safety</Eyebrow><h2 className="display text-2xl font-extrabold text-[#24133f]">A little care goes a long way.</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#faf6ef] p-4"><ShieldCheck className="text-[#7047ff]" size={19}/><h3 className="mt-3 text-sm font-bold text-[#51445f]">Verified holders only</h3><p className="mt-1 text-xs leading-5 text-[#8b8091]">Discovery is limited to people with verified Chog Genesis ownership.</p></div><div className="rounded-2xl bg-[#faf6ef] p-4"><LockKeyhole className="text-[#7047ff]" size={19}/><h3 className="mt-3 text-sm font-bold text-[#51445f]">Block and report</h3><p className="mt-1 text-xs leading-5 text-[#8b8091]">Use the safety menu on a discover profile to report or block someone.</p></div></div><div className="mt-4 rounded-2xl border border-dashed border-[#ded4c7] px-4 py-3 text-xs leading-5 text-[#8b8091]" data-testid="status-block-list-setup">Blocked-account management and export controls aren’t available in this version. Your report and block actions are still available from profiles.</div></section>
        {message && <p role="status" className="rounded-2xl bg-[#f2ecff] px-4 py-3 text-sm text-[#594285]" data-testid="status-settings">{message}</p>}
      </div>
    </div>
  </div></AppShell>;
}
