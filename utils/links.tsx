import {
  AreaChart,
  Layers,
  AppWindow,
  UserPlus,
  Shield,
  Globe,
  Briefcase,
  Calendar,
  LayoutDashboard
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
};

const links: NavLink[] = [
  {
    href: '/dashboard',
    label: 'dashboard',
    icon: <LayoutDashboard />,
  },
  {
    href: '/add-candidate',
    label: 'nuovo candidato',
    icon: <UserPlus />,
    permission: canWrite,
  },
  {
    href: '/jobs',
    label: 'archivio',
    icon: <AppWindow />,
  },
  {
    href: '/positions',
    label: 'posizioni',
    icon: <Briefcase />,
  },
  {
    href: '/pipeline',
    label: 'pipeline',
    icon: <Layers />,
  },
  {
    href: '/stats',
    label: 'statistiche',
    icon: <AreaChart />,
  },
  {
    href: '/calendar',
    label: 'calendario',
    icon: <Calendar />,
  },
  {
    href: '/careers',
    label: 'offerte di lavoro',
    icon: <Globe />,
  },
  {
    href: '/admin',
    label: 'admin',
    icon: <Shield />,
    permission: canAccessAdmin,
  },
];

export default links;
