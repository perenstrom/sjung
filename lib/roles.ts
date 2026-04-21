export const ROLES = ["Kompositör", "Arrangör", "Textförfattare"] as const;
export type Role = (typeof ROLES)[number];
