import LinksDropdown from './LinksDropdown';
import ThemeToggle from './ThemeToggle';
import UserProfileDropdown from './UserProfileDropdown';
import { MembershipRole } from '@prisma/client';

function Navbar({ role }: { role: MembershipRole }) {
  return (
    <nav className='bg-background/80 backdrop-blur-md border-b border-border/50 py-4 sm:px-12 px-6 flex items-center justify-between sticky top-0 z-50'>
      <div className='lg:hidden'>
        <LinksDropdown role={role} />
      </div>
      <div className='hidden lg:block'>
        <h2 className='text-sm font-medium text-muted-foreground'>Pannello di Controllo <span className='text-primary font-bold'>Aletheia</span></h2>
      </div>
      <div className='flex items-center gap-x-6'>
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </nav>
  );
}

export default Navbar;
