import type BigNumber from 'bignumber.js';
import type { ChainEntity } from '../entities/chain.ts';
import type { TokenEntity } from '../entities/token.ts';
import type { VaultEntity } from '../entities/vault.ts';
import type { TransactQuote, TransactOption } from '../apis/transact/transact-types.ts';

export type CombinedPositionVaultQuote = {
  bestQuote?: TransactQuote; // The best quote for this vault
  allQuotes: TransactQuote[]; // All quotes fetched for this vault
  inputAmount: BigNumber; // Amount of source token allocated to this vault
  expectedOutput?: {
    amount: BigNumber;
    token: TokenEntity;
    usdValue: BigNumber;
  };
  status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  error?: string;
  options?: TransactOption[]; // Available deposit options for this vault
};

export type CombinedPositionVault = {
  vaultId: VaultEntity['id'];
  allocation: number; // percentage (0-100)
  amount?: BigNumber; // calculated amount based on allocation
  quote?: CombinedPositionVaultQuote; // Complete quote data for this vault
};

export type CombinedPositionState = {
  isOpen: boolean;
  selectedVaults: CombinedPositionVault[];
  totalAmount: BigNumber;
  selectedToken: TokenEntity | null;
  chainId: ChainEntity['id'] | null;
  quotesStatus: 'idle' | 'pending' | 'fulfilled' | 'rejected';
  quotesError: string | null;
};

export type CombinedPositionInput = {
  vaultId: VaultEntity['id'];
  token: TokenEntity;
  amount: BigNumber;
  allocation: number;
};
