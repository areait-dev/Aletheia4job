import { 
  AreaChart, 
  Layers, 
  AppWindow, 
  UserPlus, 
  Shield, 
  Users, 
  ClipboardList, 
  Trophy, 
  Globe, 
  Briefcase, 
  Clock, 
  Files, 
  Calendar, 
  LayoutDashboard 
} from 'lucide-react';
import { 
  canAccessAdmin, 
  canAccessDocuments, 
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
    href: '/add-job',
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
    href: '/employees',
    label: 'team',
    icon: <Users />,
    permission: canWrite,
  },
  {
    href: '/attendance',
    label: 'presenze',
    icon: <Clock />,
    permission: canWrite,
  },
  {
    href: '/calendar',
    label: 'calendario',
    icon: <Calendar />,
  },
  {
    href: '/documents',
    label: 'documenti',
    icon: <Files />,
    permission: canAccessDocuments,
  },
  {
    href: '/onboarding',
    label: 'onboarding',
    icon: <ClipboardList />,
    permission: canWrite,
  },
  {
    href: '/performance',
    label: 'performance',
    icon: <Trophy />,
    permission: canWrite,
  },
  {
    href: '/careers',
    label: 'career page',
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
