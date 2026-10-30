'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SapRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return <div className="h-40 rounded-3xl bg-slate-800/80 border border-slate-700 animate-pulse" />;
}
