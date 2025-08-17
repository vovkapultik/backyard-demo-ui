import { styled } from '@repo/styles/jsx';
import { memo } from 'react';
import { Container } from '../../components/Container/Container.tsx';
import { HomeMeta } from '../../components/Meta/HomeMeta.tsx';
import { useAppSelector } from '../data/store/hooks.ts';
import { selectIsVaultListAvailable } from '../data/selectors/vaults-list.ts';
import { Banners } from './components/Banners/Banners.tsx';
import { CombinedPositionPanel } from './components/CombinedPosition/CombinedPositionPanel.tsx';
import { Filters } from './components/Filters/Filters.tsx';
import { Loading } from './components/Loading/Loading.tsx';
import { Portfolio } from './components/Portfolio/Portfolio.tsx';
import { Vaults } from './components/Vaults/Vaults.tsx';

const HomePage = memo(function HomePage() {
  const isVaultListAvailable = useAppSelector(selectIsVaultListAvailable);

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
      <PageLayout>
        <MainContent>
          <Header>
            <Container maxWidth="lg">
              <Banners />
              <Portfolio />
            </Container>
          </Header>
          <Content>
            <Container maxWidth="lg">
              <Filters />
            </Container>
            <Vaults />
          </Content>
        </MainContent>
        <SidebarContainer>
          <CombinedPositionPanel />
        </SidebarContainer>
      </PageLayout>
    </>
  );
});

const PageLayout = styled('div', {
  base: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative',
  },
});

const MainContent = styled('div', {
  base: {
    width: '100vw',
    minHeight: '100vh',
  },
});

const SidebarContainer = styled('div', {
  base: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '400px',
    height: '100vh',
    borderLeft: '2px solid {colors.background.content.dark}',
    backgroundColor: 'background.content',
    zIndex: 'modal',
    boxShadow: 'lg',
  },
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

// eslint-disable-next-line no-restricted-syntax -- default export required for React.lazy()
export default HomePage;
