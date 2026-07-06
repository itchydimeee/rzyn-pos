"use client";

import { QueryClientProvider as RQProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getQueryClient } from "./query/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <RQProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </RQProvider>
  );
}
