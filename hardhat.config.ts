import "@nomicfoundation/hardhat-toolbox";

import { HardhatUserConfig, extendProvider } from "hardhat/config";
import {
  EIP1193Provider,
  HardhatConfig,
  RequestArguments,
} from "hardhat/types";

import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { TransportError } from "@ledgerhq/errors";
import Eth, { ledgerService } from "@ledgerhq/hw-app-eth";
import { EIP712Message } from "@ledgerhq/hw-app-eth/lib/modules/EIP712";

import "@nomiclabs/hardhat-ethers";
import * as t from "io-ts";
import { validateParams } from "hardhat/internal/core/jsonrpc/types/input/validation";
import { rpcTransactionRequest } from "hardhat/internal/core/jsonrpc/types/input/transactionRequest";
import {
  rpcAddress,
  rpcData,
  rpcQuantityToBigInt,
} from "hardhat/internal/core/jsonrpc/types/base-types";
import { ProviderWrapperWithChainId } from "hardhat/src/internal/core/providers/chainId";
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

class LedgerProvider extends ProviderWrapperWithChainId {
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
    const { toRpcSig, toBuffer, bufferToHex } = await import(
      "@nomicfoundation/ethereumjs-util"
    );

    const params = this._getParams(args);

    if (this._eth === undefined) {
      // TODO: better error
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
    // eth.signEIP721Message("44'/60'/0'/0/0", {
    //   domain: { ... },
    //   types: { ... },
    //   primaryType: "Test",
    //   message: {contents: "Hello, Bob!"},
    // })
    if (args.method === "eth_signTypedData_v4") {
      const [_, data] = validateParams(params, rpcAddress, t.any as any);

      if (data === undefined) {
        throw new HardhatError(ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
      }

      let typedMessage: EIP712Message = data as EIP712Message;
      if (typeof data === "string") {
        try {
          typedMessage = JSON.parse(data);
        } catch {
          throw new HardhatError(
            ERRORS.NETWORK.ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM
          );
        }
      }
      const { types, domain, message, primaryType } = typedMessage;
      const { EIP712Domain, ...structTypes } = types;

      let signature;

      try {
        signature = await this._eth.signEIP712Message(
          this.options.path,
          typedMessage
        );
      } catch (error) {
        signature = await this._eth.signEIP712HashedMessage(
          this.options.path,
          ethers.utils._TypedDataEncoder.hashDomain(domain),
          ethers.utils._TypedDataEncoder.hashStruct(
            primaryType,
            structTypes,
            message
          )
        );
      }

      // TODO: if we don't manage the address, the method is forwarded
      return toRpcSig(
        BigInt(signature.v - 27),
        toBuffer("0x" + signature.r),
        toBuffer("0x" + signature.s)
      );
    }

    // You can sign a transaction and retrieve v, r, s given the raw transaction and the BIP 32 path of the account to sign.
    // const tx = "e8018504e3b292008252089428ee52a8f3d6e5d15f8b131996950d7f296c7952872bd72a2487400080"; // raw tx to sign
    // const resolution = await ledgerService.resolveTransaction(tx);
    // const result = eth.signTransaction("44'/60'/0'/0/0", tx, resolution);
    // console.log(result);

    if (args.method === "eth_sendTransaction" && params.length > 0) {
      const [txRequest] = validateParams(params, rpcTransactionRequest);

      if (txRequest.gas === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "gas" }
        );
      }

      if (txRequest.from === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "from" }
        );
      }

      const hasGasPrice = txRequest.gasPrice !== undefined;
      const hasEip1559Fields =
        txRequest.maxFeePerGas !== undefined ||
        txRequest.maxPriorityFeePerGas !== undefined;

      if (!hasGasPrice && !hasEip1559Fields) {
        throw new HardhatError(ERRORS.NETWORK.MISSING_FEE_PRICE_FIELDS);
      }

      if (hasGasPrice && hasEip1559Fields) {
        throw new HardhatError(ERRORS.NETWORK.INCOMPATIBLE_FEE_PRICE_FIELDS);
      }

      if (hasEip1559Fields && txRequest.maxFeePerGas === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "maxFeePerGas" }
        );
      }

      if (hasEip1559Fields && txRequest.maxPriorityFeePerGas === undefined) {
        throw new HardhatError(
          ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
          { param: "maxPriorityFeePerGas" }
        );
      }

      console.log(1);

      if (txRequest.nonce === undefined) {
        txRequest.nonce = await this._getNonce(txRequest.from);
      }

      console.log(2);

      const chainId = await this._getChainId();

      const baseTx: ethers.utils.UnsignedTransaction = {
        chainId,
        data: txRequest.data,
        gasLimit: txRequest.gas,
        gasPrice: txRequest.gasPrice,
        nonce: txRequest.nonce,
        to: txRequest.to,
        value: txRequest.value,
      };

      const txToSign = ethers.utils.serializeTransaction(baseTx).substring(2);

      console.log("Base TX", baseTx);

      const resolution = await ledgerService.resolveTransaction(
        txToSign,
        {},
        {}
      );
      const signature = await this._eth.signTransaction(
        this.options.path,
        txToSign,
        resolution
      );

      console.log("SIGNATURE", signature);
      const rawTransaction = ethers.utils.serializeTransaction(baseTx, {
        v: ethers.BigNumber.from("0x" + signature.v).toNumber(),
        r: "0x" + signature.r,
        s: "0x" + signature.s,
      });

      console.log("RAW TX", rawTransaction);

      return "";

      // return this._wrappedProvider.request({
      //   method: "eth_sendRawTransaction",
      //   params: [rawTransaction],
      // });
    }

    return this._wrappedProvider.request(args);
  }

  private async _getNonce(address: Buffer): Promise<bigint> {
    const { bufferToHex } = await import("@nomicfoundation/ethereumjs-util");

    const response = (await this._wrappedProvider.request({
      method: "eth_getTransactionCount",
      params: [bufferToHex(address), "pending"],
    })) as string;

    return rpcQuantityToBigInt(response);
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
