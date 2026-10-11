import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "viem";

export const monadNetwork = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://monadscan.com" },
  },
});

export const walletConnectConfigured = Boolean(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID);

if (walletConnectConfigured) {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: [monadNetwork],
  });
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [monadNetwork],
    metadata: {
      name: "CHOG MATE",
      description: "Meet. Match. Chog.",
      url: window.location.origin,
      icons: [],
    },
    themeMode: "light",
    features: { analytics: false },
  });
}
