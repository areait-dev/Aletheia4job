import {
  AreaChart,
  Layers,
  AppWindow,
  UserPlus,
  Shield,
  Globe,
  Briefcase,
  Calendar,
  LayoutDashboard,
  FileText
} from 'lucide-react';
import {
  canAccessAdmin,
  canWrite
} from './permissions';
import { MembershipRole } from '@prisma/client';

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: (role: MembershipRole) => boolean;
  /** Gruppo di appartenenza nel menu (stile WordPress). */
  section: string;
  /** Se true la voce non compare nei menu; la pagina resta raggiungibile via URL. */
  hidden?: boolean;
};

const links: NavLink[] = [
  {
    href: '/dashboard',
    section: 'Generale',
    label: 'dashboard',
    icon: <LayoutDashboard />,
  },
  {
    href: '/nuovo-candidato',
    section: 'Candidati',
    label: 'nuovo candidato',
    icon: <UserPlus />,
    permission: canWrite,
  },
  {
    href: '/archivio',
    section: 'Candidati',
    label: 'archivio',
    icon: <AppWindow />,
  },
  {
    href: '/posizioni',
    section: 'Offerte',
    label: 'posizioni',
    icon: <Briefcase />,
  },
  {
    href: '/selezione',
    section: 'Candidati',
    label: 'selezione',
    icon: <Layers />,
  },
  {
    href: '/statistiche',
    section: 'Analisi',
    hidden: true,
    label: 'statistiche',
    icon: <AreaChart />,
  },
  {
    href: '/calendario',
    section: 'Analisi',
    hidden: true,
    label: 'calendario',
    icon: <Calendar />,
  },
  {
    href: '/',
    section: 'Offerte',
    label: 'offerte di lavoro',
    icon: <Globe />,
  },
  {
    href: '/contenuti',
    section: 'Impostazioni',
    label: 'contenuti',
    icon: <FileText />,
    permission: canAccessAdmin,
  },
  {
    href: '/amministrazione',
    section: 'Impostazioni',
    label: 'amministrazione',
    icon: <Shield />,
    permission: canAccessAdmin,
  },
];

/** Voci visibili nei menu per il ruolo dato. */
export function getVisibleLinks(role: MembershipRole): NavLink[] {
  return links.filter((l) => !l.hidden && (!l.permission || l.permission(role)));
}

export default links;
