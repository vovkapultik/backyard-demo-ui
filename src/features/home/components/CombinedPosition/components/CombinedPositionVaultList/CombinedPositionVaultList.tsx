import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@repo/styles/jsx';
import { useAppDispatch, useAppSelector } from '../../../../../data/store/hooks.ts';
import { combinedPositionActions } from '../../../../../data/reducers/combined-position.ts';
import { selectCombinedPositionSelectedVaults } from '../../../../../data/selectors/combined-position.ts';
import { selectVaultById } from '../../../../../data/selectors/vaults.ts';
import { VaultIdentity } from '../../../../../../components/VaultIdentity/VaultIdentity.tsx';
import { TokenAmount } from '../../../../../../components/TokenAmount/TokenAmount.tsx';
import { BIG_ZERO } from '../../../../../../helpers/big-number.ts';
import type { VaultEntity } from '../../../../../data/entities/vault.ts';
import TrashIcon from '../../../../../../images/icons/mui/Clear.svg?react';

export const CombinedPositionVaultList = memo(function CombinedPositionVaultList() {
  const selectedVaults = useAppSelector(selectCombinedPositionSelectedVaults);

  return (
    <VaultList>
      {selectedVaults.map((vault, index) => (
        <CombinedPositionVaultItem key={vault.vaultId} vaultId={vault.vaultId} index={index} />
      ))}
    </VaultList>
  );
});

type CombinedPositionVaultItemProps = {
  vaultId: VaultEntity['id'];
  index: number;
};

const CombinedPositionVaultItem = memo(function CombinedPositionVaultItem({
  vaultId,
  index,
}: CombinedPositionVaultItemProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const vault = useAppSelector(state => selectVaultById(state, vaultId));
  const selectedVaults = useAppSelector(selectCombinedPositionSelectedVaults);
  const vaultData = selectedVaults.find(v => v.vaultId === vaultId);

  const handleRemove = useCallback(() => {
    dispatch(combinedPositionActions.removeVault(vaultId));
  }, [dispatch, vaultId]);

  const handleAllocationChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(100, Number(event.target.value)));
    dispatch(combinedPositionActions.setVaultAllocation({ vaultId, allocation: value }));
  }, [dispatch, vaultId]);

  if (!vaultData) {
    return null;
  }

  return (
    <VaultItem>
      <VaultInfo>
        <VaultIdentity vaultId={vaultId} />
        {vaultData.amount && vaultData.amount.gt(BIG_ZERO) && (
          <EstimatedAmount>
            <TokenAmount
              amount={vaultData.amount}
              decimals={18}
              symbol="TOKEN"
            />
          </EstimatedAmount>
        )}
      </VaultInfo>
      
      <VaultControls>
        <AllocationContainer>
          <AllocationInput
            type="number"
            min="0"
            max="100"
            step="1"
            value={vaultData.allocation}
            onChange={handleAllocationChange}
          />
          <AllocationLabel>%</AllocationLabel>
        </AllocationContainer>
        
        <RemoveButton onClick={handleRemove} title={t('CombinedPosition-RemoveVault')}>
          <TrashIcon />
        </RemoveButton>
      </VaultControls>
    </VaultItem>
  );
});

const VaultList = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
});

const VaultItem = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: 'background.content.dark',
    borderRadius: '8px',
    border: '2px solid transparent',
    transition: 'border-color 0.2s ease',
    '&:hover': {
      borderColor: 'primary.main',
    },
  },
});

const VaultInfo = styled('div', {
  base: {
    flex: 1,
    minWidth: 0,
  },
});

const EstimatedAmount = styled('div', {
  base: {
    marginTop: '8px',
    fontSize: '14px',
    color: 'text.middle',
  },
});

const VaultControls = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
});

const AllocationContainer = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    backgroundColor: 'background.content',
    borderRadius: '6px',
    border: '1px solid {colors.background.content.dark}',
  },
});

const AllocationInput = styled('input', {
  base: {
    background: 'none',
    border: 'none',
    color: 'text.light',
    fontSize: '14px',
    fontWeight: '500',
    width: '40px',
    textAlign: 'right',
    '&:focus': {
      outline: 'none',
    },
  },
});

const AllocationLabel = styled('span', {
  base: {
    fontSize: '14px',
    color: 'text.middle',
    fontWeight: '500',
  },
});

const RemoveButton = styled('button', {
  base: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
    '& svg': {
      width: '16px',
      height: '16px',
      fill: 'text.middle',
      transition: 'fill 0.2s ease',
    },
    '&:hover': {
      backgroundColor: 'error.main',
      '& svg': {
        fill: 'white',
      },
    },
  },
});
