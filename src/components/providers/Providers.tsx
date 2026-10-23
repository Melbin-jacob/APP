"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { ReauthDialog } from "@/components/auth/ReauthDialog";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } } }),
  );
  return (
    <SessionProvider>
      <QueryClientProvider client={client}>
        {children}
        <ReauthDialog />
      </QueryClientProvider>
    </SessionProvider>
  );
}
