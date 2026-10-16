import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import {
  getGetMeQueryKey,
  useCreateAuthChallenge,
  useVerifyWallet,
} from "@workspace/api-client-react";
import {
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { useLocation } from "wouter";
import { appKit, monadNetwork } from "@/lib/appkit";
import { walletAuthConfigured } from "@/lib/config";
import { supabase } from "@/lib/supabase";

export default function WalletAuthPanel({ autoOpen = false }: { autoOpen?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [openingWallet, setOpeningWallet] = useState(false);
  const [appKitModalOpen, setAppKitModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const challenge = useCreateAuthChallenge();
  const verify = useVerifyWallet();
  const connection = useConnection();
  const { connectAsync, connectors, isPending: isConnectPending } = useConnect();
  const { disconnectAsync, isPending: isDisconnectPending } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const autoOpened = useRef(false);
  const address = connection.address;
  const isConnected = connection.isConnected;
  const isWrongNetwork = isConnected && connection.chainId !== monadNetwork.id;
  const isConnecting =
    connection.isConnecting ||
    connection.isReconnecting ||
    isConnectPending ||
    openingWallet ||
    (appKitModalOpen && !isConnected);

  useEffect(() => {
    if (!appKit) return;
    setAppKitModalOpen(appKit.getState().open);
    return appKit.subscribeState((state) => setAppKitModalOpen(state.open));
  }, []);

  const openWallet = useCallback(async () => {
    setFeedback("");
    setOpeningWallet(true);
    try {
      if (appKit) {
        await appKit.open({ view: "Connect" });
        return;
      }

      const injectedConnector = connectors.find((connector) => connector.id === "injected");
      if (!injectedConnector) {
        throw new Error("No browser wallet was detected. Install or unlock a wallet and try again.");
      }
      await connectAsync({ connector: injectedConnector });
    } finally {
      setOpeningWallet(false);
    }
  }, [connectAsync, connectors]);

  useEffect(() => {
    if (!autoOpen || autoOpened.current || isConnected) return;
    autoOpened.current = true;
    void openWallet().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Please try again.";
      setFeedback(`The wallet connection could not be opened. ${message}`);
    });
  }, [autoOpen, isConnected, openWallet]);

  async function switchToMonad() {
    setFeedback("");
    try {
      await switchChainAsync({ chainId: monadNetwork.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setFeedback(`Could not switch to Monad. ${message}`);
    }
  }

  async function disconnectWallet() {
    setFeedback("");
    try {
      await disconnectAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setFeedback(`Wallet disconnect failed. ${message}`);
    }
  }

  async function connect() {
    setFeedback("");
    if (!isConnected) {
      try {
        await openWallet();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Please try again.";
        setFeedback(`Wallet connection failed. ${message}`);
      }
      return;
    }
    if (isWrongNetwork) {
      setFeedback("Switch to Monad Mainnet before verifying your wallet.");
      return;
    }
    if (!address || !walletClient) {
      setFeedback("Your wallet connection is still loading. Try again in a moment.");
      return;
    }
    if (!walletAuthConfigured || !supabase) {
      setFeedback("Your wallet is connected, but account sign-in is not configured yet.");
      return;
    }

    setBusy(true);
    try {
      const authChallenge = await challenge.mutateAsync({ data: { walletAddress: address } });
      const signature = await walletClient.signMessage({
        account: address,
        message: authChallenge.message,
      });
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
          ? "Wallet signing was cancelled. Your wallet remains connected."
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
        disabled={busy || isConnecting || isWrongNetwork}
        className="button-primary inline-flex min-h-[54px] items-center gap-3 rounded-full px-7 text-sm font-bold disabled:cursor-wait disabled:opacity-70"
        data-testid="button-connect-wallet"
      >
        {isConnecting
          ? "Connecting wallet…"
          : busy
            ? "Verifying your wallet…"
            : isConnected
              ? "Verify wallet"
              : "Connect wallet"}
        <ArrowRight size={17} />
      </button>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#92869a]">
        <span role="status" aria-live="polite" data-testid="status-wallet-connection">
          {isConnecting
            ? "Connecting to wallet…"
            : isWrongNetwork
              ? `Wrong network · ${connection.chain?.name ?? `Chain ${connection.chainId}`}`
              : isConnected
                ? `Connected to Monad · ${address?.slice(0, 6)}…${address?.slice(-4)}`
                : "A signature proves ownership. It never moves funds."}
        </span>
        {isConnected && (
          <button
            type="button"
            onClick={() => void disconnectWallet()}
            disabled={isDisconnectPending}
            className="font-semibold text-[#a3315e] underline-offset-4 hover:underline disabled:opacity-60"
            data-testid="button-wallet-disconnect"
          >
            {isDisconnectPending ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>
      {isWrongNetwork && (
        <div
          className="mt-3 flex flex-col gap-2 rounded-2xl border border-[#ead8ce] bg-[#fff8f1] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
          data-testid="status-wallet-wrong-network"
        >
          <p className="text-sm leading-5 text-[#755247]">
            CHOG MATE runs on Monad Mainnet. Switch networks to continue.
          </p>
          <button
            type="button"
            onClick={() => void switchToMonad()}
            disabled={isSwitchPending}
            className="button-soft inline-flex min-h-10 shrink-0 items-center justify-center rounded-full px-4 text-xs font-bold disabled:opacity-60"
            data-testid="button-switch-to-monad"
          >
            {isSwitchPending ? "Switching…" : "Switch to Monad"}
          </button>
        </div>
      )}
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
