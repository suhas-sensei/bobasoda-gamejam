
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { roundManager } from '../services/roundManager';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  const { account } = useAccount();

  useEffect(() => {
    // Update round manager with current account
    roundManager.setUserAccount(account || null);
  }, [account]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
