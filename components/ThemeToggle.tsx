'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='border-2 bg-background/50 hover:bg-primary/5 hover:border-primary/30'
        >
          <Sun className='h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500' />
          <Moon className='absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400' />
          <span className='sr-only'>Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='rounded-2xl p-1.5 min-w-[130px]'>
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className='rounded-xl cursor-pointer'
        >
          <Sun className='w-4 h-4 mr-2 text-amber-500' />
          Chiaro
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className='rounded-xl cursor-pointer'
        >
          <Moon className='w-4 h-4 mr-2 text-blue-400' />
          Scuro
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className='rounded-xl cursor-pointer'
        >
          <span className='w-4 h-4 mr-2 flex items-center justify-center text-xs font-bold text-muted-foreground'>A</span>
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
