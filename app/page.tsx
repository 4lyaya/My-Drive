'use client';

import { FileManager } from '@/components/file-manager/file-manager';
import { ToastProvider } from '@/components/toast-provider';

export default function Home() {
  return (
    <ToastProvider>
      <FileManager />
    </ToastProvider>
  );
}
