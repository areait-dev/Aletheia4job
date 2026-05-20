import Image from 'next/image';
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
        <div className="relative shrink-0 flex items-center max-sm:h-12 max-sm:w-28 sm:h-16 sm:w-36 lg:h-20 lg:w-[200px]">
          <Image
            src="/logo-brand.png"
            alt="Aletheia"
            fill
            className="object-contain object-left scale-[1.6] origin-left"
            priority
            sizes="(max-width: 640px) 112px, (max-width: 1024px) 144px, 200px"
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
