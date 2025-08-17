import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@repo/styles/jsx';
import { Button } from '../../../../components/Button/Button.tsx';
import { useAppDispatch, useAppSelector } from '../../../data/store/hooks.ts';
import { combinedPositionActions } from '../../../data/reducers/combined-position.ts';
import {
  selectCombinedPositionSelectedVaults,
  selectCombinedPositionVaultCount,
  selectCombinedPositionChainId,
  selectCombinedPositionTotalAmount,
  selectCombinedPositionSelectedToken,
} from '../../../data/selectors/combined-position.ts';
import { CombinedPositionVaultList } from './components/CombinedPositionVaultList/CombinedPositionVaultList.tsx';
import { CombinedPositionAmountInput } from './components/CombinedPositionAmountInput/CombinedPositionAmountInput.tsx';
import { CombinedPositionActions } from './components/CombinedPositionActions/CombinedPositionActions.tsx';

export const CombinedPositionPanel = memo(function CombinedPositionPanel() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedVaults = useAppSelector(selectCombinedPositionSelectedVaults);
  const vaultCount = useAppSelector(selectCombinedPositionVaultCount);
  const chainId = useAppSelector(selectCombinedPositionChainId);
  const totalAmount = useAppSelector(selectCombinedPositionTotalAmount);
  const selectedToken = useAppSelector(selectCombinedPositionSelectedToken);

  const handleClear = useCallback(() => {
    dispatch(combinedPositionActions.reset());
  }, [dispatch]);

  return (
    <PanelContainer>
      <Header>
        <Title>{t('CombinedPosition-Title')}</Title>
        <HeaderActions>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            {t('CombinedPosition-Clear')}
          </Button>
        </HeaderActions>
      </Header>

      <Content>
        <Section>
          <SectionTitle>{t('CombinedPosition-SelectedVaults')} ({vaultCount}/3)</SectionTitle>
          {selectedVaults.length === 0 ? (
            <EmptyState>
              <EmptyMessage>{t('CombinedPosition-NoVaults')}</EmptyMessage>
              <EmptyDescription>{t('CombinedPosition-AddVaultMessage')}</EmptyDescription>
            </EmptyState>
          ) : (
            <CombinedPositionVaultList />
          )}
        </Section>

        {selectedVaults.length > 0 && (
          <>
            <Section>
              <SectionTitle>{t('CombinedPosition-SelectAmount')}</SectionTitle>
              <CombinedPositionAmountInput />
            </Section>

            <Section>
              <CombinedPositionActions />
            </Section>
          </>
        )}
      </Content>
    </PanelContainer>
  );
});

const PanelContainer = styled('div', {
  base: {
    height: '100vh',
    width: '100%',
    backgroundColor: 'background.content',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
});

const Header = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '2px solid {colors.background.content.dark}',
    backgroundColor: 'background.header',
    flexShrink: 0,
  },
});

const Title = styled('h2', {
  base: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'text.light',
  },
});

const HeaderActions = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
});

const Content = styled('div', {
  base: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
});

const Section = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
});

const SectionTitle = styled('h3', {
  base: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'text.light',
  },
});

const EmptyState = styled('div', {
  base: {
    textAlign: 'center',
    padding: '48px 24px',
    color: 'text.middle',
  },
});

const EmptyMessage = styled('p', {
  base: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '500',
  },
});

const EmptyDescription = styled('p', {
  base: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.4',
  },
});
