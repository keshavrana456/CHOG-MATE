import type { ReactNode } from "react";
import {
  Compass,
  Heart,
  House,
  Image,
  MessageCircle,
  Settings,
  UserRound,
} from "lucide-react";
import "../_group.css";

const navItems = [
  { label: "Home", icon: House },
  { label: "Discover", icon: Compass },
  { label: "Matches", icon: Heart },
  { label: "Messages", icon: MessageCircle },
  { label: "My Chog", icon: Image },
  { label: "My Profile", icon: UserRound },
];

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell grain relative min-h-screen">
      <header className="topbar sticky top-0 z-20">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 md:px-9">
          <a href="#" className="inline-flex shrink-0 items-center gap-3">
            <img
              src="https://media1.tenor.com/m/I4kaCEPTjMUAAAAd/chog-monad.gif"
              alt="Chog waving hello"
              width={48}
              height={48}
              className="brand-mark"
            />
            <span className="display text-[22px] font-extrabold tracking-[-.07em] text-[#24133f]">
              CHOG MATE
            </span>
          </a>
          <nav
            className="nav-glass hidden items-center gap-0.5 rounded-full p-1 md:flex"
            aria-label="Main navigation"
          >
            {navItems.map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="#"
                aria-current={label === "My Profile" ? "page" : undefined}
                className={`nav-link flex items-center gap-1.5 rounded-full px-2 py-2 text-[11px] font-semibold lg:gap-2 lg:px-2.5 lg:text-xs xl:px-3 xl:text-[13px] ${
                  label === "My Profile" ? "active" : ""
                }`}
              >
                <Icon size={14} strokeWidth={2.2} />
                {label}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="glass-icon-button grid h-10 w-10 shrink-0 place-items-center rounded-full"
            aria-label="Settings"
          >
            <Settings size={16} />
          </a>
        </div>
      </header>
      <main className="relative z-[1] mx-auto w-full max-w-[1440px] px-5 pb-12 pt-7 md:px-9 md:pt-10">
        {children}
      </main>
    </div>
  );
}
