import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '@repo/styles/jsx';
import BigNumber from 'bignumber.js';
import { useAppDispatch, useAppSelector } from '../../../../../data/store/hooks.ts';
import { combinedPositionActions } from '../../../../../data/reducers/combined-position.ts';
import { selectCombinedPositionChainId, selectCombinedPositionTotalAmount, selectCombinedPositionSelectedToken } from '../../../../../data/selectors/combined-position.ts';
import { selectChainById } from '../../../../../data/selectors/chains.ts';
import { selectTokensByChainId } from '../../../../../data/selectors/tokens.ts';
import { selectUserBalanceOfToken } from '../../../../../data/selectors/balance.ts';
import { Button } from '../../../../../../components/Button/Button.tsx';
import { TokenImage } from '../../../../../../components/TokenImage/TokenImage.tsx';
import { BIG_ZERO } from '../../../../../../helpers/big-number.ts';
import { formatTokenDisplayCondensed } from '../../../../../../helpers/format.ts';
import type { TokenEntity } from '../../../../../data/entities/token.ts';
import ChevronDownIcon from '../../../../../../images/icons/chevron-down.svg?react';

export const CombinedPositionAmountInput = memo(function CombinedPositionAmountInput() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const chainId = useAppSelector(selectCombinedPositionChainId);
  const totalAmount = useAppSelector(selectCombinedPositionTotalAmount);
  const selectedToken = useAppSelector(selectCombinedPositionSelectedToken);
  const chain = useAppSelector(state => chainId ? selectChainById(state, chainId) : null);
  const tokens = useAppSelector(state => {
    if (!chainId) return [];
    try {
      const tokensData = selectTokensByChainId(state, chainId);
      return tokensData ? Object.values(tokensData.byAddress || {}) : [];
    } catch (error) {
      console.warn('Failed to get tokens for chain:', chainId, error);
      return [];
    }
  });
  const balance = useAppSelector(state => 
    selectedToken ? selectUserBalanceOfToken(state, selectedToken.chainId, selectedToken.address) : BIG_ZERO
  );
  
  // Get balances for all tokens upfront
  const tokenBalances = useAppSelector(state => {
    if (!tokens || tokens.length === 0) {
      return {};
    }
    return tokens.reduce((acc, token) => {
      acc[token.address] = selectUserBalanceOfToken(state, token.chainId, token.address);
      return acc;
    }, {} as Record<string, BigNumber>);
  });

  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [amountInput, setAmountInput] = useState(totalAmount.toString());

  const handleTokenSelect = useCallback((token: TokenEntity) => {
    const amount = new BigNumber(amountInput || '0');
    dispatch(combinedPositionActions.setTotalAmount({ amount, token }));
    setIsTokenSelectorOpen(false);
  }, [dispatch, amountInput]);

  const handleAmountChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAmountInput(value);
    
    if (selectedToken) {
      const amount = new BigNumber(value || '0');
      dispatch(combinedPositionActions.setTotalAmount({ amount, token: selectedToken }));
    }
  }, [dispatch, selectedToken]);

  const handleMaxClick = useCallback(() => {
    if (selectedToken) {
      const maxAmount = balance;
      setAmountInput(maxAmount.toString());
      dispatch(combinedPositionActions.setTotalAmount({ amount: maxAmount, token: selectedToken }));
    }
  }, [dispatch, selectedToken, balance]);

  if (!chainId || !chain) {
    return null;
  }

  // Filter tokens to commonly used ones for deposits
  const depositTokens = tokens.filter(token => 
    token.type === 'native' || 
    ['USDC', 'USDT', 'DAI', 'BUSD', 'WETH', 'WBTC'].includes(token.symbol)
  ).slice(0, 10); // Limit to first 10 tokens

  return (
    <Container>
      <InputRow>
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

        <AmountInputContainer>
          <AmountInput
            type="number"
            placeholder="0.0"
            value={amountInput}
            onChange={handleAmountChange}
            disabled={!selectedToken}
          />
          {selectedToken && (
            <MaxButton onClick={handleMaxClick}>
              {t('Transact-Max')}
            </MaxButton>
          )}
        </AmountInputContainer>
      </InputRow>

      {selectedToken && (
        <BalanceRow>
          <BalanceLabel>{t('Transact-Available')}:</BalanceLabel>
          <BalanceValue>
            {formatTokenDisplayCondensed(balance, selectedToken.decimals)} {selectedToken.symbol}
          </BalanceValue>
        </BalanceRow>
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

const InputRow = styled('div', {
  base: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
});

const TokenSelector = styled('button', {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'background.content.dark',
    border: '2px solid {colors.background.content.dark}',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    minWidth: '120px',
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

const AmountInputContainer = styled('div', {
  base: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'background.content.dark',
    border: '2px solid {colors.background.content.dark}',
    borderRadius: '8px',
    '&:focus-within': {
      borderColor: 'primary.main',
    },
  },
});

const AmountInput = styled('input', {
  base: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: 'text.light',
    fontSize: '16px',
    fontWeight: '500',
    '&:focus': {
      outline: 'none',
    },
    '&::placeholder': {
      color: 'text.middle',
    },
    '&:disabled': {
      color: 'text.middle',
      cursor: 'not-allowed',
    },
  },
});

const MaxButton = styled(Button, {
  base: {
    padding: '4px 8px',
    fontSize: '12px',
    minHeight: 'auto',
  },
});

const BalanceRow = styled('div', {
  base: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    fontSize: '14px',
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
