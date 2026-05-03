import type { PieceCredit } from "@/lib/pieces/credits";

export type { PieceCredit };

export type Person = {
  id: string;
  name: string;
};

export type CreditRow = {
  id: number;
  personId: string;
  role: string;
};
