// src/lib/auth.ts
// KODE INI HANYA UNTUK CLIENT COMPONENTS
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
// ====================================================================
// PERBAIKAN: Mengganti 'as' menjadi 'from'
// ====================================================================
import { useRouter } from "next/navigation";

// Definisikan tipe untuk sesi pengguna di client
interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
}

// Definisikan tipe untuk nilai context
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // login: (token: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// Buat context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider: Komponen yang membungkus aplikasi
 * untuk menyediakan data autentikasi.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Cek status login saat komponen dimuat
  useEffect(() => {
    const checkUser = async () => {
      setIsLoading(true);
      try {
        // Panggil endpoint /api/auth/me untuk validasi token
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  // Fungsi untuk login
  // const login = async (token: string) => {
  const login = async () => {
    setIsLoading(true);
    // (Meskipun login/route.ts mengatur cookie, kita panggil /me lagi
    // untuk sinkronisasi data user di state React)
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        router.push("/"); // Arahkan ke dashboard
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk logout
  const logout = async () => {
    setIsLoading(true);
    try {
      // Panggil endpoint logout
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Hapus data user dan paksa refresh ke halaman login
      setUser(null);
      router.push("/login");
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth: Hook untuk mengakses data autentikasi
 * dari komponen client manapun.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}