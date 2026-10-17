import { BadgeCheck, Check, Eye, Save, ShieldCheck } from "lucide-react";
import "../_group.css";

export const chogImageUrl =
  "https://i2c.seadn.io/monad/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763/fc614010dd6a4ed9084ac7d31e5637/b0fc614010dd6a4ed9084ac7d31e5637.webp";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#a982ff]" />
      {children}
    </div>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="display text-[38px] font-extrabold leading-[1.04] text-[#24133f] sm:text-[48px]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-[15px] leading-6 text-[#74697b]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  value,
  placeholder,
  prefix,
}: {
  label: string;
  value?: string;
  placeholder: string;
  prefix?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold text-[#5c5067]">{label}</span>
      <span className="relative block">
        {prefix && (
          <span className="absolute left-3 top-3 text-[#9b8fa0]">{prefix}</span>
        )}
        <input
          className={`field ${prefix ? "pl-8" : ""}`}
          defaultValue={value}
          placeholder={placeholder}
          readOnly
        />
      </span>
    </label>
  );
}

export function TagField({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder: string;
}) {
  return (
    <label className="sm:col-span-2">
      <span className="mb-2 block text-xs font-bold text-[#5c5067]">{label}</span>
      <input
        className="field"
        defaultValue={value}
        placeholder={placeholder}
        readOnly
      />
      <span className="mt-1 block text-[10px] text-[#9b8fa0]">
        Separate each with a comma.
      </span>
    </label>
  );
}

export function ChogCard({ active = false }: { active?: boolean }) {
  return (
    <button
      type="button"
      className={`overflow-hidden rounded-2xl border-2 text-left transition ${
        active
          ? "border-[#8a63ff] shadow-[0_0_0_3px_#8a63ff1c]"
          : "border-transparent"
      }`}
    >
      <div className="relative aspect-square bg-[#f4eddf]">
        <img
          src={chogImageUrl}
          alt="Chog Genesis #1969"
          className="h-full w-full object-cover"
        />
        {active && (
          <span className="absolute right-2 top-2 rounded-full bg-[#7047ff] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
            Active
          </span>
        )}
        {active && <Check className="absolute bottom-3 right-3 text-white" size={16} />}
      </div>
      <div className="bg-white px-3 py-2 text-xs font-bold text-[#51445f]">
        #1969
        <span className="mt-1 block text-[10px] font-medium text-[#715795]">
          Genesis Chog
        </span>
      </div>
    </button>
  );
}

export function CurrentProfilePreview() {
  return (
    <section
      className="surface overflow-hidden rounded-[28px]"
      aria-label="Public profile preview"
    >
      <div className="grid md:grid-cols-[230px_1fr]">
        <div className="aspect-square bg-[#f4eddf] md:h-full">
          <img
            src={chogImageUrl}
            alt="Chog Genesis #1969"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-5 sm:p-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#eef8ea] px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#447a43]">
            <BadgeCheck size={13} />
            Verified Chog holder · #1969
          </div>
          <h2 className="display text-3xl font-extrabold text-[#24133f]">
            Maya
          </h2>
          <p className="mt-1 text-sm text-[#887c90]">@maya_builds</p>
          <p className="mt-4 text-sm leading-6 text-[#6d6178]">
            Chog collector and creative builder. Always up for good conversations,
            community ideas, and a long walk around the city.
          </p>
          <div className="mt-4 grid gap-x-5 gap-y-2 text-xs text-[#796d83] sm:grid-cols-2">
            <p><span className="font-bold text-[#51445f]">Name</span> · Maya</p>
            <p><span className="font-bold text-[#51445f]">Age</span> · 28</p>
            <p><span className="font-bold text-[#51445f]">Gender</span> · Woman</p>
            <p><span className="font-bold text-[#51445f]">Location</span> · Bengaluru</p>
            <p><span className="font-bold text-[#51445f]">Timezone</span> · UTC+5:30</p>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">
              Interests
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Art", "Community", "Travel"].map((value) => (
                <span key={value} className="rounded-full bg-[#f2ecff] px-3 py-1.5 text-[11px] font-semibold text-[#6246b0]">
                  {value}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">
              Hobbies
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Photography", "Hiking"].map((value) => (
                <span key={value} className="rounded-full bg-[#f2ecff] px-3 py-1.5 text-[11px] font-semibold text-[#6246b0]">
                  {value}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">
              Skills
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Design", "Writing"].map((value) => (
                <span key={value} className="rounded-full border border-[#e9e1d7] px-3 py-1 text-[11px] text-[#7c7185]">
                  {value}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">
              Languages
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["English", "Hindi"].map((value) => (
                <span key={value} className="rounded-full border border-[#e9e1d7] px-3 py-1 text-[11px] text-[#7c7185]">
                  {value}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9b8fa0]">
              Looking for
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Friends", "Collaborators"].map((value) => (
                <span key={value} className="rounded-full bg-[#fff6e9] px-3 py-1.5 text-[11px] font-semibold text-[#9b6b3c]">
                  {value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OriginalProfileActions({ saved = false }: { saved?: boolean }) {
  return (
    <>
      <a href="#" className="button-primary inline-flex items-center rounded-full px-4 py-2.5 text-xs font-bold">
        {saved ? "Edit profile" : "Save profile"}
      </a>
      <a href="#" className="button-soft inline-flex items-center rounded-full px-4 py-2.5 text-xs font-bold">
        My Chogs
      </a>
      <a href="#" className="button-soft inline-flex items-center rounded-full px-4 py-2.5 text-xs font-bold">
        Settings
      </a>
    </>
  );
}

export function CurrentAside({ saved = false }: { saved?: boolean }) {
  return (
    <aside className="surface h-fit rounded-[28px] p-6">
      <Eyebrow>Verified Chogs</Eyebrow>
      <h2 className="display text-2xl font-extrabold text-[#24133f]">
        {saved ? "Choose your active Chog." : "Choose your Chog."}
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <ChogCard active />
      </div>
      {saved ? (
        <div className="mt-5 border-t border-[#24133f10] pt-5">
          <p className="text-xs leading-5 text-[#82778c]">
            Switching changes only your active Chog identity. Your name,
            username, bio, preferences, and other profile details stay the same.
          </p>
          <button type="button" className="button-primary mt-4 w-full rounded-full px-5 py-3 text-xs font-bold">
            Make active Chog
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[11px] leading-5 text-[#998ea0]">
          Your selected Chog will become your active identity when you save your
          profile.
        </p>
      )}
      <div className="mt-6 border-t border-[#24133f10] pt-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#51445f]">
          <Eye size={15} /> Profile discoverability
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="rounded-xl border border-[#8a63ff] bg-[#f2ecff] px-3 py-2.5 text-xs font-bold text-[#6246b0]">
            Show profile
          </button>
          <button type="button" className="rounded-xl border border-[#e9e0d3] bg-white px-3 py-2.5 text-xs font-bold text-[#7c7185]">
            Hide from discovery
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[#998ea0]">
          Visibility is saved with your profile when you choose Save profile.
        </p>
      </div>
    </aside>
  );
}
