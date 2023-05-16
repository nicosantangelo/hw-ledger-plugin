import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import { ProviderWrapper } from "hardhat/internal/core/providers/wrapper";
import { extendProvider } from "hardhat/config";
import { EIP1193Provider, RequestArguments } from "hardhat/types";

import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { TransportError } from "@ledgerhq/errors";
import Eth from "@ledgerhq/hw-app-eth";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
};
export default config;

export interface LedgerOptions {
  path: string;
  openTimeout?: number;
  connectionTimeout?: number;
}

class LedgerProvider extends ProviderWrapper implements EIP1193Provider {
  public static readonly DEFAULT_TIMEOUT = 3000;

  public name: string = "LedgerProvider";

  private eth: Eth | undefined;
  private isCreatingTransport = false;

  constructor(
    public readonly options: LedgerOptions,
    protected readonly _wrappedProvider: EIP1193Provider
  ) {
    super(_wrappedProvider);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    // this.signTransaction(...)
    // (hre.ethers || ethers).provider.sendTransaction

    // throw if not init?

    return this._wrappedProvider.request(args);
  }

  public async init() {
    if (!this.eth && !this.isCreatingTransport) {
      this.isCreatingTransport = true;
      const openTimeout =
        this.options.openTimeout || LedgerProvider.DEFAULT_TIMEOUT;
      const connectionTimeout =
        this.options.connectionTimeout || LedgerProvider.DEFAULT_TIMEOUT;

      try {
        const transport = await TransportNodeHid.create(
          openTimeout,
          connectionTimeout
        );
        this.eth = new Eth(transport);
      } catch (error) {
        if (error instanceof Error) {
          let errorMessage = `There was an error trying to stablish a connection to the Ledger wallet: "${error.message}".`;

          if (error.name === "TransportError") {
            const transportError = error as TransportError;
            errorMessage += ` The error id was: ${transportError.id}`;
          }
          // throw NomicLabsHardhatPluginError(
          //   "@nomiclabs/hardhat-ledger",
          //   errorMessage
          // )
          throw new Error(errorMessage);
        }

        throw error;
      }
      this.isCreatingTransport = false;
    }
  }
}

// private async signTransaction(
//   transaction: ethers.providers.TransactionRequest
// ): Promise<string> {
//   const tx =
//     await hre.ethers.utils.resolveProperties<ethers.providers.TransactionRequest>(
//       transaction
//     );
//   const baseTx: ethers.utils.UnsignedTransaction = {
//     chainId: tx.chainId || undefined,
//     data: tx.data || undefined,
//     gasLimit: tx.gasLimit || undefined,
//     gasPrice: tx.gasPrice || undefined,
//     nonce: tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined,
//     to: tx.to || undefined,
//     value: tx.value || undefined,
//   };

//   const unsignedTx = ethers.utils.serializeTransaction(baseTx).substring(2);
//   const sig = await this.eth?.signTransaction(this.path, unsignedTx)!;

//   return ethers.utils.serializeTransaction(baseTx, {
//     v: ethers.BigNumber.from("0x" + sig.v).toNumber(),
//     r: "0x" + sig.r,
//     s: "0x" + sig.s,
//   });
// }

// extendProvider(async (provider: EIP1193Provider) => {
//   const newProvider = new LedgerProvider({ path: "44'/60'/0'/0/0" }, provider);
//   await newProvider.init();
//   return newProvider;
// });
