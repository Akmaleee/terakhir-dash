// src/app/providers.tsx
"use client";

import { ApolloLink, HttpLink } from "@apollo/client";
import {
  ApolloNextAppProvider,
  NextSSRInMemoryCache,
  NextSSRApolloClient,
  SSRMultipartLink,
} from "@apollo/experimental-nextjs-app-support/ssr";


// 1. Impor AuthProvider (untuk memperbaiki error 'useAuth')

import { AuthProvider } from "@/lib/auth"; 


import { TooltipProvider } from "@/components/ui/tooltip"; 


// 2. Konfigurasi Apollo Client cara modern (memperbaiki error TS2339)

const uri = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ?? "/api/graphql";

function makeClient() {
  const httpLink = new HttpLink({
    uri: uri,
    // Menonaktifkan cache fetch di sisi server agar data selalu baru
    fetchOptions: { cache: "no-store" },
  });

  // Note: errorLink (onError) Anda dapat ditambahkan di sini jika diperlukan,
  // tapi setup SSR ini seringkali sudah cukup.


  return new NextSSRApolloClient({
    cache: new NextSSRInMemoryCache(),
    link:
      typeof window === "undefined"
        ? ApolloLink.from([
            new SSRMultipartLink({
              stripDefer: true,
            }),
            httpLink,
          ])
        : httpLink,
  });
}

// Komponen wrapper baru untuk Apollo
function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}

//Gabungkan semua provider

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider> 
      <TooltipProvider>
        <ApolloWrapper> 
          {children}
        </ApolloWrapper>
      </TooltipProvider>
    </AuthProvider>
  );
}