import "@nomicfoundation/hardhat-toolbox";

import { ProviderWrapper } from "hardhat/plugins";
import { HardhatUserConfig, extendProvider } from "hardhat/config";
import {
  EIP1193Provider,
  HardhatConfig,
  RequestArguments,
} from "hardhat/types";

import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { TransportError } from "@ledgerhq/errors";
import Eth from "@ledgerhq/hw-app-eth";

import { validateParams } from "hardhat/internal/core/jsonrpc/types/input/validation";
import {
  rpcAddress,
  rpcData,
} from "hardhat/internal/core/jsonrpc/types/base-types";
import { HardhatError } from "hardhat/src/internal/core/errors";
import { ERRORS } from "hardhat/src/internal/core/errors-list";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
};
export default config;

export interface LedgerOptions {
  path: string;
  openTimeout?: number;
  connectionTimeout?: number;
}

class LedgerProvider extends ProviderWrapper {
  public static readonly DEFAULT_TIMEOUT = 3000;

  public name: string = "LedgerProvider";

  private _eth: Eth | undefined;
  private _isCreatingTransport = false;

  static async create(
    options: LedgerOptions,
    _wrappedProvider: EIP1193Provider
  ) {
    const provider = new LedgerProvider(options, _wrappedProvider);
    await provider.init();
    return provider;
  }

  constructor(
    public readonly options: LedgerOptions,
    protected readonly _wrappedProvider: EIP1193Provider
  ) {
    super(_wrappedProvider);
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const { ecsign, hashPersonalMessage, toRpcSig, toBuffer, bufferToHex } =
      await import("@nomicfoundation/ethereumjs-util");

    const params = this._getParams(args);

    if (this._eth === undefined) {
      throw new Error();
    }

    // get Ethereum address for a given BIP 32 path.
    if (
      args.method === "eth_accounts" ||
      args.method === "eth_requestAccounts"
    ) {
      const wallet = await this._eth.getAddress(this.options.path);
      return [wallet.address];
    }

    // You can sign a transaction and retrieve v, r, s given the raw transaction and the BIP 32 path of the account to sign.
    // const tx = "e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080"; // raw tx to sign
    // const resolution = await ledgerService.resolveTransaction(tx);
    // const result = eth.signTransaction("44'/60'/0'/0/0", tx, resolution);
    // console.log(result);

    // You can sign a message according to eth_sign RPC call and retrieve v, r, s given the message and the BIP 32 path of the account to sign.
    if (args.method === "personal_sign" || args.method === "eth_sign") {
      if (params.length > 0) {
        let data: Buffer;
        let address: Buffer;

        if (args.method === "personal_sign") {
          const validParams = validateParams(params, rpcData, rpcAddress);
          data = validParams[0];
          address = validParams[1];
        } else {
          // eth_sign
          const validParams = validateParams(params, rpcAddress, rpcData);
          data = validParams[1];
          address = validParams[0];
        }

        if (data !== undefined) {
          if (address === undefined) {
            throw new HardhatError(
              ERRORS.NETWORK.PERSONALSIGN_MISSING_ADDRESS_PARAM
            );
          }

          const signature = await this._eth.signPersonalMessage(
            this.options.path,
            data.toString("hex")
          );

          return toRpcSig(
            BigInt(signature.v - 27),
            toBuffer("0x" + signature.r),
            toBuffer("0x" + signature.s)
          );
        }
      }
    }

    // Sign a prepared message following web3.eth.signTypedData specification. The host computes the domain separator and hashStruct(message)
    // eth.signEIP712HashedMessage("44'/60'/0'/0/0", Buffer.from("0101010101010101010101010101010101010101010101010101010101010101").toString("hex"), Buffer.from("0202020202020202020202020202020202020202020202020202020202020202").toString("hex"))

    // throw if not init?
    return this._wrappedProvider.request(args);
  }

  public async init() {
    if (!this._eth && !this._isCreatingTransport) {
      this._isCreatingTransport = true;
      const openTimeout =
        this.options.openTimeout || LedgerProvider.DEFAULT_TIMEOUT;
      const connectionTimeout =
        this.options.connectionTimeout || LedgerProvider.DEFAULT_TIMEOUT;

      try {
        const transport = await TransportNodeHid.create(
          openTimeout,
          connectionTimeout
        );
        this._eth = new Eth(transport);
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
      this._isCreatingTransport = false;
    }
  }
}

extendProvider(
  async (provider: EIP1193Provider, config: HardhatConfig, network: string) => {
    return await LedgerProvider.create({ path: "44'/60'/0'/0" }, provider);
  }
);
