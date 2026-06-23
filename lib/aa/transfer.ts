import { encodeFunctionData, erc20Abi, isAddress, parseUnits } from "viem";
import type { SwapToken } from "@/config/tokens";
import type { SmartAccountBundle } from "@/hooks/use-smart-account";

export type TxStep = "signing" | "submitting" | "confirming";

/**
 * Send a token to an address as a single sponsored UserOperation through the
 * Kernel smart account. ERC-20 → `transfer(to, amount)`; native → value call.
 */
export async function executeTransfer(
  bundle: SmartAccountBundle,
  params: { token: SwapToken; to: string; amount: string },
  onStep: (step: TxStep, hash?: string) => void,
): Promise<string> {
  const { kernelClient, account } = bundle;
  const { token, to, amount } = params;

  if (!isAddress(to)) throw new Error("Invalid recipient address");
  const value = parseUnits(amount as `${number}`, token.decimals);

  const call = token.native
    ? { to: to as `0x${string}`, value, data: "0x" as `0x${string}` }
    : {
        to: token.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to as `0x${string}`, value],
        }),
      };

  onStep("signing");
  const callData = await account.encodeCalls([call]);
  const hash = await kernelClient.sendUserOperation({ callData });

  onStep("submitting", hash);
  const receipt = await kernelClient.waitForUserOperationReceipt({ hash });
  if (!receipt.success) throw new Error("UserOperation reverted on-chain");

  const txHash = receipt.receipt.transactionHash;
  onStep("confirming", txHash);
  return txHash;
}
