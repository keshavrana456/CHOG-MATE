import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, BadgeCheck, Heart, Settings, Sparkles, UserRound } from 'lucide-react';
import type { Chog, Profile } from '@workspace/api-client-react';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className="inline-flex items-center gap-3" data-testid="link-brand">
    <span className="brand-mark">cm</span>
    <span className={`display text-[19px] font-extrabold tracking-[-.07em] ${inverse ? 'text-[#fff4de]' : 'text-[#24133f]'}`}>CHOG MATE</span>
  </Link>;
}

const links = [
  { href: '/discover', label: 'Discover', icon: Sparkles },
  { href: '/matches', label: 'Matches', icon: Heart },
  { href: '/messages', label: 'Messages', icon: ArrowRight },
  { href: '/my-chog', label: 'My Chog', icon: BadgeCheck },
];

export function AppShell({ children, displayName }: { children: ReactNode; displayName?: string }) {
  const [path] = useLocation();
  return <div className="app-shell grain relative">
    <header className="topbar relative z-20 sticky top-0">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-9">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`nav-link flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold ${path === href ? 'active' : ''}`}><Icon size={15} strokeWidth={2.2} />{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/profile" className="hidden rounded-full px-4 py-2 text-[13px] font-semibold text-[#594c67] transition hover:bg-[#f2ecff] sm:block" data-testid="link-edit-profile">{displayName ? `Hi, ${displayName}` : 'Your profile'}</Link>
          <Link href="/settings" className="grid h-10 w-10 place-items-center rounded-full border border-[#e9e0d3] bg-[#fffdf8] text-[#554866] transition hover:border-[#b8a7ff]" aria-label="Settings" data-testid="link-settings"><Settings size={16}/></Link>
        </div>
      </div>
    </header>
    <main className="relative z-[1] mx-auto w-full max-w-[1440px] px-5 pb-28 pt-7 md:px-9 md:pb-12 md:pt-10">{children}</main>
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-7 border-t border-[#24133f12] bg-[#fffdf8ed] px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
      {[{ href: '/', label: 'Home', icon: Sparkles }, ...links, {href:'/profile',label:'Profile',icon:UserRound},{href:'/settings',label:'Settings',icon:Settings}].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] font-semibold ${path === href ? 'text-[#7047ff]' : 'text-[#80758b]'}`} data-testid={`mobile-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon size={18} strokeWidth={2} />{label}</Link>)}
    </nav>
  </div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#805ee0]"><span className="h-1.5 w-1.5 rounded-full bg-[#8a63ff]" />{children}</div>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><Eyebrow>{eyebrow}</Eyebrow><h1 className="display text-[38px] font-extrabold leading-[1.04] text-[#24133f] sm:text-[48px]" data-testid="heading-page">{title}</h1>{description && <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#7d7188]">{description}</p>}</div>{action}</div>;
}

export function EmptyState({ mark = 'cm', title, detail, action }: { mark?: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="surface flex min-h-[300px] flex-col items-center justify-center rounded-[28px] px-6 py-12 text-center" data-testid="state-empty">
    <div className="mb-5 grid h-[72px] w-[72px] place-items-center rounded-[25px] bg-[#f1ebff] text-[#7047ff]"><span className="display text-[27px] font-extrabold tracking-[-.1em]">{mark}</span></div>
    <h2 className="display max-w-md text-[24px] font-extrabold text-[#24133f]">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-[#82778c]">{detail}</p>{action && <div className="mt-6">{action}</div>}
  </div>;
}

export function QueryState({ loading, error, retry, children }: { loading: boolean; error: boolean; retry: () => void; children: ReactNode }) {
  if (loading) return <div className="grid gap-4 md:grid-cols-2"><div className="skeleton h-72 rounded-[28px]" /><div className="skeleton h-72 rounded-[28px]" /></div>;
  if (error) return <div className="surface rounded-[28px] px-6 py-12 text-center" data-testid="state-error"><h2 className="display text-2xl font-extrabold text-[#24133f]">That didn’t come through.</h2><p className="mt-2 text-sm text-[#82778c]">We couldn’t reach the CHOG MATE service. Your wallet and data haven’t changed.</p><button onClick={retry} className="button-soft mt-5 rounded-full px-5 py-2.5 text-sm font-bold" data-testid="button-retry">Try again</button></div>;
  return <>{children}</>;
}

export function ChogArtwork({ chog, className = '' }: { chog?: Chog | null; className?: string }) {
  if (chog?.imageUrl) return <img src={chog.imageUrl} alt={chog.name || `Verified Chog ${chog.tokenId}`} className={`h-full w-full object-cover ${className}`} />;
  return <div className={`flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#e8ddff,#dcd4ff_52%,#c6b3fa)] text-[#3e286a] ${className}`}><div className="grid h-20 w-20 place-items-center rounded-[28px] border border-white/50 bg-white/35 shadow-[0_12px_30px_#50329322] backdrop-blur"><span className="display text-3xl font-extrabold tracking-[-.1em]">cm</span></div><span className="mt-3 text-[10px] font-bold uppercase tracking-[.17em]">{chog ? `Chog #${chog.tokenId}` : 'CHOG MATE'}</span></div>;
}

export function ProfileAvatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-16 w-16' : size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  if (profile.chog?.imageUrl) return <img src={profile.chog.imageUrl} alt="" className={`${dimensions} rounded-full object-cover ring-2 ring-white`} />;
  return <div className={`${dimensions} grid shrink-0 place-items-center rounded-full bg-[#e7dcff] text-[#5435a2] ring-2 ring-white`}><span className="display text-lg font-extrabold">{profile.displayName?.slice(0, 1) || 'C'}</span></div>;
}
