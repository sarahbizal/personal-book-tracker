export type ReadStatus = "want to read" | "reading" | "read";

export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  readStatus: ReadStatus;
  coverImageUrl: string | null;
}
