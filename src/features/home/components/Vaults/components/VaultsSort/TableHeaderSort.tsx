import { styled } from '@repo/styles/jsx';
import { memo, useCallback } from 'react';
import { SortColumnHeader } from '../../../../../../components/SortColumnHeader/SortColumnHeader.tsx';

import { useAppDispatch, useAppSelector } from '../../../../../data/store/hooks.ts';
import type {
  FilteredVaultsState,
  SortType,
} from '../../../../../data/reducers/filtered-vaults-types.ts';
import { filteredVaultsActions } from '../../../../../data/reducers/filtered-vaults.ts';
import {
  selectFilterSearchSortDirection,
  selectFilterSearchSortField,
} from '../../../../../data/selectors/filtered-vaults.ts';

type SortColumn = {
  label: string;
  value: SortType;
};

const SORT_COLUMNS = [
  { label: 'Filter-SortWallet', value: 'walletValue' },
  { label: 'Filter-SortDeposited', value: 'depositValue' },
  { label: 'Filter-SortApy', value: 'apy' },
  { label: 'Filter-SortDaily', value: 'daily' },
  { label: 'Filter-SortTvl', value: 'tvl' },
  { label: 'Filter-SortSafety', value: 'safetyScore' },
] satisfies SortColumn[];

export const TableHeaderSort = memo(function TableHeaderSort() {
  const dispatch = useAppDispatch();
  const sortField = useAppSelector(selectFilterSearchSortField);
  const sortDirection = useAppSelector(selectFilterSearchSortDirection);

  const handleSort = useCallback(
    (field: FilteredVaultsState['sort']) => {
      if (field === sortField) {
        dispatch(filteredVaultsActions.setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'));
      } else {
        dispatch(filteredVaultsActions.setSortFieldAndDirection({ field, direction: 'desc' }));
      }
    },
    [dispatch, sortField, sortDirection]
  );

  return (
    <HeaderRow>
      {SORT_COLUMNS.map(({ label, value }) => (
        <SortColumnHeader
          key={value}
          label={label}
          sortKey={value}
          sorted={sortField === value ? sortDirection : 'none'}
          onChange={handleSort}
        />
      ))}
      <ActionHeader />
    </HeaderRow>
  );
});

const HeaderRow = styled('div', {
  base: {
    display: 'grid',
    width: '100%',
    columnGap: '24px',
    gridTemplateColumns: 'minmax(0, 1fr)',
    md: {
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) auto',
    },
    lg: {
      gridTemplateColumns: 'repeat(6, minmax(0, 1fr)) auto',
    },
  },
});

const ActionHeader = memo(function ActionHeader() {
  return (
    <ActionHeaderContainer>
      ACTION
    </ActionHeaderContainer>
  );
});

const ActionHeaderContainer = styled('div', {
  base: {
    textStyle: 'subline.sm',
    color: 'text.dark',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    textAlign: 'right',
    paddingLeft: '16px',
    paddingRight: '8px',
    height: '100%',
  },
});
