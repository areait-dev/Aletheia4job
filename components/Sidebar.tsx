"use client";

import links from "@/utils/links";
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MembershipRole } from "@prisma/client";
import { Briefcase } from "lucide-react";

function Sidebar({ role }: { role: MembershipRole }) {
  const pathname = usePathname();

  const filteredLinks = links.filter((link) => {
    if (!link.permission) return true;
    return link.permission(role);
  });

  return (
    <aside className="py-8 px-5 bg-card h-full border-r border-border/30 shadow-sm flex flex-col">
      <div className="px-4 mb-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-primary p-1.5 rounded-xl shadow-lg shadow-primary/20">
            <Briefcase className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Job <span className="text-primary">Aletheia</span>
          </h1>
        </div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold ml-1">
          Gestione Candidati
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {filteredLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Button
              asChild
              key={link.href}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-4 py-5 rounded-2xl transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm shadow-primary/5 hover:bg-primary/15" 
                  : "hover:bg-primary/5 text-muted-foreground hover:text-primary"
              )}
            >
              <Link href={link.href} className="flex items-center gap-3 text-sm font-semibold">
                <span className={cn("transition-all duration-200", isActive && "scale-110")}>
                  {link.icon}
                </span>
                <span className="capitalize">{link.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
      
      <div className="mt-auto p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/10">
        <p className="text-xs font-semibold text-primary">Agenzia per il Lavoro</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">Versione 1.2.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
