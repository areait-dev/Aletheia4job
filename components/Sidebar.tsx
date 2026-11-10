"use client";

import { getVisibleLinks } from "@/utils/links";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MembershipRole } from "@prisma/client";

/** Sidebar in stile WordPress: scura, voci raggruppate per sezione. */
function Sidebar({ role }: { role: MembershipRole }) {
  const pathname = usePathname();
  const visible = getVisibleLinks(role);

  // Raggruppa mantenendo l'ordine di prima apparizione delle sezioni
  const sections: { name: string; items: typeof visible }[] = [];
  for (const link of visible) {
    let group = sections.find((s) => s.name === link.section);
    if (!group) {
      group = { name: link.section, items: [] };
      sections.push(group);
    }
    group.items.push(link);
  }

  return (
    <aside className="h-full flex flex-col bg-[#1d2327] text-[#c3c4c7] overflow-y-auto">
      <nav className="flex flex-col flex-1 py-3">
        {sections.map((section) => (
          <div key={section.name} className="mb-2">
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#8c8f94]">
              {section.name}
            </p>
            {section.items.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm border-l-4 border-transparent transition-colors",
                    "hover:bg-[#2c3338] hover:text-primary [&_svg]:w-[18px] [&_svg]:h-[18px]",
                    isActive &&
                      "bg-primary text-primary-foreground border-white/40 hover:bg-primary hover:text-primary-foreground font-semibold"
                  )}
                >
                  {link.icon}
                  <span className="capitalize">{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-xs font-semibold text-white/80">Agenzia per il Lavoro</p>
        <p className="text-[10px] text-[#8c8f94] mt-0.5">Versione 1.2.0</p>
      </div>
    </aside>
  );
}

export default Sidebar;
