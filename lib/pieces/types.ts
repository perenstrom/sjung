export type PieceWithRelations = {
  id: string;
  name: string;
  credits: Array<{
    personId: string;
    role: string;
    person: { name: string };
  }>;
  files: Array<{
    id: string;
    createdAt: Date;
    displayName: string;
    fileName: string;
    mimeType: string;
    size: number;
  }>;
  links: Array<{
    id: string;
    createdAt: Date;
    url: string;
    label: string | null;
  }>;
};

export type PieceDetail = {
  id: string;
  name: string;
  credits: Array<{
    personId: string;
    role: string;
    person: { name: string };
  }>;
  files: Array<{
    id: string;
    createdAt: Date;
    displayName: string;
    fileName: string;
    mimeType: string;
    size: number;
  }>;
  links: Array<{
    id: string;
    createdAt: Date;
    url: string;
    label: string | null;
  }>;
  setListEntries: Array<{
    id: string;
    setListId: string;
    setListName: string;
  }>;
};
