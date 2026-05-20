import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlignLeft } from 'lucide-react';
import { Button } from './ui/button';
import links from '@/utils/links';
import Link from 'next/link';
import { MembershipRole } from '@prisma/client';

function DropdownLinks({ role }: { role: MembershipRole }) {
  const filteredLinks = links.filter((link) => {
    if (!link.permission) return true;
    return link.permission(role);
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className='lg:hidden'>
        <Button variant='outline' size='icon' className='max-sm:h-10 max-sm:w-10'>
          <AlignLeft className='max-sm:h-5 max-sm:w-5' />

          <span className='sr-only'>Toggle links</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-52 lg:hidden '
        align='start'
        sideOffset={25}
      >
        {filteredLinks.map((link) => {
          return (
            <DropdownMenuItem key={link.href} asChild>
              <Link href={link.href} className='flex items-center gap-x-2 '>
                {link.icon} <span className='capitalize'>{link.label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export default DropdownLinks;
