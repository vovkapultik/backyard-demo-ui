import { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@repo/styles/jsx';
import BigNumber from 'bignumber.js';
import { useAppDispatch, useAppSelector } from '../../../../../data/store/hooks.ts';
import { combinedPositionActions } from '../../../../../data/reducers/combined-position.ts';
import { selectCombinedPositionChainId, selectCombinedPositionTotalAmount, selectCombinedPositionSelectedToken } from '../../../../../data/selectors/combined-position.ts';
import { selectChainById } from '../../../../../data/selectors/chains.ts';
import { selectTokensByChainId, selectTokenPriceByAddress } from '../../../../../data/selectors/tokens.ts';
import { selectUserBalanceOfToken } from '../../../../../data/selectors/balance.ts';
import { Button } from '../../../../../../components/Button/Button.tsx';
import { TokenImage } from '../../../../../../components/TokenImage/TokenImage.tsx';
import { AmountInputWithSlider } from '../../../../../vault/components/Actions/Transact/AmountInputWithSlider/AmountInputWithSlider.tsx';
import { BIG_ZERO } from '../../../../../../helpers/big-number.ts';
import { formatTokenDisplayCondensed } from '../../../../../../helpers/format.ts';
import type { TokenEntity } from '../../../../../data/entities/token.ts';
import ChevronDownIcon from '../../../../../../images/icons/chevron-down.svg?react';
import { debounce } from 'lodash-es';
import { fetchCombinedPositionQuotes } from '../../../../../data/actions/combined-position.ts';

export const CombinedPositionAmountInput = memo(function CombinedPositionAmountInput() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedToken = useAppSelector(selectCombinedPositionSelectedToken);
  const totalAmount = useAppSelector(selectCombinedPositionTotalAmount);
  const chainId = useAppSelector(selectCombinedPositionChainId);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);

  // Get chain and tokens
  const chain = useAppSelector(state => chainId ? selectChainById(state, chainId) : null);
  const depositTokens = useAppSelector(state => 
    chainId ? Object.values(selectTokensByChainId(state, chainId).byAddress || {}) : []
  );
  
  // Get all token balances at once using a single selector
  const tokenBalances = useAppSelector(state => {
    const balances: Record<string, BigNumber> = {};
    for (const token of depositTokens) {
      balances[token.address] = selectUserBalanceOfToken(state, token.chainId, token.address);
    }
    return balances;
  });

  const balance = useAppSelector(state => 
    selectedToken ? selectUserBalanceOfToken(state, selectedToken.chainId, selectedToken.address) : BIG_ZERO
  );

  const tokenPrice = useAppSelector(state => 
    selectedToken ? selectTokenPriceByAddress(state, selectedToken.chainId, selectedToken.address) : BIG_ZERO
  );

  const handleTokenSelect = useCallback((token: TokenEntity) => {
    dispatch(combinedPositionActions.setTotalAmount({ amount: BIG_ZERO, token }));
    setIsTokenSelectorOpen(false);
  }, [dispatch]);

  // Debounced re-quote trigger on amount changes (mimics vault page behavior)
  const debouncedRequote = useMemo(
    () =>
      debounce(
        (hasToken: boolean, amt: BigNumber) => {
          if (hasToken && amt.gt(BIG_ZERO)) {
            dispatch(fetchCombinedPositionQuotes());
          }
        },
        250,
        { leading: false, trailing: true, maxWait: 1000 }
      ),
    [dispatch]
  );

  const handleAmountChange = useCallback((amount: BigNumber, isMax: boolean) => {
    if (selectedToken) {
      dispatch(combinedPositionActions.setTotalAmount({ amount, token: selectedToken }));
      debouncedRequote(true, amount);
    }
  }, [dispatch, selectedToken, debouncedRequote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedRequote.cancel();
    };
  }, [debouncedRequote]);

  if (!chainId) {
    return <div>No chain selected</div>;
  }
  
  if (depositTokens.length === 0) {
    return <div>Loading tokens...</div>;
  }

  return (
    <Container>
      <TokenSelectorRow>
        <TokenSelector onClick={() => setIsTokenSelectorOpen(!isTokenSelectorOpen)}>
          {selectedToken ? (
            <>
              <TokenImage chainId={selectedToken.chainId} address={selectedToken.address} size={24} />
              <TokenSymbol>{selectedToken.symbol}</TokenSymbol>
            </>
          ) : (
            <SelectTokenText>{t('Transact-SelectToken')}</SelectTokenText>
          )}
          <ChevronDownIcon />
        </TokenSelector>
      </TokenSelectorRow>

      {selectedToken ? (
        <AmountSection>
          <AmountInputWithSlider
            value={totalAmount}
            maxValue={balance}
            onChange={handleAmountChange}
            tokenDecimals={selectedToken.decimals}
            price={tokenPrice}
            ignoreForceSelection={true}
          />
          <BalanceRow>
            <BalanceLabel>Available:</BalanceLabel>
            <BalanceValue>
              {formatTokenDisplayCondensed(balance, selectedToken.decimals)} {selectedToken.symbol}
            </BalanceValue>
          </BalanceRow>
        </AmountSection>
      ) : (
        <PlaceholderText>Select a token to continue</PlaceholderText>
      )}

      {isTokenSelectorOpen && (
        <TokenDropdown>
          {depositTokens.map(token => (
            <TokenOption key={token.address} onClick={() => handleTokenSelect(token)}>
              <TokenImage chainId={token.chainId} address={token.address} size={20} />
              <TokenSymbol>{token.symbol}</TokenSymbol>
              <TokenBalance>
                {formatTokenDisplayCondensed(
                  tokenBalances[token.address] || BIG_ZERO,
                  token.decimals
                )}
              </TokenBalance>
            </TokenOption>
          ))}
        </TokenDropdown>
      )}
    </Container>
  );
});

const Container = styled('div', {
  base: {
    position: 'relative',
  },
});

const TokenSelectorRow = styled('div', {
  base: {
    marginBottom: '16px',
  },
});

const TokenSelector = styled('button', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'background.content.dark',
    border: '2px solid {colors.background.content.dark}',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    width: '100%',
    justifyContent: 'space-between',
    '&:hover': {
      borderColor: 'primary.main',
    },
    '& svg': {
      width: '16px',
      height: '16px',
      fill: 'text.middle',
    },
  },
});

const TokenSymbol = styled('span', {
  base: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'text.light',
  },
});

const SelectTokenText = styled('span', {
  base: {
    fontSize: '14px',
    color: 'text.middle',
  },
});

const TokenDropdown = styled('div', {
  base: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'background.content',
    border: '2px solid {colors.background.content.dark}',
    borderRadius: '8px',
    marginTop: '4px',
    maxHeight: '200px',
    overflowY: 'auto',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
});

const TokenOption = styled('div', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: 'background.content.dark',
    },
  },
});

const TokenBalance = styled('span', {
  base: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: 'text.middle',
  },
});

const PlaceholderText = styled('div', {
  base: {
    padding: '20px',
    textAlign: 'center',
    color: 'text.middle',
    fontSize: '14px',
  },
});

const AmountSection = styled('div', {
  base: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
});

const BalanceRow = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
  },
});

const BalanceLabel = styled('span', {
  base: {
    color: 'text.middle',
  },
});

const BalanceValue = styled('span', {
  base: {
    color: 'text.light',
    fontWeight: '500',
  },
});