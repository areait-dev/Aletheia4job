import LinksDropdown from './LinksDropdown';
import ThemeToggle from './ThemeToggle';
import UserProfileDropdown from './UserProfileDropdown';
import { MembershipRole } from '@prisma/client';

function Navbar({ role }: { role: MembershipRole }) {
  return (
    <nav className='glass-navbar sm:px-12 px-4 flex items-center justify-between sticky top-0 z-50 py-2'>
      <div className='flex items-center gap-2 sm:gap-3'>
        <div className='lg:hidden'>
          <LinksDropdown role={role} />
        </div>
        {/* Wordmark testuale: la dashboard ospita organizzazioni diverse, niente logo Aletheia APL specifico */}
        <span className="text-lg sm:text-xl font-black tracking-tight text-foreground">
          Aletheia<span className="text-primary">4Job</span>
        </span>
      </div>
      <div className='flex items-center gap-3'>
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </nav>
  );
}

export default Navbar;
