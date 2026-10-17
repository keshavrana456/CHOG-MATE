import "../_group.css";
import { AppLayout } from "./_shared/AppLayout";
import {
  CurrentAside,
  CurrentProfilePreview,
  Field,
  OriginalProfileActions,
  PageTitle,
  TagField,
} from "./_shared/CurrentProfileBits";

export function CurrentMyProfile() {
  return (
    <AppLayout>
      <div className="page-enter">
        <PageTitle
          eyebrow="Tell them a little more"
          title="Your profile."
          description="Your Chog proves you’re part of the community. The rest is yours to shape."
          action={
            <div className="flex flex-wrap gap-2">
              <OriginalProfileActions saved />
            </div>
          }
        />
        <div className="space-y-5">
          <CurrentProfilePreview />
          <form className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_330px]">
            <section className="surface rounded-[28px] p-5 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Display name" value="Maya" placeholder="How people will meet you" />
                <Field label="Username" value="maya_builds" placeholder="Your public handle" prefix="@" />
                <Field label="Name" value="Maya" placeholder="Name shown on your profile" />
                <Field label="Gender" value="Woman" placeholder="Optional" />
                <label>
                  <span className="mb-2 block text-xs font-bold text-[#5c5067]">
                    Age <span className="font-normal text-[#958a9b]">(dating only)</span>
                  </span>
                  <input className="field" type="number" min="18" max="120" value="28" readOnly />
                  <span className="mt-1 block text-[10px] text-[#9b8fa0]">
                    Shown to other holders only in Dating mode. You must be 18 or
                    older.
                  </span>
                </label>
                <label className="sm:col-span-2">
                  <span className="mb-2 block text-xs font-bold text-[#5c5067]">
                    Your introduction
                  </span>
                  <textarea
                    value="Chog collector and creative builder. Always up for good conversations, community ideas, and a long walk around the city."
                    rows={4}
                    className="field resize-y"
                    readOnly
                  />
                </label>
                <Field label="Location" value="Bengaluru" placeholder="City, region" />
                <Field label="Timezone" value="UTC+5:30" placeholder="e.g. UTC−5" />
                <TagField label="Interests" value="Art, Community, Travel" placeholder="Art, climbing, long reads" />
                <TagField label="Hobbies" value="Photography, Hiking" placeholder="Hiking, cooking, photography" />
                <TagField label="Skills" value="Design, Writing" placeholder="Design, writing, Solidity" />
                <TagField label="Languages" value="English, Hindi" placeholder="English, Hindi, Spanish" />
                <TagField label="What are you looking for?" value="Friends, Collaborators" placeholder="Dates, friends, collaborators" />
              </div>
              <div className="mt-6 flex flex-col-reverse justify-between gap-4 border-t border-[#24133f10] pt-5 sm:flex-row sm:items-center">
                <p className="text-xs text-[#908498]">
                  Your wallet, verified ownership, and token ID can’t be edited.
                </p>
                <button
                  type="button"
                  className="button-primary inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold"
                >
                  Save profile
                </button>
              </div>
            </section>
            <CurrentAside saved />
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
