import { type FormEvent, useState } from "react";
import { Activity, BadgeCheck, Check, RefreshCw } from "lucide-react";
import { isAddress } from "viem";
import {
  getGetNftOwnershipQueryKey,
  useGetNftOwnership,
} from "@workspace/api-client-react";
import { ChogArtwork } from "@/components/shared";

export default function ManualAddressScan() {
  const [scanInput, setScanInput] = useState("");
  const [scanAddress, setScanAddress] = useState("");
  const [scanNonce, setScanNonce] = useState(0);
  const [scanError, setScanError] = useState("");
  const [selectedTestChog, setSelectedTestChog] = useState("");
  const ownership = useGetNftOwnership(scanAddress, {
    query: {
      enabled: Boolean(scanAddress),
      queryKey: [
        ...getGetNftOwnershipQueryKey(scanAddress),
        "test-mode",
        scanNonce,
      ],
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
    },
  });
  const ownershipMatchesAddress =
    Boolean(scanAddress) &&
    ownership.data?.walletAddress.toLowerCase() === scanAddress.toLowerCase();
  const chogs =
    ownershipMatchesAddress && ownership.data?.verified
      ? ownership.data.chogs.filter(
          (chog) =>
            chog.verified &&
            chog.ownerWallet.toLowerCase() === scanAddress.toLowerCase(),
        )
      : [];

  function scanAddressForChogs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setScanError("");
    setSelectedTestChog("");
    const enteredAddress = scanInput.trim();
    if (!isAddress(enteredAddress, { strict: false })) {
      setScanError("Enter a valid EVM wallet address and try again.");
      setScanAddress("");
      return;
    }
    setScanAddress(enteredAddress);
    setScanNonce((value) => value + 1);
  }

  return (
    <section
      className="surface w-full max-w-xl rounded-[24px] p-4 sm:p-5"
      aria-label="Test-mode Chog wallet scan"
      data-testid="panel-test-wallet-scan"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#92869a]">
            OR
          </p>
          <h2 className="display mt-1 text-lg font-extrabold text-[#24133f]">
            Enter Wallet Address
          </h2>
        </div>
        <span
          className="rounded-full border border-[#e7c98b] bg-[#fff5da] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.12em] text-[#79521a]"
          data-testid="badge-test-mode"
        >
          TEST MODE
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#82778c]">
        Read-only ownership check. This address is not connected; no signature
        or transaction is requested.
      </p>
      <form
        onSubmit={scanAddressForChogs}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Enter wallet address</span>
          <input
            className="field"
            value={scanInput}
            onChange={(event) => {
              setScanInput(event.target.value);
              setScanAddress("");
              setSelectedTestChog("");
              setScanError("");
            }}
            placeholder="0x... Enter wallet address"
            autoComplete="off"
            spellCheck={false}
            aria-label="Enter wallet address"
            aria-invalid={Boolean(scanError)}
            data-testid="input-test-wallet-address"
          />
        </label>
        <button
          type="submit"
          disabled={ownership.isFetching}
          className="button-primary inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-xs font-bold disabled:opacity-55"
          data-testid="button-scan-chog-nfts"
        >
          <Activity
            size={15}
            className={ownership.isFetching ? "animate-pulse" : ""}
          />
          {ownership.isFetching ? "Scanning…" : "Scan Chog NFTs"}
        </button>
      </form>
      {scanError && (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-[#edc8bc] bg-[#fff2ec] px-4 py-3 text-sm text-[#914c3c]"
          data-testid="status-test-wallet-validation"
        >
          {scanError}
        </p>
      )}
      {scanAddress && ownership.isFetching && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-2xl bg-[#f2ecff] px-4 py-3 text-sm font-semibold text-[#6246b0]"
          data-testid="status-test-wallet-scanning"
        >
          <Activity size={15} className="animate-pulse" />
          Scanning this address for Chog NFTs on Monad…
        </p>
      )}
      {scanAddress && ownership.isError && !ownership.isFetching && (
        <div
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#edc8bc] bg-[#fff2ec] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid="status-test-wallet-error"
        >
          <p className="text-sm leading-5 text-[#914c3c]">
            We couldn’t verify this address right now. A network or indexer
            error is not treated as zero Chogs.
          </p>
          <button
            type="button"
            onClick={() => void ownership.refetch()}
            disabled={ownership.isFetching}
            className="button-soft inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-xs font-bold disabled:opacity-60"
            data-testid="button-retry-test-wallet-scan"
          >
            <RefreshCw
              size={13}
              className={ownership.isFetching ? "animate-spin" : ""}
            />
            Try again
          </button>
        </div>
      )}
      {scanAddress &&
        ownershipMatchesAddress &&
        !ownership.isFetching &&
        !ownership.isError &&
        chogs.length === 0 && (
          <div
            className="mt-4 rounded-2xl bg-[#faf6ef] px-4 py-3"
            data-testid="status-test-no-chog"
          >
            <h3 className="display text-base font-extrabold text-[#24133f]">
              No Chog Found
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#82778c]">
              This address currently has no verified Chog Genesis NFTs.
            </p>
          </div>
        )}
      {chogs.length > 0 && (
        <div className="mt-5 border-t border-[#24133f10] pt-4">
          <div className="mb-3 flex items-center gap-2">
            <BadgeCheck size={15} className="text-[#447a43]" />
            <h3 className="display text-base font-extrabold text-[#24133f]">
              Choose Your Chog
            </h3>
            <span className="text-[10px] text-[#82778c]">
              {chogs.length} found
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {chogs.map((chog) => {
              const isSelected = selectedTestChog === chog.tokenId;
              return (
                <button
                  key={chog.tokenId}
                  type="button"
                  onClick={() => setSelectedTestChog(chog.tokenId)}
                  aria-pressed={isSelected}
                  className={`group overflow-hidden rounded-2xl border-2 bg-white text-left transition ${
                    isSelected
                      ? "border-[#8a63ff] shadow-[0_0_0_3px_#8a63ff1c]"
                      : "border-transparent hover:border-[#dacbf3]"
                  }`}
                  data-testid={`button-test-select-chog-${chog.tokenId}`}
                >
                  <div className="relative aspect-square bg-[#f4eddf]">
                    <ChogArtwork chog={chog} />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/85 px-2 py-1 text-[9px] font-bold text-[#447a43] shadow-sm backdrop-blur">
                      <BadgeCheck size={11} /> Verified
                    </span>
                    {isSelected && (
                      <span className="absolute right-2 top-2 rounded-full bg-[#7047ff] p-1.5 text-white">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="display text-sm font-extrabold text-[#24133f]">
                      Chog #{chog.tokenId}
                    </p>
                    {chog.tier && (
                      <p className="mt-1 text-[10px] font-semibold text-[#715795]">
                        Tier: {chog.tier}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedTestChog && (
            <p
              className="mt-3 rounded-xl bg-[#eef8ea] px-3 py-2 text-xs leading-5 text-[#447a43]"
              role="status"
              data-testid="status-test-chog-selected"
            >
              Chog #{selectedTestChog} selected for this test. This read-only
              selection is not connected to a wallet or saved to a profile.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
