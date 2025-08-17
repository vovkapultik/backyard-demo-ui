import { memo, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@repo/styles/jsx';
import { Button } from '../../../../../../components/Button/Button.tsx';
import { AlertError, AlertWarning } from '../../../../../../components/Alerts/Alerts.tsx';
import { useAppDispatch, useAppSelector } from '../../../../../data/store/hooks.ts';
import { combinedPositionActions } from '../../../../../data/reducers/combined-position.ts';
import { selectVaultById } from '../../../../../data/selectors/vaults.ts';
import {
  selectCombinedPositionCanAddVault,
  selectCombinedPositionChainId,
  selectIsVaultInCombinedPosition,
  selectCombinedPositionVaultCount,
} from '../../../../../data/selectors/combined-position.ts';
import type { VaultEntity } from '../../../../../data/entities/vault.ts';
import PlusIcon from '../../../../../../images/icons/plus.svg?react';

export type AddToCombinedPositionButtonProps = {
  vaultId: VaultEntity['id'];
};

type ValidationAlert = {
  type: 'error' | 'warning';
  message: string;
} | null;

export const AddToCombinedPositionButton = memo(function AddToCombinedPositionButton({
  vaultId,
}: AddToCombinedPositionButtonProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const vault = useAppSelector(state => selectVaultById(state, vaultId));
  const canAddVault = useAppSelector(selectCombinedPositionCanAddVault);
  const selectedChainId = useAppSelector(selectCombinedPositionChainId);
  const isVaultInPosition = useAppSelector(state => selectIsVaultInCombinedPosition(state, vaultId));
  const vaultCount = useAppSelector(selectCombinedPositionVaultCount);
  
  const [validationAlert, setValidationAlert] = useState<ValidationAlert>(null);

  // Clear alert after 3 seconds
  useEffect(() => {
    if (validationAlert) {
      const timer = setTimeout(() => {
        setValidationAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [validationAlert]);

  const handleAddVault = useCallback(() => {
    if (isVaultInPosition) {
      dispatch(combinedPositionActions.removeVault(vaultId));
      setValidationAlert(null);
      return;
    }

    // Validation: Check if vault can be added
    if (!canAddVault) {
      setValidationAlert({
        type: 'warning',
        message: t('CombinedPosition-MaxVaults')
      });
      return;
    }

    // Validation: Check chain compatibility
    if (selectedChainId && selectedChainId !== vault.chainId) {
      setValidationAlert({
        type: 'error',
        message: t('CombinedPosition-WrongNetwork')
      });
      return;
    }

    // Validation: Check strategy type (no multi-lp)
    if (vault.strategyTypeId === 'multi-lp') {
      setValidationAlert({
        type: 'error',
        message: t('CombinedPosition-MultiLpNotAllowed')
      });
      return;
    }

    // Clear any previous alerts
    setValidationAlert(null);

    // Add vault to combined position
    dispatch(combinedPositionActions.addVault({ vaultId, chainId: vault.chainId }));
  }, [dispatch, vaultId, vault.chainId, vault.strategyTypeId, isVaultInPosition, canAddVault, selectedChainId, vaultCount, t]);

  // Don't show button for multi-lp strategies
  if (vault.strategyTypeId === 'multi-lp') {
    return null;
  }

  // Show different states based on conditions
  const isDisabled = 
    (!canAddVault && !isVaultInPosition) || // Max vaults reached
    (selectedChainId && selectedChainId !== vault.chainId && !isVaultInPosition); // Wrong network

  return (
    <ButtonContainer>
      <StyledButton
        variant={isVaultInPosition ? 'success' : 'default'}
        size="sm"
        onClick={handleAddVault}
        disabled={!!isDisabled}
        title={
          isVaultInPosition ? t('CombinedPosition-RemoveVault') :
          !canAddVault ? t('CombinedPosition-MaxVaults') :
          selectedChainId && selectedChainId !== vault.chainId ? t('CombinedPosition-WrongNetwork') :
          t('CombinedPosition-AddVault')
        }
      >
        <IconContainer isSelected={isVaultInPosition}>
          <PlusIcon />
        </IconContainer>
      </StyledButton>
      
      {validationAlert && (
        <AlertContainer>
          {validationAlert.type === 'error' ? (
            <AlertError css={{ fontSize: '12px', padding: '8px 12px' }}>
              {validationAlert.message}
            </AlertError>
          ) : (
            <AlertWarning css={{ fontSize: '12px', padding: '8px 12px' }}>
              {validationAlert.message}
            </AlertWarning>
          )}
        </AlertContainer>
      )}
    </ButtonContainer>
  );
});

const ButtonContainer = styled('div', {
  base: {
    position: 'relative',
    display: 'inline-block',
  },
});

const StyledButton = styled(Button, {
  base: {
    minWidth: '32px',
    height: '32px',
    padding: '4px',
    borderRadius: '6px',
  },
});

const IconContainer = styled('div', {
  base: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
    '& svg': {
      width: '12px',
      height: '12px',
    },
  },
  variants: {
    isSelected: {
      true: {
        transform: 'rotate(45deg)', // Shows as "X" when selected
      },
      false: {
        transform: 'rotate(0deg)', // Shows as "+" when not selected
      },
    },
  },
});

const AlertContainer = styled('div', {
  base: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    zIndex: 'tooltip',
    minWidth: '200px',
    animation: 'fadeIn 0.2s ease-out',
  },
});
