import { createSelector } from '@reduxjs/toolkit';
import type { BeefyState } from '../store/types.ts';

export const selectCombinedPosition = (state: BeefyState) => state.ui.combinedPosition;

export const selectCombinedPositionIsOpen = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.isOpen
);

export const selectCombinedPositionSelectedVaults = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.selectedVaults
);

export const selectCombinedPositionTotalAmount = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.totalAmount
);

export const selectCombinedPositionSelectedToken = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.selectedToken
);

export const selectCombinedPositionChainId = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.chainId
);

export const selectCombinedPositionCanAddVault = createSelector(
  selectCombinedPositionSelectedVaults,
  selectedVaults => selectedVaults.length < 3
);

export const selectCombinedPositionVaultCount = createSelector(
  selectCombinedPositionSelectedVaults,
  selectedVaults => selectedVaults.length
);

export const selectIsVaultInCombinedPosition = createSelector(
  selectCombinedPositionSelectedVaults,
  (_state: BeefyState, vaultId: string) => vaultId,
  (selectedVaults, vaultId) => selectedVaults.some(vault => vault.vaultId === vaultId)
);

export const selectCombinedPositionTotalAllocation = createSelector(
  selectCombinedPositionSelectedVaults,
  selectedVaults => selectedVaults.reduce((total, vault) => total + vault.allocation, 0)
);

export const selectCombinedPositionQuotesStatus = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.quotesStatus
);

export const selectCombinedPositionQuotesError = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.quotesError
);

// Selectors for quote triggering (without quote data to prevent loops)
export const selectCombinedPositionVaultInputs = createSelector(
  selectCombinedPosition,
  combinedPosition => combinedPosition.selectedVaults.map(vault => ({
    vaultId: vault.vaultId,
    allocation: vault.allocation,
    amount: vault.amount,
  }))
);

export const selectCombinedPositionQuoteTrigger = createSelector(
  selectCombinedPositionVaultInputs,
  selectCombinedPositionSelectedToken,
  selectCombinedPositionTotalAmount,
  (vaultInputs, selectedToken, totalAmount) => ({
    vaultInputs,
    selectedToken,
    totalAmount,
    // Create a hash to detect changes
    hash: JSON.stringify({
      vaults: vaultInputs.map(v => ({ id: v.vaultId, amount: v.amount?.toString() })),
      token: selectedToken ? `${selectedToken.chainId}-${selectedToken.address}` : null,
      total: totalAmount.toString(),
    })
  })
);
