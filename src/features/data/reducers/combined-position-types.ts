import type BigNumber from 'bignumber.js';
import type { ChainEntity } from '../entities/chain.ts';
import type { TokenEntity } from '../entities/token.ts';
import type { VaultEntity } from '../entities/vault.ts';

export type CombinedPositionVault = {
  vaultId: VaultEntity['id'];
  allocation: number; // percentage (0-100)
  amount?: BigNumber; // calculated amount based on allocation
};

export type CombinedPositionState = {
  isOpen: boolean;
  selectedVaults: CombinedPositionVault[];
  totalAmount: BigNumber;
  selectedToken: TokenEntity | null;
  chainId: ChainEntity['id'] | null;
};

export type CombinedPositionInput = {
  vaultId: VaultEntity['id'];
  token: TokenEntity;
  amount: BigNumber;
  allocation: number;
};
