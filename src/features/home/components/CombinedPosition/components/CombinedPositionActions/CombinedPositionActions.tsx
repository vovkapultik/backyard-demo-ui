import { memo, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@repo/styles/jsx';
import { Button } from '../../../../../../components/Button/Button.tsx';
import { useAppDispatch, useAppSelector } from '../../../../../data/store/hooks.ts';
import {
  selectCombinedPositionSelectedVaults,
  selectCombinedPositionTotalAmount,
  selectCombinedPositionSelectedToken,
  selectCombinedPositionTotalAllocation,
  selectCombinedPositionChainId,
} from '../../../../../data/selectors/combined-position.ts';
import { selectWalletAddress, selectIsWalletConnected, selectCurrentChainId } from '../../../../../data/selectors/wallet.ts';
import { selectVaultById } from '../../../../../data/selectors/vaults.ts';
import { selectChainById } from '../../../../../data/selectors/chains.ts';
import { selectUserBalanceOfToken } from '../../../../../data/selectors/balance.ts';
import { askForWalletConnection, askForNetworkChange } from '../../../../../data/actions/wallet.ts';
import { stepperAddStep, stepperStart } from '../../../../../data/actions/wallet/stepper.ts';
import { BIG_ZERO } from '../../../../../../helpers/big-number.ts';

export const CombinedPositionActions = memo(function CombinedPositionActions() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedVaults = useAppSelector(selectCombinedPositionSelectedVaults);
  const totalAmount = useAppSelector(selectCombinedPositionTotalAmount);
  const selectedToken = useAppSelector(selectCombinedPositionSelectedToken);
  const totalAllocation = useAppSelector(selectCombinedPositionTotalAllocation);
  const chainId = useAppSelector(selectCombinedPositionChainId);
  const isWalletConnected = useAppSelector(selectIsWalletConnected);
  const walletAddress = useAppSelector(selectWalletAddress);
  const currentChainId = useAppSelector(selectCurrentChainId);
  const chain = useAppSelector(state => chainId ? selectChainById(state, chainId) : null);
  const userBalance = useAppSelector(state => 
    selectedToken ? selectUserBalanceOfToken(state, selectedToken.chainId, selectedToken.address) : BIG_ZERO
  );
  
  // Get vault entities for selected vaults
  const vaultEntities = useAppSelector(state => 
    selectedVaults.map(sv => ({
      ...sv,
      vault: selectVaultById(state, sv.vaultId)
    }))
  );

  const validationStatus = useMemo(() => {
    if (!isWalletConnected) {
      return {
        isValid: false,
        buttonText: t('Network-ConnectWallet'),
        variant: 'primary' as const,
        action: 'connect',
      };
    }

    if (chainId && currentChainId !== chainId) {
      return {
        isValid: false,
        buttonText: t('Network-Change', { network: chainId }),
        variant: 'primary' as const,
        action: 'switchNetwork',
      };
    }

    if (selectedVaults.length === 0) {
      return {
        isValid: false,
        buttonText: t('CombinedPosition-Deposit'),
        variant: 'ghost' as const,
        action: 'none',
      };
    }

    if (!selectedToken || totalAmount.isLessThanOrEqualTo(BIG_ZERO)) {
      return {
        isValid: false,
        buttonText: t('CombinedPosition-Deposit'),
        variant: 'ghost' as const,
        action: 'none',
      };
    }

    if (totalAmount.isGreaterThan(userBalance)) {
      return {
        isValid: false,
        buttonText: t('Transact-InsufficientBalance'),
        variant: 'ghost' as const,
        action: 'none',
      };
    }

    if (totalAllocation !== 100) {
      return {
        isValid: false,
        buttonText: t('CombinedPosition-TotalAllocation'),
        variant: 'ghost' as const,
        action: 'none',
      };
    }

    return {
      isValid: true,
      buttonText: t('CombinedPosition-Deposit'),
      variant: 'success' as const,
      action: 'deposit',
    };
  }, [
    isWalletConnected,
    chainId,
    currentChainId,
    selectedVaults.length,
    selectedToken,
    totalAmount,
    totalAllocation,
    userBalance,
    t,
  ]);

  const handleAction = useCallback(() => {
    if (!validationStatus.isValid) {
      return;
    }

    switch (validationStatus.action) {
      case 'connect':
        dispatch(askForWalletConnection());
        break;
      case 'switchNetwork':
        if (chainId) {
          dispatch(askForNetworkChange({ chainId }));
        }
        break;
      case 'deposit':
        handleMultiVaultDeposit();
        break;
    }
  }, [validationStatus, chainId, dispatch]);

  const handleMultiVaultDeposit = useCallback(() => {
    if (!selectedToken || !chain || !totalAmount || !vaultEntities.length) {
      return;
    }

    // Create deposit steps for each vault
    vaultEntities.forEach(({ vaultId, allocation, vault }) => {
      const vaultAmount = totalAmount.multipliedBy(allocation).dividedBy(100);
      
      if (vaultAmount.isGreaterThan(BIG_ZERO)) {
        // Add approval step if needed (for ERC-20 tokens)
        if (selectedToken.type !== 'native') {
          dispatch(stepperAddStep({
            step: {
              step: 'approve',
              message: t('Vault-ApproveMsg'),
              action: `approve-${vaultId}`, // This would need to be replaced with actual approval action
              pending: false,
            },
          }));
        }

        // Add deposit step
        dispatch(stepperAddStep({
          step: {
            step: 'deposit',
            message: t('Vault-TxnConfirm', { 
              type: t('Transact-Deposit') + ` (${vault.name})` 
            }),
            action: `deposit-${vaultId}`, // This would need to be replaced with actual deposit action
            pending: false,
          },
        }));
      }
    });

    // Start the stepper
    if (chain) {
      dispatch(stepperStart(chain.id));
    }
  }, [selectedToken, chain, totalAmount, vaultEntities, dispatch, t]);

  return (
    <Container>
      <SummarySection>
        <SummaryTitle>{t('CombinedPosition-Allocation')}</SummaryTitle>
        <AllocationSummary>
          {selectedVaults.map(vault => (
            <AllocationItem key={vault.vaultId}>
              <AllocationVault>Vault {vault.vaultId.slice(-6)}</AllocationVault>
              <AllocationPercent>{vault.allocation}%</AllocationPercent>
            </AllocationItem>
          ))}
          <TotalAllocation isValid={totalAllocation === 100}>
            Total: {totalAllocation}%
          </TotalAllocation>
        </AllocationSummary>
      </SummarySection>

      <ActionButton
        variant={validationStatus.variant}
        fullWidth
        size="lg"
        onClick={handleAction}
        disabled={!validationStatus.isValid && validationStatus.action === 'none'}
      >
        {validationStatus.buttonText}
      </ActionButton>
    </Container>
  );
});

const Container = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
});

const SummarySection = styled('div', {
  base: {
    padding: '16px',
    backgroundColor: 'background.content.dark',
    borderRadius: '8px',
    border: '2px solid {colors.background.content.dark}',
  },
});

const SummaryTitle = styled('h4', {
  base: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: 'text.light',
  },
});

const AllocationSummary = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
});

const AllocationItem = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
  },
});

const AllocationVault = styled('span', {
  base: {
    color: 'text.middle',
  },
});

const AllocationPercent = styled('span', {
  base: {
    color: 'text.light',
    fontWeight: '500',
  },
});

const TotalAllocation = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    paddingTop: '8px',
    borderTop: '1px solid {colors.background.content}',
    marginTop: '4px',
  },
  variants: {
    isValid: {
      true: {
        color: 'success.main',
      },
      false: {
        color: 'error.main',
      },
    },
  },
});

const ActionButton = styled(Button, {
  base: {
    minHeight: '48px',
    fontSize: '16px',
    fontWeight: '600',
  },
});
