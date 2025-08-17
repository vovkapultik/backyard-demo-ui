import { css } from '@repo/styles/css';

export const styles = {
  vault: css.raw({
    display: 'block',
    position: 'relative',
    color: 'text.dark',
    background: 'background.vaults.standard',
    padding: '24px',
    textDecoration: 'none',
    minHeight: '100px',
  }),
  vaultWithButton: css.raw({
    display: 'flex',
    alignItems: 'stretch',
    gap: '16px',
    padding: '24px 16px 24px 24px',
  }),
  vaultLink: css.raw({
    display: 'block',
    flex: '1',
    textDecoration: 'none',
    color: 'inherit',
  }),
  vaultActions: css.raw({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  vaultEarnings: css.raw({
    backgroundColor: 'background.vaults.gov',
  }),
  vaultCowcentrated: css.raw({
    backgroundColor: 'background.vaults.clm',
  }),
  vaultCowcentratedPool: css.raw({
    backgroundColor: 'background.vaults.clm.pool',
  }),
  vaultCowcentratedVault: css.raw({
    backgroundColor: 'background.vaults.clm.vault',
  }),
  vaultRetired: css.raw({
    backgroundColor: 'background.vaults.inactive',
  }),
  vaultInner: css.raw({
    display: 'grid',
    gridTemplateColumns: '1fr',
    columnGap: '24px',
    rowGap: '24px',
    width: '100%',
    lg: {
      gridTemplateColumns: 'minmax(0, 40fr) minmax(0, 60fr)',
    },
  }),
};
