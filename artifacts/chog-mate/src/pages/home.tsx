import { lazy, Suspense, useState } from 'react';
import { ArrowDownRight, BadgeCheck, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { useHealthCheck } from '@workspace/api-client-react';
import { AppShell, ChogArtwork, Eyebrow } from '@/components/shared';
const WalletAuthPanel = lazy(() => import('@/components/wallet-auth'));

export default function HomePage() {
  const [showWallet, setShowWallet] = useState(false);
  const [feedback, setFeedback] = useState('');
  const health = useHealthCheck();

  function connect() {
    setFeedback('');
    if (!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setFeedback('Wallet connection is not configured yet. Please try again later.');
      return;
    }
    setShowWallet(true);
  }

  return <AppShell>
    <section className="mx-auto grid max-w-[1240px] items-center gap-12 pb-10 pt-9 md:min-h-[calc(100dvh-120px)] md:grid-cols-[1.08fr_.92fr] md:gap-6 md:pt-0">
      <div className="page-enter relative z-[1] max-w-[620px]">
        {health.isError && <p className="mb-4 rounded-2xl border border-[#edc8bc] bg-[#fff2ec] px-4 py-3 text-xs leading-5 text-[#8b4232]" role="status" data-testid="status-service">CHOG MATE’s service isn’t responding right now. Wallet verification may be unavailable until it’s back.</p>}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-xl"><span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-[#d5bdff]"><ShieldCheck size={12} /></span>For verified Chog Genesis holders</div>
        <h1 className="display text-[54px] font-extrabold leading-[.97] tracking-[-.065em] text-white sm:text-[76px] lg:text-[92px]" data-testid="heading-home">MEET YOUR<br /><span className="relative inline-block text-[#c9a9ff]">CHOG MATE<span className="absolute -right-7 top-1 text-[#ffb568]"><Sparkles size={22} /></span></span><span className="text-white">.</span></h1>
        <div className="mt-7 flex items-center gap-3"><span className="h-px w-10 bg-[#b8a7ff]" /><p className="display text-[19px] font-bold tracking-[-.03em] text-violet-100">Meet. Match. Chog.</p></div>
        <p className="mt-5 max-w-[470px] text-[16px] leading-7 text-violet-100/75">Your Chog is already one of a kind. Meet the people who get it — for dates, friendships, ideas, and everything in between.</p>
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {showWallet ? <Suspense fallback={<button disabled className="button-primary min-h-[54px] rounded-full px-7 text-sm font-bold opacity-70">Preparing wallet…</button>}><WalletAuthPanel autoOpen /></Suspense> : <><button onClick={connect} className="button-primary inline-flex min-h-[54px] items-center gap-3 rounded-full px-7 text-sm font-bold" data-testid="button-connect-wallet">Connect wallet<ArrowDownRight size={17} /></button><span className="text-xs text-violet-100/65">A signature proves ownership. It never moves funds.</span></>}
        </div>
        {feedback && <p className="mt-4 max-w-lg rounded-2xl border border-[#edc8bc] bg-[#fff2ec] px-4 py-3 text-sm leading-5 text-[#8b4232]" role="alert" data-testid="status-wallet-error">{feedback}</p>}
        <div className="mt-10 flex items-center gap-5 border-t border-white/15 pt-6 text-xs font-medium text-violet-100/75"><span className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-[#c6a7ff]" />Verified holder identity</span><span className="inline-flex items-center gap-2"><Heart size={15} className="text-[#f1a5d4]" />Real people only</span></div>
      </div>
      <div className="relative mx-auto flex w-full max-w-[520px] items-center justify-center py-5 md:py-0">
        <div className="absolute left-[8%] top-[15%] h-28 w-28 rounded-full bg-[#9569ff] opacity-45 blur-[44px]" />
        <div className="absolute bottom-[10%] right-[3%] h-32 w-32 rounded-full bg-[#dc7bdf] opacity-35 blur-[48px]" />
        <div className="relative w-full max-w-[430px] rounded-[34px] border border-white/25 bg-white/10 p-3 shadow-[0_30px_90px_rgba(6,2,19,.52)] backdrop-blur-xl">
          <div className="relative h-[375px] overflow-hidden rounded-[26px] bg-[#dcd4ff] sm:h-[470px]">
            <ChogArtwork />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#24133fdd] via-[#24133f76] to-transparent px-6 pb-6 pt-32 text-white">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#e3dcff]"><span className="h-1.5 w-1.5 rounded-full bg-[#b9ffa9]" />Made for Chog holders</div>
              <p className="display text-[34px] font-extrabold leading-none tracking-[-.05em]">Your Chog.<br />Your people.</p>
              <p className="mt-3 max-w-[280px] text-sm leading-5 text-white/75">Discover real holders. Let the good connections be mutual.</p>
            </div>
            <div className="absolute right-4 top-4 rounded-full border border-white/50 bg-white/75 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#4f397d] shadow-sm backdrop-blur">Real holders only</div>
          </div>
          <div className="flex items-center justify-between px-3 pb-1 pt-4"><span className="text-xs font-semibold text-violet-100/80">A little more you, together.</span><span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-[#d7c3ff]"><ArrowDownRight size={16} /></span></div>
        </div>
        <div className="light-glass-card absolute -left-1 top-[20%] hidden rounded-2xl px-4 py-3 md:block"><Eyebrow>Meet your kind</Eyebrow><p className="display text-lg font-extrabold text-[#24133f]">Same collection.<br />Different stories.</p></div>
      </div>
    </section>
    <section className="mx-auto grid max-w-[1240px] gap-4 border-t border-white/15 py-8 sm:grid-cols-3">
      {[['01','Bring your Chog','Your wallet is your proof. No made-up profiles, no guesswork.'],['02','Find your people','Meet verified holders looking for the same kind of connection.'],['03','Make it mutual','A match only happens when the feeling goes both ways.']].map(([n,title,copy])=><div key={n} className="flex gap-4 rounded-2xl px-2 py-3"><span className="display text-sm font-extrabold text-[#c5a4ff]">{n}</span><div><h2 className="display font-extrabold text-white">{title}</h2><p className="mt-1 text-sm leading-5 text-violet-100/70">{copy}</p></div></div>)}
    </section>
  </AppShell>;
}
