import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import {
  getGetMeQueryKey,
  useCreateAuthChallenge,
  useVerifyWallet,
} from "@workspace/api-client-react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider,
} from "@reown/appkit/react";
import { useLocation } from "wouter";
import { appKit, monadNetwork, walletConnectConfigured } from "@/lib/appkit";
import { supabase } from "@/lib/supabase";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export default function WalletAuthPanel({ autoOpen = false }: { autoOpen?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const challenge = useCreateAuthChallenge();
  const verify = useVerifyWallet();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  const { chainId, switchNetwork } = useAppKitNetwork();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const autoOpened = useRef(false);

  useEffect(() => {
    if (!autoOpen || autoOpened.current || isConnected) return;
    autoOpened.current = true;
    void open({ view: "Connect" }).catch(() => {
      setFeedback("The wallet connection window could not be opened. Please try again.");
    });
  }, [autoOpen, isConnected, open]);

  async function connect() {
    setFeedback("");
    if (!walletConnectConfigured || !appKit || !supabase) {
      setFeedback("Wallet connection is not configured yet. Please try again later.");
      return;
    }
    if (!isConnected) {
      try {
        await open({ view: "Connect" });
      } catch {
        setFeedback("The wallet connection window could not be opened. Please try again.");
      }
      return;
    }
    if (!address || !walletProvider) {
      setFeedback("Your wallet connection is still loading. Try again in a moment.");
      return;
    }

    setBusy(true);
    try {
      if (Number(chainId) !== 143) await switchNetwork(monadNetwork);
      const activeChainId = await walletProvider.request({ method: "eth_chainId" });
      if (Number(activeChainId) !== 143) {
        throw new Error("Switch your wallet to Monad Mainnet to continue.");
      }
      const authChallenge = await challenge.mutateAsync({ data: { walletAddress: address } });
      const signature = await walletProvider.request({
        method: "personal_sign",
        params: [authChallenge.message, address],
      }) as string;
      const session = await verify.mutateAsync({
        data: { walletAddress: address, nonce: authChallenge.nonce, signature },
      });
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (sessionError) throw sessionError;
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      navigate(session.hasChog ? "/discover" : "/my-chog");
    } catch (error) {
      const err = error as { code?: number; message?: string };
      setFeedback(
        err.code === 4001
          ? "Wallet signing was cancelled. Nothing was connected."
          : err.message || "Wallet verification could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => void connect()}
        disabled={busy}
        className="button-primary inline-flex min-h-[54px] items-center gap-3 rounded-full px-7 text-sm font-bold disabled:cursor-wait disabled:opacity-70"
        data-testid="button-connect-wallet"
      >
        {busy ? "Verifying your wallet…" : isConnected ? "Verify wallet" : "Connect wallet"}
        <ArrowRight size={17} />
      </button>
      <span className="text-xs text-[#92869a]">
        {isConnected
          ? `Connected · ${address?.slice(0, 6)}…${address?.slice(-4)}`
          : "A signature proves ownership. It never moves funds."}
      </span>
      {feedback && (
        <p
          className="mt-4 max-w-lg rounded-2xl border border-[#edc8bc] bg-[#fff2ec] px-4 py-3 text-sm leading-5 text-[#8b4232]"
          role="alert"
          data-testid="status-wallet-error"
        >
          {feedback}
        </p>
      )}
    </>
  );
}
