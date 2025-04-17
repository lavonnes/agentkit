import { CdpClient, EvmServerAccount } from "@coinbase/cdp-sdk";
import {
  Abi,
  Address,
  ContractFunctionArgs,
  ContractFunctionName,
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  PublicClient,
  ReadContractParameters,
  ReadContractReturnType,
  serializeTransaction,
  Signature,
  TransactionRequest,
  TransactionSerializable
} from "viem";
import { Network, NETWORK_ID_TO_CHAIN_ID, NETWORK_ID_TO_VIEM_CHAIN } from "../network";
import { EvmWalletProvider } from "./evmWalletProvider";
import { toAccount } from "viem/accounts";
import { CdpV2WalletProviderConfig } from "./cdpV2Shared";


interface ConfigureCdpV2EvmWalletProviderWithWalletOptions {
  /**
   * The CDP client of the wallet.
   */
  cdpClient: CdpClient;

  /**
   * The server account of the wallet.
   */
  serverAccount: EvmServerAccount;

  /**
   * The public client of the wallet.
   */
  publicClient: PublicClient;

  /**
   * The network of the wallet.
   */
  network: Network;
}

/**
 * A wallet provider that uses the Coinbase SDK.
 */
export class CdpV2EvmWalletProvider extends EvmWalletProvider {
  #publicClient: PublicClient;
  #serverAccount: EvmServerAccount;
  #cdpClient: CdpClient;
  #network: Network;

  /**
   * Constructs a new CdpWalletProvider.
   *
   * @param config - The configuration options for the CdpWalletProvider.
   */
  private constructor(config: ConfigureCdpV2EvmWalletProviderWithWalletOptions) {
    super();

    this.#serverAccount = config.serverAccount;
    this.#cdpClient = config.cdpClient;
    this.#publicClient = config.publicClient;
    this.#network = config.network;
  }

  /**
   * Configures a new CdpWalletProvider with a wallet.
   *
   * @param config - Optional configuration parameters
   * @returns A Promise that resolves to a new CdpWalletProvider instance
   * @throws Error if required environment variables are missing or wallet initialization fails
   */
  public static async configureWithWallet(
    config: CdpV2WalletProviderConfig = {},
  ): Promise<CdpV2EvmWalletProvider> {
    const apiKeyId = config.apiKeyId || process.env.CDP_API_KEY_ID;
    const apiKeySecret = config.apiKeySecret || process.env.CDP_API_KEY_SECRET;
    const walletSecret = config.walletSecret || process.env.CDP_WALLET_SECRET;
    const idempotencyKey = config.idempotencyKey || process.env.IDEMPOTENCY_KEY;

    if (!apiKeyId || !apiKeySecret || !walletSecret) {
      throw new Error("Missing required environment variables. CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET are required.");
    }

    const networkId: string = config.networkId || process.env.NETWORK_ID || "base-sepolia";
    const network = {
      protocolFamily: "evm" as const,
      chainId: NETWORK_ID_TO_CHAIN_ID[networkId],
      networkId: networkId,
    };

    const cdpClient = new CdpClient({
      apiKeyId,
      apiKeySecret,
      walletSecret,
    })

    const serverAccount = await (config.address ? cdpClient.evm.getAccount({ address: config.address as Address }) : cdpClient.evm.createAccount({ idempotencyKey }))

    const publicClient = createPublicClient({
      chain: NETWORK_ID_TO_VIEM_CHAIN[networkId],
      transport: http(),
    });

    return new CdpV2EvmWalletProvider({
      publicClient,
      cdpClient,
      serverAccount,
      network,
    })
  }

  /**
   * Signs a message.
   *
   * @param message - The message to sign.
   * @returns The signed message.
   */
  async signMessage(message: string): Promise<Hex> {
    return this.#serverAccount.signMessage({ message });
  }

  /**
   * Signs a typed data object.
   *
   * @param typedData - The typed data object to sign.
   * @returns The signed typed data object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signTypedData(typedData: any): Promise<Hex> {
    return this.#serverAccount.signTypedData(typedData);
  }

  /**
   * Signs a transaction.
   *
   * @param transaction - The transaction to sign.
   * @returns The signed transaction.
   */
  async signTransaction(transaction: TransactionRequest): Promise<Hex> {
    const serializedTx = serializeTransaction(transaction as TransactionSerializable);
    const signedTx = await this.#cdpClient.evm.signTransaction({
      address: this.#serverAccount.address,
      transaction: serializedTx,
    })

    return signedTx.signature;
  }

  /**
   * Sends a transaction.
   *
   * @param transaction - The transaction to send.
   * @returns The hash of the transaction.
   */
  async sendTransaction(transaction: TransactionRequest): Promise<Hex> {
    const viemAccount = toAccount({
      address: this.#serverAccount.address,
      signMessage: async ({ message }) => {
        throw new Error("Not implemented")
      },
      signTransaction: async (transaction) => {
        const result = await this.#cdpClient.evm.signTransaction({
          address: this.#serverAccount.address,
          transaction: serializeTransaction(transaction as TransactionSerializable),
        });
        return result.signature as Hex;
      },
      signTypedData: async (typedData) => {
        throw new Error("Not implemented")
      },
    })

    return await createWalletClient({
      chain: NETWORK_ID_TO_VIEM_CHAIN[this.#network.networkId!],
      transport: http()
    }).sendTransaction({
      account: viemAccount,
      to: transaction.to as Address,
      value: transaction.value as bigint,
      data: transaction.data as Hex,
    })
  }

  /**
   * Gets the address of the wallet.
   *
   * @returns The address of the wallet.
   */
  getAddress(): string {
    return this.#serverAccount.address;
  }

  /**
   * Gets the network of the wallet.
   *
   * @returns The network of the wallet.
   */
  getNetwork(): Network {
    return this.#network;
  }

  /**
   * Gets the name of the wallet provider.
   *
   * @returns The name of the wallet provider.
   */
  getName(): string {
    return "cdp_v2_wallet_provider";
  }

  /**
   * Gets the balance of the wallet.
   *
   * @returns The balance of the wallet in wei
   */
  async getBalance(): Promise<bigint> {
    return await this.#publicClient!.getBalance({ address: this.#serverAccount.address });
  }

  /**
   * Waits for a transaction receipt.
   *
   * @param txHash - The hash of the transaction to wait for.
   * @returns The transaction receipt.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async waitForTransactionReceipt(txHash: Hex): Promise<any> {
    return await this.#publicClient!.waitForTransactionReceipt({ hash: txHash });
  }

  /**
   * Reads a contract.
   *
   * @param params - The parameters to read the contract.
   * @returns The response from the contract.
   */
  async readContract<
    const abi extends Abi | readonly unknown[],
    functionName extends ContractFunctionName<abi, "pure" | "view">,
    const args extends ContractFunctionArgs<abi, "pure" | "view", functionName>,
  >(
    params: ReadContractParameters<abi, functionName, args>,
  ): Promise<ReadContractReturnType<abi, functionName, args>> {
    return this.#publicClient!.readContract<abi, functionName, args>(params);
  }

  /**
   * Transfer the native asset of the network.
   *
   * @param to - The destination address.
   * @param value - The amount to transfer in Wei.
   * @returns The transaction hash.
   */
  async nativeTransfer(to: Address, value: string): Promise<Hex> {
    return this.sendTransaction({
      to: to,
      value: BigInt(value),
      data: "0x",
    });
  }
}
