import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getAuthContext, type AuthContext } from '@/utils/authz';
import { redirect } from 'next/navigation';

import { PropsWithChildren } from 'react';

export const dynamic = 'force-dynamic';

async function resolveAuth(): Promise<AuthContext | null> {
  try {
    return await getAuthContext();
  } catch (error) {
    console.error('[dashboard layout] getAuthContext failed:', error);
    return null;
  }
}

async function layout({ children }: PropsWithChildren) {
  const auth = await resolveAuth();
  if (!auth) redirect('/login');

  return (
    <main className='grid lg:grid-cols-5'>
      <div className='hidden lg:block lg:col-span-1 lg:min-h-screen'>
        <Sidebar role={auth.role} />
      </div>

      <div className='lg:col-span-4'>
        <Navbar role={auth.role} />
        <div className='py-16 px-4 sm:px-8 lg:px-16'>{children}</div>
      </div>
    </main>
  );
}
export default layout;
