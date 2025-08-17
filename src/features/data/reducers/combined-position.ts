import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type BigNumber from 'bignumber.js';
import { BIG_ZERO } from '../../../helpers/big-number.ts';
import type { ChainEntity } from '../entities/chain.ts';
import type { TokenEntity } from '../entities/token.ts';
import type { VaultEntity } from '../entities/vault.ts';
import type { CombinedPositionState, CombinedPositionVault } from './combined-position-types.ts';

const initialState: CombinedPositionState = {
  isOpen: false,
  selectedVaults: [],
  totalAmount: BIG_ZERO,
  selectedToken: null,
  chainId: null,
};

export const combinedPositionSlice = createSlice({
  name: 'combinedPosition',
  initialState,
  reducers: {
    setIsOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
      if (!action.payload) {
        // Reset state when closing
        state.selectedVaults = [];
        state.totalAmount = BIG_ZERO;
        state.selectedToken = null;
        state.chainId = null;
      }
    },
    addVault: (state, action: PayloadAction<{ vaultId: VaultEntity['id']; chainId: ChainEntity['id'] }>) => {
      const { vaultId, chainId } = action.payload;
      
      // Check if vault is already selected
      if (state.selectedVaults.find(v => v.vaultId === vaultId)) {
        return;
      }
      
      // Set chain if first vault
      if (state.selectedVaults.length === 0) {
        state.chainId = chainId;
      }
      
      // Add vault with equal allocation
      const newVaultCount = state.selectedVaults.length + 1;
      const equalAllocation = Math.floor(100 / newVaultCount);
      const remainder = 100 - (equalAllocation * newVaultCount);
      
      // Redistribute allocations equally
      state.selectedVaults.forEach(vault => {
        vault.allocation = equalAllocation;
      });
      
      // Add new vault
      state.selectedVaults.push({
        vaultId,
        allocation: equalAllocation + remainder, // Give remainder to last vault
      });
    },
    removeVault: (state, action: PayloadAction<VaultEntity['id']>) => {
      const vaultId = action.payload;
      state.selectedVaults = state.selectedVaults.filter(v => v.vaultId !== vaultId);
      
      // Reset chain if no vaults left
      if (state.selectedVaults.length === 0) {
        state.chainId = null;
        state.selectedToken = null;
        state.totalAmount = BIG_ZERO;
        return;
      }
      
      // Redistribute allocations equally
      const equalAllocation = Math.floor(100 / state.selectedVaults.length);
      const remainder = 100 - (equalAllocation * state.selectedVaults.length);
      
      state.selectedVaults.forEach((vault, index) => {
        vault.allocation = equalAllocation + (index === 0 ? remainder : 0);
      });
    },
    setVaultAllocation: (state, action: PayloadAction<{ vaultId: VaultEntity['id']; allocation: number }>) => {
      const { vaultId, allocation } = action.payload;
      const vault = state.selectedVaults.find(v => v.vaultId === vaultId);
      if (vault) {
        vault.allocation = allocation;
      }
    },
    setTotalAmount: (state, action: PayloadAction<{ amount: BigNumber; token: TokenEntity }>) => {
      state.totalAmount = action.payload.amount;
      state.selectedToken = action.payload.token;
      
      // Update individual vault amounts based on allocation
      state.selectedVaults.forEach(vault => {
        vault.amount = action.payload.amount.multipliedBy(vault.allocation).dividedBy(100);
      });
    },
    reset: () => initialState,
  },
});

export const combinedPositionActions = combinedPositionSlice.actions;
export const combinedPositionReducer = combinedPositionSlice.reducer;
