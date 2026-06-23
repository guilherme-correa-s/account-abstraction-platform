"use client";

import { useCallback, useRef } from "react";
import { useWallets, useSign7702Authorization } from "@privy-io/react-auth";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import {
  getEntryPoint,
  KERNEL_V3_3,
  KERNEL_7702_DELEGATION_ADDRESS,
} from "@zerodev/sdk/constants";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Chain,
} from "viem";
import { polygon, base } from "viem/chains";
import { pimlicoUrl } from "@/lib/aa/pimlico";

const CHAINS: Record<number, Chain> = { 137: polygon, 8453: base };

export type KernelClient = Awaited<
  ReturnType<typeof createKernelAccountClient>
>;
export type KernelAccount = Awaited<ReturnType<typeof createKernelAccount>>;
export type SmartAccountBundle = {
  kernelClient: KernelClient;
  account: KernelAccount;
};

/**
 * Builds a Kernel EIP-7702 smart-account client bound to the Privy embedded
 * signer, with a Pimlico bundler + paymaster (gasless). The smart-account
 * address equals the EOA address (7702). Clients are cached per chain so the
 * 7702 authorization is only signed once per session/chain.
 *
 * APIs verified against @zerodev/sdk + permissionless + @privy-io/react-auth
 * and the ZeroDev/Privy 7702 guides.
 */
export function useSmartAccount() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const cache = useRef<Map<number, SmartAccountBundle>>(new Map());

  const getKernelClient = useCallback(
    async (chainId: number): Promise<SmartAccountBundle> => {
      const cached = cache.current.get(chainId);
      if (cached) return cached;

      const chain = CHAINS[chainId];
      if (!chain) throw new Error(`Unsupported chain ${chainId}`);

      const embedded = wallets.find((w) => w.walletClientType === "privy");
      if (!embedded) throw new Error("No Privy embedded wallet found");

      // Make sure the embedded wallet is on the target chain before signing.
      try {
        await embedded.switchChain(chainId);
      } catch {
        /* best effort */
      }

      const provider = await embedded.getEthereumProvider();
      const walletClient = createWalletClient({
        account: embedded.address as `0x${string}`,
        chain,
        transport: custom(provider),
      });

      // 7702 authorization MUST be signed via Privy (MPC), not viem.
      const authorization = await signAuthorization({
        contractAddress: KERNEL_7702_DELEGATION_ADDRESS,
        chainId,
      });

      const publicClient = createPublicClient({ chain, transport: http() });
      const entryPoint = getEntryPoint("0.7");

      const account = await createKernelAccount(publicClient, {
        eip7702Account: walletClient,
        entryPoint,
        kernelVersion: KERNEL_V3_3,
        // Privy's authorization is viem-compatible; cast to satisfy the type.
        eip7702Auth: authorization as Parameters<
          typeof createKernelAccount
        >[1]["eip7702Auth"],
      });

      const pimlico = createPimlicoClient({
        transport: http(pimlicoUrl(chainId)),
        entryPoint: { address: entryPoint07Address, version: "0.7" },
      });

      const kernelClient = createKernelAccountClient({
        account,
        chain,
        bundlerTransport: http(pimlicoUrl(chainId)),
        paymaster: pimlico,
        client: publicClient,
        userOperation: {
          estimateFeesPerGas: async () =>
            (await pimlico.getUserOperationGasPrice()).fast,
        },
      });

      const bundle: SmartAccountBundle = { kernelClient, account };
      cache.current.set(chainId, bundle);
      return bundle;
    },
    [wallets, signAuthorization],
  );

  return { getKernelClient };
}
