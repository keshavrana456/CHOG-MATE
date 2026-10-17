import "../_group.css";
import { AppLayout } from "./_shared/AppLayout";
import {
  CurrentAside,
  Field,
  OriginalProfileActions,
  PageTitle,
  TagField,
} from "./_shared/CurrentProfileBits";

export function CurrentCreateProfile() {
  return (
    <AppLayout>
      <div className="page-enter">
        <PageTitle
          eyebrow="Tell them a little more"
          title="Your profile."
          description="Your Chog proves you’re part of the community. The rest is yours to shape."
          action={
            <div className="flex flex-wrap gap-2">
              <OriginalProfileActions />
            </div>
          }
        />
        <form className="grid gap-6 lg:grid-cols-[1fr_330px]">
          <section className="surface rounded-[28px] p-5 sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Display name" placeholder="How people will meet you" />
              <Field label="Username" placeholder="Your public handle" prefix="@" />
              <Field label="Name" placeholder="Name shown on your profile" />
              <Field label="Gender" placeholder="Optional" />
              <label>
                <span className="mb-2 block text-xs font-bold text-[#5c5067]">
                  Age <span className="font-normal text-[#958a9b]">(dating only)</span>
                </span>
                <input className="field" type="number" min="18" max="120" placeholder="18+" readOnly />
                <span className="mt-1 block text-[10px] text-[#9b8fa0]">
                  Shown to other holders only in Dating mode. You must be 18 or
                  older.
                </span>
              </label>
              <Field label="Gender" placeholder="Optional" />
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold text-[#5c5067]">
                  Your introduction
                </span>
                <textarea
                  rows={4}
                  className="field resize-y"
                  placeholder="A little about what lights you up…"
                  readOnly
                />
                <span className="mt-1 block text-right text-[10px] text-[#9c91a1]">
                  0/500
                </span>
              </label>
              <Field label="Location" placeholder="City, region" />
              <Field label="Timezone" placeholder="e.g. UTC−5" />
              <TagField label="Interests" placeholder="Art, climbing, long reads" />
              <TagField label="Hobbies" placeholder="Hiking, cooking, photography" />
              <TagField label="Skills" placeholder="Design, writing, Solidity" />
              <TagField label="Languages" placeholder="English, Hindi, Spanish" />
              <TagField
                label="What are you looking for?"
                placeholder="Dates, friends, collaborators"
              />
            </div>
            <div className="mt-6 flex flex-col-reverse justify-between gap-4 border-t border-[#24133f10] pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-[#908498]">
                Your wallet, verified ownership, and token ID can’t be edited.
              </p>
              <button
                type="button"
                className="button-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
              >
                Create Profile
              </button>
            </div>
          </section>
          <CurrentAside />
        </form>
      </div>
    </AppLayout>
  );
}
