import LinksDropdown from './LinksDropdown';
import ThemeToggle from './ThemeToggle';
import UserProfileDropdown from './UserProfileDropdown';
import { MembershipRole } from '@prisma/client';

function Navbar({ role }: { role: MembershipRole }) {
  return (
    <nav className='bg-background/60 backdrop-blur-xl border-b border-border/30 py-3 sm:px-12 px-6 flex items-center justify-between sticky top-0 z-50'>
      <div className='lg:hidden'>
        <LinksDropdown role={role} />
      </div>
      <div className='hidden lg:flex items-center gap-2'>
        <div className='w-1.5 h-1.5 rounded-full bg-primary animate-pulse' />
        <h2 className='text-sm font-medium text-muted-foreground'>Pannello di Controllo <span className='text-primary font-bold'>Aletheia</span></h2>
      </div>
      <div className='flex items-center gap-3'>
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </nav>
  );
}

export default Navbar;
