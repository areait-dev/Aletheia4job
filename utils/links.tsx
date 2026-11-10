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
    href: '/add-candidate',
    section: 'Candidati',
    label: 'nuovo candidato',
    icon: <UserPlus />,
    permission: canWrite,
  },
  {
    href: '/jobs',
    section: 'Candidati',
    label: 'archivio',
    icon: <AppWindow />,
  },
  {
    href: '/positions',
    section: 'Offerte',
    label: 'posizioni',
    icon: <Briefcase />,
  },
  {
    href: '/pipeline',
    section: 'Candidati',
    label: 'pipeline',
    icon: <Layers />,
  },
  {
    href: '/stats',
    section: 'Analisi',
    hidden: true,
    label: 'statistiche',
    icon: <AreaChart />,
  },
  {
    href: '/calendar',
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
    href: '/admin',
    section: 'Impostazioni',
    label: 'admin',
    icon: <Shield />,
    permission: canAccessAdmin,
  },
];

/** Voci visibili nei menu per il ruolo dato. */
export function getVisibleLinks(role: MembershipRole): NavLink[] {
  return links.filter((l) => !l.hidden && (!l.permission || l.permission(role)));
}

export default links;
