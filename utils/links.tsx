import { AreaChart, Layers, AppWindow, UserPlus } from 'lucide-react';

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const links: NavLink[] = [
  {
    href: '/add-job',
    label: 'nuovo candidato',
    icon: <UserPlus />,
  },
  {
    href: '/jobs',
    label: 'archivio',
    icon: <AppWindow />,
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
];

export default links;
