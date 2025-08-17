import { styled } from '@repo/styles/jsx';
import { memo, useEffect } from 'react';
import { Container } from '../../components/Container/Container.tsx';
import { HomeMeta } from '../../components/Meta/HomeMeta.tsx';
import { useAppSelector, useAppDispatch } from '../data/store/hooks.ts';
import { selectIsVaultListAvailable } from '../data/selectors/vaults-list.ts';
import { filteredVaultsActions } from '../data/reducers/filtered-vaults.ts';
import { Banners } from './components/Banners/Banners.tsx';
import { ChainButtonFilter } from './components/Filters/components/ChainFilters/ChainButtonFilter.tsx';
import { Loading } from './components/Loading/Loading.tsx';
import { Portfolio } from './components/Portfolio/Portfolio.tsx';
import { Vaults } from './components/Vaults/Vaults.tsx';

const HomePage = memo(function HomePage() {
  const isVaultListAvailable = useAppSelector(selectIsVaultListAvailable);
  const dispatch = useAppDispatch();

  // Set hardcoded filter values: All, Stablecoins, Single, Vaults
  useEffect(() => {
    if (isVaultListAvailable) {
      dispatch(filteredVaultsActions.setUserCategory('all')); // All
      dispatch(filteredVaultsActions.setVaultCategory(['stable'])); // Stablecoins
      dispatch(filteredVaultsActions.setAssetType(['single'])); // Single
      dispatch(filteredVaultsActions.setStrategyType('vaults')); // Vaults
    }
  }, [dispatch, isVaultListAvailable]);

  if (!isVaultListAvailable) {
    return (
      <>
        <HomeMeta />
        <Loading />
      </>
    );
  }

  return (
    <>
      <HomeMeta />
      <Header>
        <Container maxWidth="lg">
          <Banners />
          <Portfolio />
        </Container>
      </Header>
      <Content>
        <Container maxWidth="lg">
          <FiltersRow>
            <ChainButtonFilter />
          </FiltersRow>
        </Container>
        <Vaults />
      </Content>
    </>
  );
});

const Header = styled('div', {
  base: {
    backgroundColor: 'background.header',
  },
});

const Content = styled('div', {
  base: {
    paddingBlock: '20px',
    sm: {
      paddingBlock: '32px',
    },
  },
});

const FiltersRow = styled('div', {
  base: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    height: '40px',
    width: '100%',
    marginBottom: '12px',
  },
});

// eslint-disable-next-line no-restricted-syntax -- default export required for React.lazy()
export default HomePage;
