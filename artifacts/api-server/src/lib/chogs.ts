import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  http,
  parseAbiItem,
  type Address,
  type Log,
} from "viem";

export const CHOG_CONTRACT_ADDRESS = (
  process.env.VITE_CHOG_CONTRACT_ADDRESS ??
  "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"
) as Address;

const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz"] },
  },
  testnet: false,
});

const publicClient = createPublicClient({
  chain: monad,
  transport: http(process.env.MONAD_RPC_URL ?? "https://rpc.monad.xyz", {
    timeout: 20_000,
    retryCount: 1,
  }),
});

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);
const erc721Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export interface ChogTrait {
  traitType: string;
  traitValue: string;
  rarity: number | null;
}

export interface ChogToken {
  tokenId: string;
  contractAddress: string;
  ownerWallet: string;
  verified: boolean;
  name: string | null;
  imageUrl: string | null;
  metadataUrl: string | null;
  traits: ChogTrait[];
}

interface Metadata {
  name?: unknown;
  image?: unknown;
  image_url?: unknown;
  attributes?: unknown;
  traits?: unknown;
}

interface CachedTokens {
  expiresAt: number;
  tokens: ChogToken[];
}

const ownershipCache = new Map<string, CachedTokens>();
const metadataCache = new Map<string, { expiresAt: number; value: Metadata | null }>();
const activeOwnershipRequests = new Map<string, Promise<ChogToken[]>>();
const OWNERSHIP_TTL_MS = 30_000;
const METADATA_TTL_MS = 6 * 60 * 60 * 1000;
const TRANSFER_RANGE_SIZE = 10_000n;
const MAX_SCANNED_BLOCKS = 20_000_000n;

export async function getOwnedChogs(walletAddress: Address): Promise<ChogToken[]> {
  const wallet = walletAddress.toLowerCase();
  const cached = ownershipCache.get(wallet);
  if (cached && cached.expiresAt > Date.now()) return cached.tokens;

  const existing = activeOwnershipRequests.get(wallet);
  if (existing) return existing;

  const request = loadOwnedChogs(walletAddress)
    .then((tokens) => {
      ownershipCache.set(wallet, {
        tokens,
        expiresAt: Date.now() + OWNERSHIP_TTL_MS,
      });
      return tokens;
    })
    .finally(() => activeOwnershipRequests.delete(wallet));
  activeOwnershipRequests.set(wallet, request);
  return request;
}

export async function getChog(tokenId: string): Promise<ChogToken | null> {
  let tokenNumber: bigint;
  try {
    tokenNumber = BigInt(tokenId);
  } catch {
    return null;
  }
  if (tokenNumber < 0n) return null;

  const owner = await publicClient
    .readContract({
      address: CHOG_CONTRACT_ADDRESS,
      abi: erc721Abi,
      functionName: "ownerOf",
      args: [tokenNumber],
    })
    .catch(() => null);
  if (!owner) return null;

  const metadata = await readTokenMetadata(tokenNumber);
  return {
    tokenId: tokenNumber.toString(),
    contractAddress: CHOG_CONTRACT_ADDRESS,
    ownerWallet: owner,
    verified: true,
    name: typeof metadata?.name === "string" ? metadata.name : null,
    imageUrl: metadataImage(metadata),
    metadataUrl: await tokenMetadataUrl(tokenNumber),
    traits: mapTraits(metadata),
  };
}

export async function isCurrentChogOwner(
  walletAddress: Address,
  tokenId: string,
): Promise<boolean | null> {
  try {
    const owner = await publicClient.readContract({
      address: CHOG_CONTRACT_ADDRESS,
      abi: erc721Abi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    });
    return owner.toLowerCase() === walletAddress.toLowerCase();
  } catch {
    return null;
  }
}

async function loadOwnedChogs(walletAddress: Address): Promise<ChogToken[]> {
  const balance = await publicClient.readContract({
    address: CHOG_CONTRACT_ADDRESS,
    abi: erc721Abi,
    functionName: "balanceOf",
    args: [walletAddress],
  });
  if (balance === 0n) return [];

  const latestBlock = await publicClient.getBlockNumber();
  if (latestBlock > MAX_SCANNED_BLOCKS) {
    throw new Error("The configured NFT indexer does not support this collection history.");
  }

  const currentOwners = new Map<string, string>();
  let fromBlock = 0n;
  while (fromBlock <= latestBlock) {
    const toBlock =
      fromBlock + TRANSFER_RANGE_SIZE - 1n > latestBlock
        ? latestBlock
        : fromBlock + TRANSFER_RANGE_SIZE - 1n;
    const [incoming, outgoing] = await getTransferLogs(walletAddress, fromBlock, toBlock);
    const uniqueLogs = new Map<string, Log>();
    for (const log of [...incoming, ...outgoing]) {
      uniqueLogs.set(`${log.transactionHash}:${log.logIndex}`, log);
    }
    const ordered = [...uniqueLogs.values()].sort((a, b) => {
      const blockDiff = Number((a.blockNumber ?? 0n) - (b.blockNumber ?? 0n));
      if (blockDiff !== 0) return blockDiff;
      return Number((a.logIndex ?? 0) - (b.logIndex ?? 0));
    });

    for (const log of ordered) {
      const decoded = decodeEventLog({
        abi: [transferEvent],
        data: log.data,
        topics: log.topics,
      });
      const tokenId = decoded.args.tokenId.toString();
      const from = decoded.args.from.toLowerCase();
      const to = decoded.args.to.toLowerCase();
      if (!tokenId || !from || !to) continue;
      if (to === walletAddress.toLowerCase()) currentOwners.set(tokenId, to);
      if (from === walletAddress.toLowerCase() && to !== walletAddress.toLowerCase()) {
        currentOwners.delete(tokenId);
      }
    }
    fromBlock = toBlock + 1n;
  }

  const ids = [...currentOwners.keys()];
  const verified = await Promise.all(
    ids.map(async (tokenId) => {
      try {
        const owner = await publicClient.readContract({
          address: CHOG_CONTRACT_ADDRESS,
          abi: erc721Abi,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        });
        return owner.toLowerCase() === walletAddress.toLowerCase() ? tokenId : null;
      } catch {
        return null;
      }
    }),
  );
  const ownedIds = verified.filter((id): id is string => id !== null);
  const tokens = await Promise.all(
    ownedIds.map(async (tokenId): Promise<ChogToken> => {
      const tokenNumber = BigInt(tokenId);
      const [metadata, metadataUrl] = await Promise.all([
        readTokenMetadata(tokenNumber),
        tokenMetadataUrl(tokenNumber),
      ]);
      return {
        tokenId,
        contractAddress: CHOG_CONTRACT_ADDRESS,
        ownerWallet: walletAddress,
        verified: true,
        name: typeof metadata?.name === "string" ? metadata.name : null,
        imageUrl: metadataImage(metadata),
        metadataUrl,
        traits: mapTraits(metadata),
      };
    }),
  );
  return tokens.sort((a, b) => BigInt(a.tokenId) < BigInt(b.tokenId) ? -1 : 1);
}

async function getTransferLogs(
  walletAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<[Log[], Log[]]> {
  try {
    return await Promise.all([
      publicClient.getLogs({
        address: CHOG_CONTRACT_ADDRESS,
        event: transferEvent,
        args: { to: walletAddress },
        fromBlock,
        toBlock,
      }),
      publicClient.getLogs({
        address: CHOG_CONTRACT_ADDRESS,
        event: transferEvent,
        args: { from: walletAddress },
        fromBlock,
        toBlock,
      }),
    ]);
  } catch (error) {
    if (toBlock - fromBlock <= 128n) throw error;
    const midpoint = fromBlock + (toBlock - fromBlock) / 2n;
    const [left, right] = await Promise.all([
      getTransferLogs(walletAddress, fromBlock, midpoint),
      getTransferLogs(walletAddress, midpoint + 1n, toBlock),
    ]);
    return [[...left[0], ...right[0]], [...left[1], ...right[1]]];
  }
}

async function tokenMetadataUrl(tokenId: bigint): Promise<string | null> {
  return publicClient
    .readContract({
      address: CHOG_CONTRACT_ADDRESS,
      abi: erc721Abi,
      functionName: "tokenURI",
      args: [tokenId],
    })
    .catch(() => null);
}

async function readTokenMetadata(tokenId: bigint): Promise<Metadata | null> {
  const uri = await tokenMetadataUrl(tokenId);
  if (!uri) return null;

  const cached = metadataCache.get(uri);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = resolveGatewayUrl(uri);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
    const metadata = (await response.json()) as Metadata;
    metadataCache.set(uri, { value: metadata, expiresAt: Date.now() + METADATA_TTL_MS });
    return metadata;
  } catch {
    metadataCache.set(uri, { value: null, expiresAt: Date.now() + 60_000 });
    return null;
  }
}

function resolveGatewayUrl(uri: string): string {
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice(5)}`;
  return uri;
}

function metadataImage(metadata: Metadata | null): string | null {
  if (!metadata) return null;
  const image = typeof metadata.image_url === "string" ? metadata.image_url : metadata.image;
  if (typeof image !== "string") return null;
  const resolved = resolveGatewayUrl(image);
  return /^https?:\/\//i.test(resolved) ? resolved : null;
}

function mapTraits(metadata: Metadata | null): ChogTrait[] {
  if (!metadata) return [];
  const attributes = Array.isArray(metadata.attributes)
    ? metadata.attributes
    : Array.isArray(metadata.traits)
      ? metadata.traits
      : [];
  return attributes.flatMap((entry): ChogTrait[] => {
    if (!entry || typeof entry !== "object") return [];
    const trait = entry as Record<string, unknown>;
    const traitType = trait.trait_type ?? trait.traitType;
    const traitValue = trait.value ?? trait.trait_value ?? trait.traitValue;
    if (typeof traitType !== "string" || traitType.length === 0) return [];
    if (
      (typeof traitValue !== "string" && typeof traitValue !== "number") ||
      String(traitValue).length === 0
    ) {
      return [];
    }
    const rarity =
      typeof trait.rarity === "number" && trait.rarity >= 0 && trait.rarity <= 100
        ? trait.rarity
        : null;
    return [{ traitType, traitValue: String(traitValue), rarity }];
  });
}
