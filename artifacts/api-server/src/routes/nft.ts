import { Router, type IRouter } from "express";
import {
  GetChogParams,
  GetChogResponse,
  GetNftOwnershipParams,
  GetNftOwnershipResponse,
} from "@workspace/api-zod";
import { getAddress } from "viem";
import { getChog, getOwnedChogs } from "../lib/chogs";

const router: IRouter = Router();

router.get("/nft/ownership/:walletAddress", async (req, res): Promise<void> => {
  const parsed = GetNftOwnershipParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid wallet address." });
    return;
  }

  try {
    const walletAddress = getAddress(parsed.data.walletAddress);
    const chogs = await getOwnedChogs(walletAddress);
    res.json(
      GetNftOwnershipResponse.parse({
        walletAddress,
        verified: chogs.length > 0,
        chogs,
      }),
    );
  } catch (error) {
    req.log.warn(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "Chog ownership lookup unavailable",
    );
    res.status(503).json({
      error: "Chog ownership is temporarily unavailable. Please try again.",
    });
  }
});

router.get("/nft/tokens/:tokenId", async (req, res): Promise<void> => {
  const parsed = GetChogParams.safeParse(req.params);
  if (!parsed.success || !/^\d{1,78}$/.test(parsed.data?.tokenId ?? "")) {
    res.status(404).json({ error: "That Chog token could not be found." });
    return;
  }

  try {
    const chog = await getChog(parsed.data.tokenId);
    if (!chog) {
      res.status(404).json({ error: "That Chog token could not be found." });
      return;
    }
    res.json(GetChogResponse.parse(chog));
  } catch (error) {
    req.log.warn(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "Chog token metadata unavailable",
    );
    res.status(503).json({
      error: "Chog metadata is temporarily unavailable. Please try again.",
    });
  }
});

export default router;
