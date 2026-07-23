"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  isPersona,
  PERSONA_STORAGE_KEY,
  type Persona,
} from "@/lib/dashboard-persona";

type PersonaContextValue = [Persona, (next: Persona) => void];

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<Persona>("demo");

  useEffect(() => {
    const stored = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (isPersona(stored)) setPersona(stored);
  }, []);

  const update = (next: Persona) => {
    setPersona(next);
    window.localStorage.setItem(PERSONA_STORAGE_KEY, next);
  };

  return (
    <PersonaContext.Provider value={[persona, update]}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used within a PersonaProvider");
  return ctx;
}
