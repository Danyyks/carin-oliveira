"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// Estado de autenticação do painel (login só da dona).
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Defesa: se a autenticação não inicializar (ex.: contexto inseguro),
    // não deixa a tela presa no "Carregando…" pra sempre.
    const t = setTimeout(() => setLoading(false), 6000);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      clearTimeout(t); // já resolveu antes do timeout
    });
    return () => {
      unsub();
      clearTimeout(t);
    };
  }, []);

  return {
    user,
    loading,
    login: (email: string, senha: string) => signInWithEmailAndPassword(auth, email, senha),
    logout: () => signOut(auth),
  };
}
