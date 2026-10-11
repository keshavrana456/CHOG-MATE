import { Router, type IRouter, type Request, type Response } from "express";
import {
  BlockProfileBody,
  GetMatchesResponse,
  GetMessagesParams,
  GetMessagesResponse,
  ReportProfileBody,
  SendMessageBody,
  SendMessageParams,
  SendMessageResponse,
  SwipeProfileBody,
  SwipeProfileResponse,
  UnmatchProfileParams,
} from "@workspace/api-zod";
import { getAddress } from "viem";
import { calculateCompatibility } from "../lib/compatibility";
import { isCurrentChogOwner } from "../lib/chogs";
import {
  loadProfileBundle,
  loadProfileBundles,
  profileToApi,
  SocialDataError,
} from "../lib/social-data";
import { getSupabaseAdmin } from "../lib/supabase";
import { requireWalletSession, type WalletSession } from "../lib/wallet-auth";

const router: IRouter = Router();

interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  compatibility_score: number;
  status: "active" | "unmatched";
  created_at: string;
  last_activity: string | null;
}

class EligibilityError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

router.post("/swipes", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const parsed = SwipeProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "That swipe could not be recorded." });
    return;
  }

  try {
    const current = await requireEligibleProfile(session);
    const targetId = parsed.data.targetUserId;
    if (targetId === session.userId) {
      res.status(400).json({ error: "You can't swipe on your own profile." });
      return;
    }
    const targetMap = await loadProfileBundles([targetId]);
    const target = targetMap.get(targetId);
    if (!target) {
      res.status(404).json({ error: "This profile is no longer available." });
      return;
    }
    const targetOwns = await isCurrentChogOwner(
      getAddress(target.user.wallet_address),
      target.chog.tokenId,
    );
    if (targetOwns === null) {
      res.status(503).json({ error: "Ownership checks are temporarily unavailable." });
      return;
    }
    if (!targetOwns) {
      res.status(404).json({ error: "This profile is no longer available." });
      return;
    }

    const admin = getSupabaseAdmin();
    const [fromBlock, toBlock] = await Promise.all([
      admin
        .from("blocks")
        .select("id")
        .eq("blocker_id", session.userId)
        .eq("blocked_user_id", targetId)
        .maybeSingle(),
      admin
        .from("blocks")
        .select("id")
        .eq("blocker_id", targetId)
        .eq("blocked_user_id", session.userId)
        .maybeSingle(),
    ]);
    if (fromBlock.error || toBlock.error) throw new SocialDataError("Database unavailable.");
    if (fromBlock.data || toBlock.data) {
      res.status(404).json({ error: "This profile is no longer available." });
      return;
    }

    const compatibility = calculateCompatibility(
      {
        interests: current.profile.interests,
        looking_for: current.profile.looking_for,
        skills: current.profile.skills,
        location: current.profile.location,
        timezone: current.profile.timezone,
        chog: current.chog,
      },
      {
        interests: target.profile.interests,
        looking_for: target.profile.looking_for,
        skills: target.profile.skills,
        location: target.profile.location,
        timezone: target.profile.timezone,
        chog: target.chog,
      },
    );
    const { data, error } = await admin.rpc("record_swipe", {
      p_from_user_id: session.userId,
      p_to_user_id: targetId,
      p_action: parsed.data.action,
      p_compatibility: compatibility.score,
    });
    if (error) throw new SocialDataError("CHOG MATE matching is not ready yet.");

    const result = data as { matched?: boolean; matchId?: string | null } | null;
    const matched = Boolean(result?.matched && result.matchId);
    let match: unknown = null;
    if (matched && result?.matchId) {
      const { data: matchRow, error: matchError } = await admin
        .from("matches")
        .select("*")
        .eq("id", result.matchId)
        .single();
      if (matchError || !matchRow) throw new SocialDataError("The new match could not be loaded.");
      const row = matchRow as MatchRow;
      const matchProfile = row.user_a === session.userId ? target : current;
      match = {
        id: row.id,
        profile: profileToApi(matchProfile),
        compatibility: row.compatibility_score,
        createdAt: row.created_at,
        lastActivity: row.last_activity,
        unreadCount: 0,
      };
    }

    res.json(
      SwipeProfileResponse.parse({
        recorded: true,
        matched,
        ...(matched ? { match } : {}),
      }),
    );
  } catch (error) {
    sendSocialError(req, res, error);
  }
});

router.get("/matches", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;

  try {
    await requireEligibleProfile(session);
    const admin = getSupabaseAdmin();
    const [asA, asB] = await Promise.all([
      admin
        .from("matches")
        .select("*")
        .eq("user_a", session.userId)
        .eq("status", "active")
        .order("last_activity", { ascending: false, nullsFirst: false }),
      admin
        .from("matches")
        .select("*")
        .eq("user_b", session.userId)
        .eq("status", "active")
        .order("last_activity", { ascending: false, nullsFirst: false }),
    ]);
    if (asA.error || asB.error) throw new SocialDataError("CHOG MATE matching is not ready yet.");

    const rows = [...((asA.data ?? []) as MatchRow[]), ...((asB.data ?? []) as MatchRow[])];
    rows.sort((a, b) => (b.last_activity ?? b.created_at).localeCompare(a.last_activity ?? a.created_at));
    const otherIds = rows.map((row) => (row.user_a === session.userId ? row.user_b : row.user_a));
    const bundles = await loadProfileBundles(otherIds);

    const matches = [];
    for (const row of rows) {
      const otherId = row.user_a === session.userId ? row.user_b : row.user_a;
      const bundle = bundles.get(otherId);
      if (!bundle) continue;
      const owns = await isCurrentChogOwner(getAddress(bundle.user.wallet_address), bundle.chog.tokenId);
      if (owns === null) {
        res.status(503).json({ error: "Ownership checks are temporarily unavailable." });
        return;
      }
      if (!owns) continue;

      const { count, error: unreadError } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("match_id", row.id)
        .neq("sender_id", session.userId)
        .is("read_at", null);
      if (unreadError) throw new SocialDataError("CHOG MATE messages are not ready yet.");
      matches.push({
        id: row.id,
        profile: profileToApi(bundle),
        compatibility: row.compatibility_score,
        createdAt: row.created_at,
        lastActivity: row.last_activity,
        unreadCount: count ?? 0,
      });
    }

    res.json(GetMatchesResponse.parse(matches));
  } catch (error) {
    sendSocialError(req, res, error);
  }
});

router.get("/matches/:matchId/messages", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const parsed = GetMessagesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "That conversation could not be found." });
    return;
  }

  try {
    await requireEligibleProfile(session);
    const match = await getActiveMatch(parsed.data.matchId, session.userId);
    if (!match) {
      res.status(404).json({ error: "That conversation is no longer active." });
      return;
    }
    const admin = getSupabaseAdmin();
    const { error: readError } = await admin
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("match_id", match.id)
      .neq("sender_id", session.userId)
      .is("read_at", null);
    if (readError) throw new SocialDataError("CHOG MATE messages are not ready yet.");

    const { data, error } = await admin
      .from("messages")
      .select("*")
      .eq("match_id", match.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new SocialDataError("CHOG MATE messages are not ready yet.");
    res.json(
      GetMessagesResponse.parse(
        (data ?? []).map((message: Record<string, unknown>) => ({
          id: message.id,
          matchId: message.match_id,
          senderId: message.sender_id,
          content: message.content,
          createdAt: message.created_at,
          readAt: message.read_at,
        })),
      ),
    );
  } catch (error) {
    sendSocialError(req, res, error);
  }
});

router.post("/matches/:matchId/messages", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const params = SendMessageParams.safeParse(req.params);
  const body = SendMessageBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Write a message of 1–4,000 characters." });
    return;
  }

  try {
    await requireEligibleProfile(session);
    const match = await getActiveMatch(params.data.matchId, session.userId);
    if (!match) {
      res.status(404).json({ error: "That conversation is no longer active." });
      return;
    }
    const admin = getSupabaseAdmin();
    const content = body.data.content.trim();
    if (!content) {
      res.status(400).json({ error: "Messages can't be empty." });
      return;
    }
    const { data: message, error } = await admin
      .from("messages")
      .insert({
        match_id: match.id,
        sender_id: session.userId,
        content,
      })
      .select("*")
      .single();
    if (error || !message) throw new SocialDataError("Your message could not be sent.");

    const recipientId = match.user_a === session.userId ? match.user_b : match.user_a;
    const now = new Date().toISOString();
    const [{ error: activityError }, { error: notificationError }] = await Promise.all([
      admin.from("matches").update({ last_activity: now }).eq("id", match.id),
      admin.from("notifications").insert({
        user_id: recipientId,
        actor_id: session.userId,
        type: "message",
        related_id: match.id,
      }),
    ]);
    if (activityError || notificationError) {
      req.log.warn({ code: activityError?.code ?? notificationError?.code }, "Message side effects did not complete");
    }

    res.status(201).json(
      SendMessageResponse.parse({
        id: message.id,
        matchId: message.match_id,
        senderId: message.sender_id,
        content: message.content,
        createdAt: message.created_at,
        readAt: message.read_at,
      }),
    );
  } catch (error) {
    sendSocialError(req, res, error);
  }
});

router.post("/blocks", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const parsed = BlockProfileBody.safeParse(req.body);
  if (!parsed.success || parsed.data.targetUserId === session.userId) {
    res.status(400).json({ error: "That profile can't be blocked." });
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    const targetId = parsed.data.targetUserId;
    const { error } = await admin.from("blocks").upsert(
      { blocker_id: session.userId, blocked_user_id: targetId },
      { onConflict: "blocker_id,blocked_user_id" },
    );
    if (error) throw new SocialDataError("The block could not be saved.");
    const [a, b] = await Promise.all([
      admin
        .from("matches")
        .update({ status: "unmatched", unmatched_by: session.userId })
        .eq("user_a", session.userId)
        .eq("user_b", targetId)
        .eq("status", "active"),
      admin
        .from("matches")
        .update({ status: "unmatched", unmatched_by: session.userId })
        .eq("user_a", targetId)
        .eq("user_b", session.userId)
        .eq("status", "active"),
    ]);
    if (a.error || b.error) req.log.warn("A match could not be closed after a block");
    res.sendStatus(204);
  } catch (error) {
    sendSocialError(req, res, error);
  }
});

router.post("/reports", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const parsed = ReportProfileBody.safeParse(req.body);
  if (!parsed.success || parsed.data.targetUserId === session.userId) {
    res.status(400).json({ error: "That report could not be submitted." });
    return;
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("reports").insert({
      reporter_id: session.userId,
      target_user_id: parsed.data.targetUserId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
    });
    if (error) throw new SocialDataError("The report could not be submitted.");
    res.sendStatus(204);
  } catch (error) {
    sendSocialError(req, res, error);
  }
});

router.delete("/matches/:matchId", async (req, res): Promise<void> => {
  const session = requireWalletSession(req, res);
  if (!session) return;
  const parsed = UnmatchProfileParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "That match could not be removed." });
    return;
  }
  try {
    const match = await getActiveMatch(parsed.data.matchId, session.userId);
    if (!match) {
      res.status(404).json({ error: "That match is no longer active." });
      return;
    }
    const { error } = await getSupabaseAdmin()
      .from("matches")
      .update({
        status: "unmatched",
        unmatched_by: session.userId,
        last_activity: new Date().toISOString(),
      })
      .eq("id", match.id);
    if (error) throw new SocialDataError("The match could not be removed.");
    res.sendStatus(204);
  } catch (error) {
    sendSocialError(req, res, error);
  }
});

async function requireEligibleProfile(session: WalletSession) {
  const bundle = await loadProfileBundle(session.userId);
  if (!bundle) {
    throw new EligibilityError("Complete your profile and hold a Chog Genesis NFT to continue.", 403);
  }
  const owns = await isCurrentChogOwner(
    getAddress(session.walletAddress),
    bundle.chog.tokenId,
  );
  if (owns === null) {
    throw new EligibilityError("Ownership checks are temporarily unavailable.", 503);
  }
  if (!owns) {
    throw new EligibilityError("Your wallet must currently hold the selected Chog Genesis NFT.", 403);
  }
  return bundle;
}

async function getActiveMatch(matchId: string, userId: string): Promise<MatchRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new SocialDataError("CHOG MATE matching is not ready yet.");
  if (!data) return null;
  const match = data as MatchRow;
  return match.user_a === userId || match.user_b === userId ? match : null;
}

function sendSocialError(req: Request, res: Response, error: unknown): void {
  if (error instanceof EligibilityError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof SocialDataError) {
    res.status(503).json({
      error: "CHOG MATE's database isn't ready yet. Apply the included Supabase migration and try again.",
    });
    return;
  }
  req.log.error({ err: error }, "Social service failed");
  res.status(503).json({ error: "This action is temporarily unavailable. Please try again." });
}

export default router;
