import { memo } from 'react';
import { styled } from '@repo/styles/jsx';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../../../data/store/hooks.ts';
import { selectCombinedPositionSelectedVaults, selectCombinedPositionSelectedToken, selectCombinedPositionTotalAmount, selectCombinedPositionQuotesStatus } from '../../../../../data/selectors/combined-position.ts';
import { selectTokenPriceByAddress } from '../../../../../data/selectors/tokens.ts';
import { selectUserBalanceOfToken } from '../../../../../data/selectors/balance.ts';
import { fetchCombinedPositionQuotes } from '../../../../../data/actions/combined-position.ts';
import { combinedPositionActions } from '../../../../../data/reducers/combined-position.ts';
import type { CombinedPositionVault } from '../../../../../data/reducers/combined-position-types.ts';
import { VaultIdentity } from '../../../../../../components/VaultIdentity/VaultIdentity.tsx';
import { Button } from '../../../../../../components/Button/Button.tsx';
import { BIG_ZERO } from '../../../../../../helpers/big-number.ts';
import { formatTokenDisplayCondensed } from '../../../../../../helpers/format.ts';
import { TokenAmountFromEntity } from '../../../../../../components/TokenAmount/TokenAmount.tsx';
import { ListJoin } from '../../../../../../components/ListJoin.tsx';
import { selectZapSwapProviderName } from '../../../../../data/selectors/zap.ts';
import { selectVaultById } from '../../../../../data/selectors/vaults.ts';
import { selectFeesByVaultId } from '../../../../../data/selectors/fees.ts';


export const CombinedPositionVaultList = memo(function CombinedPositionVaultList() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedVaults = useAppSelector(selectCombinedPositionSelectedVaults);
  const selectedToken = useAppSelector(selectCombinedPositionSelectedToken);
  const totalAmount = useAppSelector(selectCombinedPositionTotalAmount);
  const quotesStatus = useAppSelector(selectCombinedPositionQuotesStatus);

  // Quote fetching is now handled by the amount input component (debounced on amount changes)

  if (selectedVaults.length === 0) {
    return (
      <EmptyState>
        <EmptyText>{t('CombinedPosition-EmptyText')}</EmptyText>
      </EmptyState>
    );
  }

  return (
    <VaultListContainer>
      {quotesStatus === 'pending' && (
        <LoadingText>{t('CombinedPosition-LoadingQuotes')}</LoadingText>
      )}
      
      {selectedVaults.map(vaultData => (
        <VaultItem key={vaultData.vaultId} vaultData={vaultData} />
      ))}
    </VaultListContainer>
  );
});

type VaultItemProps = {
  vaultData: CombinedPositionVault;
};

const VaultItem = memo(function VaultItem({ vaultData }: VaultItemProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedToken = useAppSelector(selectCombinedPositionSelectedToken);
  const selectedVaults = useAppSelector(selectCombinedPositionSelectedVaults);
  const vault = useAppSelector(state => selectVaultById(state, vaultData.vaultId));
  const fees = useAppSelector(state => selectFeesByVaultId(state, vaultData.vaultId));
  
  const tokenPrice = useAppSelector(state => 
    selectedToken ? selectTokenPriceByAddress(state, selectedToken.chainId, selectedToken.address) : BIG_ZERO
  );
  
  const userBalance = useAppSelector(state => 
    selectedToken ? selectUserBalanceOfToken(state, selectedToken.chainId, selectedToken.address) : BIG_ZERO
  );

  // Add defensive check for vaultId
  if (!vaultData?.vaultId) {
    console.error('VaultItem: vaultData.vaultId is undefined', vaultData);
    return null;
  }

  const handleRemove = () => {
    dispatch(combinedPositionActions.removeVault(vaultData.vaultId));
  };

  const handleAllocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newAllocation = Math.max(0, Math.min(100, Number(event.target.value)));
    dispatch(combinedPositionActions.updateAllocation({
      vaultId: vaultData.vaultId,
      allocation: newAllocation
    }));
  };

  const usdValue = vaultData.amount && selectedToken ? 
    vaultData.amount.multipliedBy(tokenPrice) : BIG_ZERO;
  
  // Only show the full quote display for single vault
  const isSingleVault = selectedVaults.length === 1;
  const quote = vaultData.quote;
  const bestQuote = quote?.bestQuote;

  // Pre-compute output token USD prices and enriched outputs with USD values
  const outputTokenPrices = useAppSelector(state => {
    if (!bestQuote) return [] as any[];
    return bestQuote.outputs.map(output =>
      selectTokenPriceByAddress(state, output.token.chainId, output.token.address)
    );
  });

  const outputsWithUsd = bestQuote
    ? bestQuote.outputs.map((output, i) => ({
        ...output,
        usdValue: output.amount.multipliedBy(outputTokenPrices[i] || BIG_ZERO),
      }))
    : [];

  // Pre-compute provider names
  const routeProviderName = useAppSelector(state => {
    if (!bestQuote) return 'Beefy';
    const swapStep = bestQuote.steps?.find(step => step.type === 'swap');
    if (swapStep && 'providerId' in swapStep) {
      return selectZapSwapProviderName(state, swapStep.providerId, swapStep.via, t);
    }
    return 'Beefy';
  });

  const stepProviderNames = useAppSelector(state => {
    if (!bestQuote) return [] as (string | undefined)[];
    return (bestQuote.steps || []).map(step => {
      if (step.type === 'swap' && 'providerId' in step) {
        return selectZapSwapProviderName(state, step.providerId, step.via, t);
      }
      return undefined;
    });
  });

  return (
    <VaultItemContainer>
      <VaultInfo>
        <VaultIdentity vaultId={vaultData.vaultId} />
        <RemoveButton onClick={handleRemove} variant="text">
          ×
        </RemoveButton>
      </VaultInfo>
      
      <AllocationSection>
        <AllocationInput>
          <AllocationLabel>{t('CombinedPosition-Allocation')}:</AllocationLabel>
          <AllocationInputField
            type="number"
            min="0"
            max="100"
            value={vaultData.allocation}
            onChange={handleAllocationChange}
          />
          <AllocationPercent>%</AllocationPercent>
        </AllocationInput>
        
        {vaultData.amount && vaultData.amount.gt(BIG_ZERO) && selectedToken && (
          <AmountInfo>
            <AmountRow>
              <AmountLabel>{t('CombinedPosition-InputAmount')}:</AmountLabel>
              <AmountValue>
                {formatTokenDisplayCondensed(vaultData.amount, selectedToken.decimals)} {selectedToken.symbol}
              </AmountValue>
            </AmountRow>
            {usdValue.gt(BIG_ZERO) && (
              <UsdRow>
                <UsdLabel>Input USD:</UsdLabel>
                <UsdValue>${formatTokenDisplayCondensed(usdValue, 2)}</UsdValue>
              </UsdRow>
            )}
            
            {/* Expected Output Information */}
            {vaultData.quote?.expectedOutput && (
              <>
                <AmountRow>
                  <AmountLabel>{t('CombinedPosition-ExpectedOutput')}:</AmountLabel>
                  <AmountValue>
                    {formatTokenDisplayCondensed(vaultData.quote.expectedOutput.amount, vaultData.quote.expectedOutput.token.decimals)} {vaultData.quote.expectedOutput.token.symbol}
                  </AmountValue>
                </AmountRow>
                {vaultData.quote.expectedOutput.usdValue.gt(BIG_ZERO) && (
                  <UsdRow>
                    <UsdLabel>Output USD:</UsdLabel>
                    <UsdValue>${formatTokenDisplayCondensed(vaultData.quote.expectedOutput.usdValue, 2)}</UsdValue>
                  </UsdRow>
                )}
              </>
            )}
          </AmountInfo>
        )}
      </AllocationSection>

      {vaultData.quote?.status === 'pending' && (
        <QuoteStatus>
          <LoadingDot />
          <QuoteText>{t('CombinedPosition-FetchingQuote')}</QuoteText>
        </QuoteStatus>
      )}
      
      {vaultData.quote?.status === 'rejected' && vaultData.quote.error && (
        <QuoteStatus>
          <ErrorText>{vaultData.quote.error}</ErrorText>
        </QuoteStatus>
      )}
      
      {/* Compact quote status for multi-vault (when not showing full display) */}
      {vaultData.quote?.status === 'fulfilled' && vaultData.quote.bestQuote && selectedVaults.length > 1 && (
        <QuoteStatus>
          <SuccessText>
            Route found via {routeProviderName} • {vaultData.quote.allQuotes.length} option{vaultData.quote.allQuotes.length !== 1 ? 's' : ''}
          </SuccessText>
        </QuoteStatus>
      )}

      {/* DETAILED QUOTE DISPLAY - SHOW FOR ALL VAULTS WITH INDIVIDUAL ROUTES */}
      {quote?.status === 'fulfilled' && bestQuote && selectedToken && (
        <FullQuoteDisplay>
          <SectionTitle>{vault.name} - {vaultData.allocation}% Allocation</SectionTitle>
          <AvailableBalance>
            Your portion: {formatTokenDisplayCondensed(vaultData.amount || BIG_ZERO, selectedToken.decimals)} {selectedToken.symbol} 
            (${formatTokenDisplayCondensed(usdValue, 2)})
          </AvailableBalance>

          <SectionTitle>You deposit</SectionTitle>
          {outputsWithUsd.map((output, index) => (
            <div key={index}>
              <DepositAmount>
                {formatTokenDisplayCondensed(output.amount, output.token.decimals)}
              </DepositAmount>
              <UsdAmount>
                ~${formatTokenDisplayCondensed(output.usdValue, 2)}
              </UsdAmount>
              <TokenSymbol>{output.token.symbol}</TokenSymbol>
            </div>
          ))}

          <SectionTitle>Route for this vault</SectionTitle>
          <RouteProvider>
            {routeProviderName}
          </RouteProvider>

          {bestQuote.steps?.map((step, index) => (
            <RouteStep key={index}>
              {index + 1}. {(() => {
                if (step.type === 'swap' && 'fromToken' in step && 'toToken' in step) {
                  return `Swap ${formatTokenDisplayCondensed(step.fromAmount, step.fromToken.decimals)} ${step.fromToken.symbol} for ${formatTokenDisplayCondensed(step.toAmount, step.toToken.decimals)} ${step.toToken.symbol} via ${stepProviderNames[index] || 'aggregator'}`;
                } else if (step.type === 'deposit' && 'inputs' in step) {
                  const input = step.inputs[0];
                  return `Deposit estimated ${formatTokenDisplayCondensed(input.amount, input.token.decimals)} ${input.token.symbol}`;
                }
                return step.type;
              })()}
            </RouteStep>
          ))}

          <FeeRow>
            <FeeLabel>Deposit fee</FeeLabel>
            <FeeValue>{fees?.deposit ? `${(fees.deposit * 100).toFixed(2)}%` : '0%'}</FeeValue>
          </FeeRow>
          <FeeRow>
            <FeeLabel>Withdrawal fee</FeeLabel>
            <FeeValue>{fees?.withdraw ? `${(fees.withdraw * 100).toFixed(2)}%` : '0%'}</FeeValue>
          </FeeRow>
          <FeeRow>
            <FeeLabel>Zap fee</FeeLabel>
            <FeeValue>{bestQuote.fee ? `${(bestQuote.fee.value * 100).toFixed(2)}%` : '0.05%'}</FeeValue>
          </FeeRow>
          <FeeNote>
            The displayed APY accounts for performance fee that is deducted from the generated yield only
          </FeeNote>
        </FullQuoteDisplay>
      )}
    </VaultItemContainer>
  );
});

// Styled Components
const VaultListContainer = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
});

const VaultListHeader = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
});

const HeaderTitle = styled('h3', {
  base: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'text.light',
    margin: 0,
  },
});

const LoadingText = styled('span', {
  base: {
    fontSize: '12px',
    color: 'text.middle',
  },
});

const EmptyState = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
});

const EmptyText = styled('p', {
  base: {
    color: 'text.middle',
    fontSize: '14px',
    margin: 0,
  },
});

const VaultItemContainer = styled('div', {
  base: {
    border: '1px solid {colors.border}',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: 'background.content.dark',
  },
});

const VaultInfo = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
});

const RemoveButton = styled(Button, {
  base: {
    padding: '0',
    fontSize: '20px',
    lineHeight: '1',
    fontWeight: 'bold',
    color: 'text.middle',
    minWidth: 'auto',
    height: 'auto',
    alignSelf: 'flex-start',
    marginTop: '2px',
    '&:hover': {
      color: 'text.light',
    },
  },
});

const AllocationSection = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
});

const AllocationInput = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
});

const AllocationLabel = styled('span', {
  base: {
    fontSize: '12px',
    color: 'text.middle',
  },
});

const AllocationInputField = styled('input', {
  base: {
    width: '60px',
    padding: '4px 8px',
    border: '1px solid {colors.border}',
    borderRadius: '4px',
    backgroundColor: 'background.content',
    color: 'text.light',
    fontSize: '12px',
    textAlign: 'center',
  },
});

const AllocationPercent = styled('span', {
  base: {
    fontSize: '12px',
    color: 'text.middle',
  },
});

const AmountInfo = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '8px',
  },
});

const AmountRow = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

const AmountLabel = styled('span', {
  base: {
    fontSize: '12px',
    color: 'text.middle',
  },
});

const AmountValue = styled('span', {
  base: {
    fontSize: '12px',
    color: 'text.light',
    fontWeight: '500',
  },
});

const UsdRow = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

const UsdLabel = styled('span', {
  base: {
    fontSize: '11px',
    color: 'text.middle',
  },
});

const UsdValue = styled('span', {
  base: {
    fontSize: '11px',
    color: 'text.light',
    fontWeight: '600',
  },
});

const QuoteStatus = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
    padding: '6px',
    borderRadius: '4px',
    backgroundColor: 'background.content',
  },
});

const LoadingDot = styled('div', {
  base: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'text.middle',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
});

const QuoteText = styled('span', {
  base: {
    fontSize: '11px',
    color: 'text.middle',
  },
});

const ErrorText = styled('span', {
  base: {
    fontSize: '11px',
    color: 'text.error',
  },
});

const SuccessText = styled('span', {
  base: {
    fontSize: '11px',
    color: 'text.success',
  },
});

// New styled components for full quote display
const FullQuoteDisplay = styled('div', {
  base: {
    marginTop: '16px',
    padding: '16px',
    border: '1px solid {colors.border}',
    borderRadius: '8px',
    backgroundColor: 'background.content',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
});

const SectionTitle = styled('h4', {
  base: {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 8px',
    color: 'text.light',
  },
});

const AvailableBalance = styled('span', {
  base: { 
    fontSize: '12px', 
    color: 'text.middle',
    marginBottom: '4px',
  },
});

const InputAmount = styled('span', {
  base: { 
    fontSize: '18px', 
    fontWeight: '600',
    color: 'text.light',
  },
});

const UsdAmount = styled('span', {
  base: { 
    fontSize: '14px', 
    color: 'text.middle',
    fontWeight: '500',
  },
});

const DepositAmount = styled('span', {
  base: { 
    fontSize: '18px', 
    fontWeight: '600',
    color: 'text.light',
  },
});

const TokenSymbol = styled('span', {
  base: { 
    fontSize: '14px', 
    fontWeight: '600',
    color: 'text.light',
    marginTop: '4px',
  },
});

const RouteProvider = styled('div', {
  base: { 
    fontSize: '14px', 
    fontWeight: '600',
    color: 'text.light',
    marginBottom: '8px',
  },
});

const RouteStep = styled('div', {
  base: { 
    fontSize: '12px', 
    color: 'text.middle',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
});

const FeeRow = styled('div', {
  base: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    fontSize: '12px',
    marginTop: '4px',
  },
});

const FeeLabel = styled('span', {
  base: { color: 'text.middle' },
});

const FeeValue = styled('span', {
  base: { 
    fontWeight: '500',
    color: 'text.light',
  },
});

const FeeNote = styled('p', {
  base: { 
    fontSize: '11px', 
    color: 'text.middle', 
    fontStyle: 'italic', 
    marginTop: '8px',
    margin: '8px 0 0',
    lineHeight: '1.3',
  },
});