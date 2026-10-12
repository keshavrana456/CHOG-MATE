import { Router, type IRouter, type Request, type Response } from "express";
import {
  DiscoverProfilesQueryParams,
  DiscoverProfilesResponse,
  GetMeResponse,
  UpdateMeProfileBody,
  UpdateMeProfileResponse,
} from "@workspace/api-zod";
import { getAddress } from "viem";
import { calculateCompatibility } from "../lib/compatibility";
import { getOwnedChogs, isCurrentChogOwner } from "../lib/chogs";
import {
  loadProfileBundle,
  loadProfileBundles,
  profileToApi,
  SocialDataError,
  syncVerifiedChogs,
} from "../lib/social-data";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireWalletSession } from "../lib/wallet-auth";

const router: IRouter = Router();

router.get("/me", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;

  try {
    const chogs = await getOwnedChogs(getAddress(session.walletAddress));
    await syncVerifiedChogs(session.userId, session.walletAddress, chogs);
    const bundle = await loadProfileBundle(session.userId);
    const selected = bundle
      ? chogs.find((chog) => chog.tokenId === bundle.chog.tokenId) ?? null
      : null;
    const profile =
      bundle && selected
        ? {
            ...profileToApi(bundle),
            chog: selected,
          }
        : null;
    res.json(
      GetMeResponse.parse({
        walletAddress: session.walletAddress,
        hasChog: chogs.length > 0,
        chogs,
        selectedChogTokenId: selected?.tokenId ?? null,
        profileVisible: bundle?.profile.profile_visible ?? null,
        profile,
      }),
    );
  } catch (error) {
    sendProfileError(req, res, error);
  }
});

router.put("/me/profile", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const parsed = UpdateMeProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the profile details and try again." });
    return;
  }

  try {
    const chogs = await getOwnedChogs(getAddress(session.walletAddress));
    const selectedChog = chogs.find(
      (chog) => chog.tokenId === parsed.data.selectedChogTokenId,
    );
    if (!selectedChog) {
      res.status(403).json({
        error: "Choose a Chog Genesis NFT currently held by this wallet.",
      });
      return;
    }
    await syncVerifiedChogs(session.userId, session.walletAddress, chogs);
    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        user_id: session.userId,
        username: parsed.data.username,
        display_name: parsed.data.displayName,
        bio: parsed.data.bio ?? null,
        location: parsed.data.location ?? null,
        timezone: parsed.data.timezone ?? null,
        interests: parsed.data.interests,
        skills: parsed.data.skills,
        looking_for: parsed.data.lookingFor,
        selected_chog_token_id: selectedChog.tokenId,
        profile_visible: parsed.data.profileVisible ?? true,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      if (profileError.code === "23505") {
        res.status(409).json({ error: "That username is already taken." });
        return;
      }
      throw new SocialDataError("CHOG MATE database setup is incomplete.");
    }

    const { error: preferencesError } = await admin.from("preferences").upsert(
      {
        user_id: session.userId,
        looking_for: parsed.data.lookingFor,
        interests: parsed.data.interests,
        skills: parsed.data.skills,
        timezone: parsed.data.timezone ?? null,
        profile_visible: parsed.data.profileVisible ?? true,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
    if (preferencesError) {
      throw new SocialDataError("CHOG MATE database setup is incomplete.");
    }

    const bundle = await loadProfileBundle(session.userId, selectedChog.tokenId);
    if (!bundle) throw new SocialDataError("Your verified Chog could not be loaded.");
    res.json(UpdateMeProfileResponse.parse(profileToApi(bundle)));
  } catch (error) {
    sendProfileError(req, res, error);
  }
});

router.get("/discover", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const parsed = DiscoverProfilesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Those discovery settings are not valid." });
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    const currentProfile = await loadProfileBundle(session.userId);
    if (!currentProfile) {
      res.status(403).json({ error: "Complete your profile before discovering Chog holders." });
      return;
    }
    const limit = parsed.data.limit ?? 12;
    const offset = parseCursor(parsed.data.cursor);
    const [outBlocks, inBlocks, passes, likes, matchesA, matchesB] = await Promise.all([
      admin.from("blocks").select("blocked_user_id").eq("blocker_id", session.userId),
      admin.from("blocks").select("blocker_id").eq("blocked_user_id", session.userId),
      admin.from("passes").select("to_user_id").eq("from_user_id", session.userId),
      admin.from("likes").select("to_user_id").eq("from_user_id", session.userId),
      admin.from("matches").select("user_b").eq("user_a", session.userId).eq("status", "active"),
      admin.from("matches").select("user_a").eq("user_b", session.userId).eq("status", "active"),
    ]);
    if ([outBlocks, inBlocks, passes, likes, matchesA, matchesB].some((result) => result.error)) {
      throw new SocialDataError("CHOG MATE database setup is incomplete.");
    }

    const excluded = new Set<string>([
      session.userId,
      ...((outBlocks.data ?? []).map((row: { blocked_user_id: string }) => row.blocked_user_id)),
      ...((inBlocks.data ?? []).map((row: { blocker_id: string }) => row.blocker_id)),
      ...((passes.data ?? []).map((row: { to_user_id: string }) => row.to_user_id)),
      ...((likes.data ?? []).map((row: { to_user_id: string }) => row.to_user_id)),
      ...((matchesA.data ?? []).map((row: { user_b: string }) => row.user_b)),
      ...((matchesB.data ?? []).map((row: { user_a: string }) => row.user_a)),
    ]);

    const pageSize = Math.min(150, limit * 5);
    const { data: candidates, error: candidatesError } = await admin
      .from("profiles")
      .select("user_id")
      .eq("profile_visible", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (candidatesError) throw new SocialDataError("CHOG MATE database setup is incomplete.");

    const ids = (candidates ?? [])
      .map((row: { user_id: string }) => row.user_id)
      .filter((id: string) => !excluded.has(id));
    const bundles = await loadProfileBundles(ids);
    const ranked: Array<{
      bundle: NonNullable<Awaited<ReturnType<typeof loadProfileBundle>>>;
      score: number;
      reasons: string[];
      lastSeen: string;
    }> = [];

    for (const [userId, bundle] of bundles) {
      if (!matchesMode(bundle.profile.looking_for, parsed.data.mode ?? "discover")) continue;
      const ownsSelected = await isCurrentChogOwner(
        getAddress(bundle.user.wallet_address),
        bundle.chog.tokenId,
      );
      if (ownsSelected === null) {
        res.status(503).json({
          error: "Ownership checks are temporarily unavailable. Please try again.",
        });
        return;
      }
      if (!ownsSelected) {
        await admin
          .from("profiles")
          .update({ profile_visible: false, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        continue;
      }

      const compatibility = calculateCompatibility(
        {
          interests: currentProfile.profile.interests,
          looking_for: currentProfile.profile.looking_for,
          skills: currentProfile.profile.skills,
          location: currentProfile.profile.location,
          timezone: currentProfile.profile.timezone,
          chog: currentProfile.chog,
        },
        {
          interests: bundle.profile.interests,
          looking_for: bundle.profile.looking_for,
          skills: bundle.profile.skills,
          location: bundle.profile.location,
          timezone: bundle.profile.timezone,
          chog: bundle.chog,
        },
      );
      ranked.push({
        bundle,
        score: compatibility.score,
        reasons: compatibility.reasons,
        lastSeen: bundle.user.last_seen ?? bundle.user.created_at ?? "",
      });
    }

    ranked.sort((a, b) => b.score - a.score || b.lastSeen.localeCompare(a.lastSeen));
    const hasMoreCandidates = (candidates?.length ?? 0) === pageSize;
    res.json(
      DiscoverProfilesResponse.parse({
        profiles: ranked.slice(0, limit).map(({ bundle, score, reasons }) =>
          profileToApi(bundle, score, reasons),
        ),
        nextCursor: hasMoreCandidates ? String(offset + pageSize) : null,
      }),
    );
  } catch (error) {
    sendProfileError(req, res, error);
  }
});

function parseCursor(cursor?: string): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 10_000_000);
}

function matchesMode(lookingFor: string[], mode: string): boolean {
  const values = lookingFor.map((value) => value.trim().toLowerCase());
  const filters: Record<string, string[]> = {
    date: ["dating", "date"],
    friends: ["friends", "friendship"],
    network: ["networking", "business", "startup"],
    collab: ["collab", "creative", "gaming", "hackathon", "startup"],
  };
  const accepted = filters[mode];
  return !accepted || values.some((value) => accepted.some((item) => value.includes(item)));
}

function sendProfileError(
  req: Request,
  res: Response,
  error: unknown,
): void {
  if (error instanceof SocialDataError) {
    res.status(503).json({
      error: "CHOG MATE's database isn't ready yet. Apply the included Supabase migration and try again.",
    });
    return;
  }
  req.log.error(
    { errorType: error instanceof Error ? error.name : "UnknownError" },
    "Profile service failed",
  );
  res.status(503).json({
    error: "Your profile service is temporarily unavailable. Please try again.",
  });
}

export default router;
