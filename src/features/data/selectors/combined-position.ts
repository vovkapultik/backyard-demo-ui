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
