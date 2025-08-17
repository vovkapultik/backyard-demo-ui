import { NavLinkItem } from '../NavItem/NavLinkItem.tsx';
import { memo } from 'react';
import VaultsIcon from '../../../../images/icons/navigation/vault.svg?react';
import DashboardIcon from '../../../../images/icons/navigation/dashboard.svg?react';

export const MainMenu = memo(function MainMenu() {
  return (
    <>
      <NavLinkItem title={'Header-Vaults'} url="/" Icon={VaultsIcon} />
      <NavLinkItem end={false} title={'Header-Dashboard'} url="/dashboard" Icon={DashboardIcon} />
    </>
  );
});
