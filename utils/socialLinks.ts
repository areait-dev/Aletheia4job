import { Linkedin, Instagram, Facebook, Send, type LucideIcon } from 'lucide-react';

// Unica fonte di verità per i canali social ufficiali di Alètheia, usata sia
// nella career page (app/page.tsx) sia nella pagina annuncio
// (app/offerte-di-lavoro/[slug]/page.tsx): tenerli in un solo posto evita che
// le due pagine finiscano per mostrare set diversi di icone/link.
export const SOCIAL_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'LinkedIn', href: 'https://it.linkedin.com/company/al%C3%A9theia-srl', icon: Linkedin },
  { label: 'Facebook', href: 'https://www.facebook.com/aletheiasrl.it/?locale=it_IT', icon: Facebook },
  { label: 'Instagram', href: 'https://www.instagram.com/aletheiasrl/', icon: Instagram },
  { label: 'Telegram', href: 'https://t.me/alethiaapl', icon: Send },
];
