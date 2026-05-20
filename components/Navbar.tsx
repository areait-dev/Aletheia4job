import Image from 'next/image';
import LinksDropdown from './LinksDropdown';
import ThemeToggle from './ThemeToggle';
import UserProfileDropdown from './UserProfileDropdown';
import { MembershipRole } from '@prisma/client';

function Navbar({ role }: { role: MembershipRole }) {
  return (
    <nav className='glass-navbar sm:px-12 px-6 flex items-center justify-between sticky top-0 z-50 py-2'>
      <div className='lg:hidden'>
        <LinksDropdown role={role} />
      </div>
      <div className='hidden lg:flex items-center ml-6'>
        <div className="relative shrink-0 flex items-center" style={{ height: 80, width: 200 }}>
          <Image
            src="/logo-brand.png"
            alt="Aletheia"
            fill
            className="object-contain object-left scale-[1.6] origin-left"
            priority
            sizes="200px"
          />
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </nav>
  );
}

export default Navbar;
