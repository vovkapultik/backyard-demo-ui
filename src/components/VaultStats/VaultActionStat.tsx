import { memo } from 'react';
import type { VaultEntity } from '../../features/data/entities/vault.ts';
import { VaultValueStat, type VaultValueStatProps } from '../VaultValueStat/VaultValueStat.tsx';
import { AddToCombinedPositionButton } from '../../features/home/components/Vault/components/AddToCombinedPositionButton/AddToCombinedPositionButton.tsx';

export type VaultActionStatProps = {
  vaultId: VaultEntity['id'];
} & Omit<VaultValueStatProps, 'label' | 'value'>;

export const VaultActionStat = memo(function VaultActionStat({ vaultId, ...passthrough }: VaultActionStatProps) {
  return (
    <VaultValueStat
      label="Action"
      value={<AddToCombinedPositionButton vaultId={vaultId} />}
      hideLabel={true}
      {...passthrough}
    />
  );
});
