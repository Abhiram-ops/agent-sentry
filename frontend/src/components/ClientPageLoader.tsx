'use client';
import dynamic from 'next/dynamic';
const PageLoader = dynamic(() => import('./PageLoader'), { ssr: false });
export default function ClientPageLoader() {
  return <PageLoader />;
}
