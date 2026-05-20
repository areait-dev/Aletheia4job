"use client";

import links from "@/utils/links";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MembershipRole } from "@prisma/client";

function Sidebar({ role }: { role: MembershipRole }) {
  const pathname = usePathname();

  const filteredLinks = links.filter((link) => {
    if (!link.permission) return true;
    return link.permission(role);
  });

  return (
    <aside className="glass-sidebar h-full flex flex-col py-6 px-4">
      {/* Spacer */}
      <div className="mb-6" />

      {/* Navigation links */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {filteredLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn("nav-item", isActive && "active")}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="capitalize">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer version badge */}
      <div className="mt-4 mx-1 p-3.5 bg-primary/10 backdrop-blur-lg rounded-xl border border-primary/20">
        <p className="text-xs font-semibold text-primary">Agenzia per il Lavoro</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">Versione 1.2.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
