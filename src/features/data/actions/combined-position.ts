import { createAppAsyncThunk } from '../utils/store-utils.ts';
import { selectCombinedPositionSelectedVaults, selectCombinedPositionSelectedToken, selectCombinedPositionChainId } from '../selectors/combined-position.ts';
import { combinedPositionActions } from '../reducers/combined-position.ts';
import { transactFetchOptions, transactInit, transactSwitchMode } from './transact.ts';
import { selectTokenAmountsTotalValue } from '../selectors/transact.ts';
import { selectTokenPriceByAddress } from '../selectors/tokens.ts';
import { selectWalletAddress } from '../selectors/wallet.ts';
import { fetchAllowanceAction } from './allowance.ts';
import { getTransactApi } from '../apis/instances.ts';
import { TransactMode } from '../reducers/wallet/transact-types.ts';
import { isDepositOption } from '../apis/transact/transact-types.ts';
import type { BeefyState } from '../store/types.ts';
import type { VaultEntity } from '../entities/vault.ts';
import type { InputTokenAmount } from '../apis/transact/transact-types.ts';
import type { CombinedPositionVaultQuote } from '../reducers/combined-position-types.ts';
import { BIG_ZERO } from '../../../helpers/big-number.ts';
import { uniqBy, groupBy } from 'lodash-es';
import { compareBigNumber } from '../../../helpers/big-number.ts';
import type { DepositOption } from '../apis/transact/transact-types.ts';
import type { TokenEntity } from '../entities/token.ts';
import { selectIsZapLoaded } from '../selectors/zap.ts';
import { selectAreFeesLoaded } from '../selectors/fees.ts';

export const fetchCombinedPositionQuotes = createAppAsyncThunk(
  'combinedPosition/fetchQuotes',
  async (_, { getState, dispatch }) => {
    console.log('🚀 fetchCombinedPositionQuotes STARTED');
    
    const state = getState();
    const selectedVaults = selectCombinedPositionSelectedVaults(state);
    const selectedToken = selectCombinedPositionSelectedToken(state);
    const chainId = selectCombinedPositionChainId(state);

    console.log('📊 Quote fetch data:', {
      selectedVaults: selectedVaults.length,
      selectedToken: selectedToken?.symbol,
      chainId,
      vaultAmounts: selectedVaults.map(v => ({ id: v.vaultId, amount: v.amount?.toString() }))
    });

    if (!selectedToken || !chainId || selectedVaults.length === 0) {
      console.log('❌ Missing required data for quote fetching');
      throw new Error('Missing required data for quote fetching');
    }

    // Set global status to pending
    console.log('⏳ Setting quotes status to pending');
    dispatch(combinedPositionActions.setQuotesStatus('pending'));

    const quotePromises: Promise<void>[] = [];

    // Fetch quotes for each vault with its allocated amount
    for (const vaultData of selectedVaults) {
      if (!vaultData.amount || vaultData.amount.lte(BIG_ZERO)) {
        continue; // Skip vaults with no amount
      }

      const quotePromise = fetchTokenToVaultQuote(
        selectedToken,
        vaultData.vaultId,
        vaultData.amount,
        dispatch,
        getState
      );
      quotePromises.push(quotePromise);
    }

    // Wait for all quotes to complete
    try {
      console.log('🔄 Waiting for all quotes to complete');
      await Promise.all(quotePromises);
      dispatch(combinedPositionActions.setQuotesStatus('fulfilled'));
      console.log('🔄 All quotes completed');
    } catch (error) {
      dispatch(combinedPositionActions.setQuotesError(error instanceof Error ? error.message : 'Failed to fetch quotes'));
    }
  }
);

async function fetchTokenToVaultQuote(
  sourceToken: TokenEntity,
  vaultId: VaultEntity['id'],
  sourceAmount: any,
  dispatch: any,
  getState: () => BeefyState
): Promise<void> {
  try {
    console.log(`🎯 fetchTokenToVaultQuote: ${sourceToken.symbol} -> Vault ${vaultId}, Amount: ${sourceAmount.toString()}`);
    
    // Set vault quote status to pending
    dispatch(combinedPositionActions.setVaultQuote({
      vaultId,
      quoteData: {
        allQuotes: [],
        inputAmount: sourceAmount,
        status: 'pending',
      }
    }));

    // Get vault entity to understand its deposit token
    const state = getState();
    const vault = state.entities.vaults.byId[vaultId];
    if (!vault) {
      throw new Error(`Vault ${vaultId} not found`);
    }

    console.log(`📊 Vault ${vaultId} accepts token: ${vault.depositTokenAddress} on chain ${vault.chainId}`);

    // Initialize transact for this vault to get deposit options
    dispatch(transactInit({ vaultId }));
    dispatch(transactSwitchMode(TransactMode.Deposit));

    // Wait for required data to be loaded
    const maxWaitMs = 7000;
    const pollEveryMs = 100;
    const start = Date.now();
    while (true) {
      const readyState = getState();
      if (selectIsZapLoaded(readyState) && selectAreFeesLoaded(readyState)) {
        break;
      }
      if (Date.now() - start > maxWaitMs) {
        console.warn(`⚠️ Timeout waiting for zap/fees data for vault ${vaultId}`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, pollEveryMs));
    }

    // Fetch all deposit options for this vault
    console.log(`🔄 Fetching deposit options for vault ${vaultId}`);
    const optionsResult = await dispatch(transactFetchOptions({ vaultId, mode: TransactMode.Deposit }));
    console.log(`✅ Options result for vault ${vaultId}:`, optionsResult);
    
    // Get the current state after options are loaded
    const updatedState = getState();
    
    // Get all available options from the state
    const allOptions = Object.values(updatedState.ui.transact.options.byOptionId);
    console.log(`🔍 All options in state:`, allOptions.length, allOptions.map(o => `${o.vaultId}-${o.mode}`));
    
    const vaultOptions = allOptions.filter(option => 
      option.vaultId === vaultId && option.mode === TransactMode.Deposit
    );
    console.log(`🎯 Vault options for ${vaultId}:`, vaultOptions.length, vaultOptions);

    if (vaultOptions.length === 0) {
      // More detailed error for debugging
      const errorMsg = `No deposit options available for vault ${vaultId} with token ${sourceToken.symbol} on chain ${sourceToken.chainId}. Check vault config and zap strategies.`;
      console.warn(errorMsg);
      
      dispatch(combinedPositionActions.setVaultQuote({
        vaultId,
        quoteData: {
          allQuotes: [],
          inputAmount: sourceAmount,
          status: 'rejected',
          error: errorMsg,
          options: [],
        }
      }));
      return;
    }

    // Filter to deposit options only and find routes from source token to vault
    const depositOptions = vaultOptions.filter(isDepositOption);
    console.log(`💰 Found ${depositOptions.length} deposit options for vault ${vaultId}`);
    
    // Look for options that can accept our source token directly OR through zap
    let compatibleOptions = depositOptions.filter(option => 
      option.inputs.some(input => 
        input.chainId === sourceToken.chainId && 
        input.address.toLowerCase() === sourceToken.address.toLowerCase()
      )
    );

    console.log(`🔍 Compatible options for ${sourceToken.symbol}:`, compatibleOptions.length);

    if (compatibleOptions.length === 0) {
      const errorMsg = `Token ${sourceToken.symbol} not supported for vault ${vaultId}. Available inputs: ${depositOptions.flatMap((o: DepositOption) => o.inputs.map((i: TokenEntity) => i.symbol)).join(', ')}`;
      console.warn(errorMsg);
      
      dispatch(combinedPositionActions.setVaultQuote({
        vaultId,
        quoteData: {
          allQuotes: [],
          inputAmount: sourceAmount,
          status: 'rejected',
          error: errorMsg,
          options: vaultOptions,
        }
      }));
      return;
    }

    // To add fallback: If no compatible options but depositOptions exist, try to use the first depositOption as fallback
    if (compatibleOptions.length === 0 && depositOptions.length > 0) {
      console.log(`Fallback: Using first available option for vault ${vaultId}`);
      compatibleOptions = [depositOptions[0]]; // Safe since depositOptions are DepositOption[]
    }

    // Build input token amount for this vault
    const inputTokenAmounts: InputTokenAmount[] = [{
      token: sourceToken,
      amount: sourceAmount,
      max: false,
    }];

    // Validate token and amount before proceeding
    if (!sourceToken.address || !sourceToken.chainId || sourceAmount.lte(BIG_ZERO)) {
      dispatch(combinedPositionActions.setVaultQuote({
        vaultId,
        quoteData: {
          allQuotes: [],
          inputAmount: sourceAmount,
          status: 'rejected',
          error: 'Invalid token or amount',
          options: compatibleOptions,
        }
      }));
      return;
    }

    // Fetch quotes using the same API as the vault deposit system  
    const api = await getTransactApi();
    let quotes;
    
    try {
      console.log('📡 CALLING API.fetchDepositQuotesFor with:', {
        optionsCount: compatibleOptions.length,
        inputAmounts: inputTokenAmounts.map(i => ({ symbol: i.token.symbol, amount: i.amount.toString() }))
      });
      quotes = await api.fetchDepositQuotesFor(compatibleOptions, inputTokenAmounts, getState);
      console.log('✅ API returned quotes:', quotes.length);
    } catch (error) {
      console.warn(`Quote fetch failed for vault ${vaultId}:`, error);
      dispatch(combinedPositionActions.setVaultQuote({
        vaultId,
        quoteData: {
          allQuotes: [],
          inputAmount: sourceAmount,
          status: 'rejected',
          error: error instanceof Error ? error.message : 'Quote fetch failed',
          options: compatibleOptions,
        }
      }));
      return;
    }

    if (quotes.length === 0) {
      dispatch(combinedPositionActions.setVaultQuote({
        vaultId,
        quoteData: {
          allQuotes: [],
          inputAmount: sourceAmount,
          status: 'rejected',
          error: 'No quotes available',
          options: compatibleOptions,
        }
      }));
      return;
    }

    // Sort quotes by output value (same as vault deposit system)
    const sortedQuotes = quotes.sort((a, b) => {
      const valueA = selectTokenAmountsTotalValue(state, a.outputs);
      const valueB = selectTokenAmountsTotalValue(state, b.outputs);
      return compareBigNumber(valueB, valueA);
    });

    const bestQuote = sortedQuotes[0];
    
    // Calculate expected output and USD value with validation
    let expectedOutput;
    if (bestQuote.outputs.length > 0) {
      const outputToken = bestQuote.outputs[0].token;
      const outputAmount = bestQuote.outputs[0].amount;
      
      // Validate output token before price lookup
      if (outputToken?.address && outputToken?.chainId) {
        const outputPrice = selectTokenPriceByAddress(state, outputToken.chainId, outputToken.address);
        
        expectedOutput = {
          amount: outputAmount,
          token: outputToken,
          usdValue: outputAmount.multipliedBy(outputPrice),
        };
      }
    }

    // Update allowances (same as vault deposit system) with validation
    const walletAddress = selectWalletAddress(state);
    if (walletAddress) {
      try {
        const validAllowances = quotes
          .map(quote => quote.allowances)
          .flat()
          .filter(allowance => 
            allowance?.token?.address && 
            allowance?.token?.chainId && 
            allowance?.spenderAddress
          );

        const uniqueAllowances = uniqBy(
          validAllowances,
          allowance =>
            `${allowance.token.chainId}-${allowance.spenderAddress}-${allowance.token.address}`
        );
        
        const allowancesPerChainSpender = groupBy(
          uniqueAllowances,
          allowance => `${allowance.token.chainId}-${allowance.spenderAddress}`
        );

        await Promise.all(
          Object.values(allowancesPerChainSpender).map(allowances =>
            dispatch(
              fetchAllowanceAction({
                chainId: allowances[0].token.chainId,
                spenderAddress: allowances[0].spenderAddress,
                tokens: allowances.map(allowance => allowance.token),
                walletAddress,
              })
            )
          )
        );
      } catch (error) {
        console.warn('Allowance update failed:', error);
        // Don't fail the entire quote process for allowance issues
      }
    }

    // Store the complete quote data
    const quoteData: CombinedPositionVaultQuote = {
      allQuotes: sortedQuotes,
      bestQuote: bestQuote,
      inputAmount: sourceAmount,
      expectedOutput,
      status: 'fulfilled',
      options: compatibleOptions,
    };

    dispatch(combinedPositionActions.setVaultQuote({
      vaultId,
      quoteData
    }));

  } catch (error) {
    dispatch(combinedPositionActions.setVaultQuote({
      vaultId,
      quoteData: {
        allQuotes: [],
        inputAmount: sourceAmount,
        status: 'rejected',
        error: error instanceof Error ? error.message : 'Failed to fetch quote',
      }
    }));
  }
}
