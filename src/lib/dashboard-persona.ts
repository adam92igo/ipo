export const PERSONAS = ["demo", "owner", "cfo", "department_lead"] as const;
export type Persona = (typeof PERSONAS)[number];

export const PERSONA_LABELS: Record<Persona, string> = {
  demo: "Demo",
  owner: "Owner",
  cfo: "CFO",
  department_lead: "Department Lead",
};

export const PERSONA_STORAGE_KEY = "ipo-compass:dashboard-persona";

export function isPersona(value: string | null): value is Persona {
  return !!value && (PERSONAS as readonly string[]).includes(value);
}
