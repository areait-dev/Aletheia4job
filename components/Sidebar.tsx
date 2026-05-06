"use client";

import links from "@/utils/links";
import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="py-8 px-6 bg-card h-full border-r border-border/50 shadow-sm flex flex-col">
      <div className="px-4 mb-12">
        <h1 className="text-2xl font-bold text-primary tracking-tight">
          Job <span className="text-foreground/80 font-medium">Aletheia</span>
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">
          Candidate Management
        </p>
      </div>

      <div className="flex flex-col gap-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Button
              asChild
              key={link.href}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-4 px-4 py-6 rounded-xl transition-all duration-300",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90" 
                  : "hover:bg-primary/5 text-muted-foreground hover:text-primary"
              )}
            >
              <Link href={link.href} className="flex items-center gap-x-3 text-sm font-semibold">
                <span className={cn("transition-transform duration-300", isActive && "scale-110")}>
                  {link.icon}
                </span>
                <span className="capitalize">{link.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
      
      <div className="mt-auto p-4 bg-primary/5 rounded-2xl border border-primary/10">
        <p className="text-xs font-medium text-primary/80">Agenzia per il Lavoro</p>
        <p className="text-[10px] text-muted-foreground mt-1">Versione 1.2.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
