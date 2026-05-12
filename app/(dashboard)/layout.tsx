import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getAuthContext } from '@/utils/authz';
import { redirect } from 'next/navigation';

import { PropsWithChildren } from 'react';

async function layout({ children }: PropsWithChildren) {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');

  return (
    <main className='grid lg:grid-cols-5'>
      {/* first-col hide on small screen */}
      <div className='hidden lg:block lg:col-span-1 lg:min-h-screen'>
        <Sidebar role={auth.role} />
      </div>
      {/* second-col hide dropdown on big screen */}

      <div className='lg:col-span-4'>
        <Navbar role={auth.role} />
        <div className='py-16 px-4 sm:px-8 lg:px-16'>{children}</div>
      </div>
    </main>
  );
}
export default layout;
