'use client';

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, UserIcon } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function UserProfileDropdown() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const email = user?.email ?? "";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-2xl p-0 border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-200">
          <div className="h-10 w-10 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
        <DropdownMenuLabel className="px-2 py-2">
          <p className="font-semibold text-sm">Account</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{email || "Utente"}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
