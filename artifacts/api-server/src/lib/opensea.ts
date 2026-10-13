const OPENSEA_API_URL = "https://api.opensea.io/api/v2";
const OPENSEA_COLLECTION_SLUG = "chog-genesis";
const CHOG_CONTRACT_ADDRESS = "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763";

export interface ChogCollectionItem {
  tokenId: string;
  name: string | null;
  imageUrls: string[];
  marketplaceUrl: string | null;
}

export interface ChogCollectionPage {
  items: ChogCollectionItem[];
  next: string | null;
}

export class NftIndexerError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "NftIndexerError";
  }
}

export async function getChogCollectionPage(
  limit: number,
  cursor?: string,
): Promise<ChogCollectionPage> {
  const apiKey = process.env.OPENSEA_API_KEY?.trim();
  if (!apiKey) {
    throw new NftIndexerError("NFT collection indexer is not configured.", 503);
  }

  const url = new URL(
    `${OPENSEA_API_URL}/collection/${OPENSEA_COLLECTION_SLUG}/nfts`,
  );
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("next", cursor);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new NftIndexerError("NFT collection indexer could not be reached.", 502);
  }

  if (!response.ok) {
    throw new NftIndexerError(
      "NFT collection indexer returned an unsuccessful response.",
      response.status === 401 || response.status === 403 ? 503 : 502,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new NftIndexerError("NFT collection indexer returned invalid data.", 502);
  }

  if (!payload || typeof payload !== "object") {
    throw new NftIndexerError("NFT collection indexer returned invalid data.", 502);
  }

  const result = payload as { nfts?: unknown; next?: unknown };
  if (!Array.isArray(result.nfts)) {
    throw new NftIndexerError("NFT collection indexer returned invalid data.", 502);
  }

  const items = result.nfts.flatMap((entry): ChogCollectionItem[] => {
    if (!entry || typeof entry !== "object") return [];
    const nft = entry as Record<string, unknown>;
    if (
      typeof nft.identifier !== "string" ||
      typeof nft.contract !== "string" ||
      nft.contract.toLowerCase() !== CHOG_CONTRACT_ADDRESS
    ) {
      return [];
    }

    const imageUrls = [
      ...imageGatewayUrls(nft.image_url),
      ...imageGatewayUrls(nft.display_image_url),
      ...imageGatewayUrls(nft.original_image_url),
    ].filter((image, index, all) => all.indexOf(image) === index);

    return [
      {
        tokenId: nft.identifier,
        name: typeof nft.name === "string" ? nft.name : null,
        imageUrls,
        marketplaceUrl:
          typeof nft.opensea_url === "string" &&
          nft.opensea_url.startsWith("https://")
            ? nft.opensea_url
            : null,
      },
    ];
  });

  return {
    items,
    next: typeof result.next === "string" && result.next.length > 0
      ? result.next
      : null,
  };
}

function imageGatewayUrls(value: unknown): string[] {
  if (typeof value !== "string" || value.length === 0) return [];
  if (value.startsWith("ipfs://")) {
    const path = value.slice("ipfs://".length).replace(/^ipfs\//, "");
    return [
      `https://ipfs.io/ipfs/${path}`,
      `https://cloudflare-ipfs.com/ipfs/${path}`,
      `https://gateway.pinata.cloud/ipfs/${path}`,
    ];
  }
  if (value.startsWith("ar://")) {
    return [`https://arweave.net/${value.slice("ar://".length)}`];
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? [url.toString()] : [];
  } catch {
    return [];
  }
}
