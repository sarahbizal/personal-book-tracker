import type { Book } from "../types/book";
import BookGrid from "../components/books/BookGrid";
import { useEffect, useState } from "react";
import Header from "../components/layout/Header";
import SideBar from "../components/layout/SideBar";
import { fetchJson } from "../api";

//Directly renders components for now. Eventually will be swapped out for wrapper component and the props will pass through them.
function BooksMainPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  //null means no genre is selected, so all books show. Not used for filtering yet: /books only supports ?title=
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  //A new object on every search, so searching the same title again still refetches
  const [search, setSearch] = useState({ title: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    //A newer search (or closing the page) sets ignore, so a slower older response is dropped
    let ignore = false;

    const loadBooks = async () => {
      try {
        const data = await fetchJson<Book[]>(
          `/books?title=${encodeURIComponent(search.title)}`,
        );
        if (!ignore) {
          setBooks(data);
        }
      } catch (err) {
        if (!ignore) {
          setError((err as Error).message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    loadBooks();

    return () => {
      ignore = true;
    };
  }, [search]);

  useEffect(() => {
    //Skips setting state if the page closes before the request finishes
    let ignore = false;

    const loadGenres = async () => {
      try {
        const data = await fetchJson<string[]>("/genres");
        if (!ignore) {
          setGenres(data);
        }
      } catch (err) {
        if (!ignore) {
          setError((err as Error).message);
        }
      }
    };
    loadGenres();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSelectGenre = (genre: string | null) => {
    setSelectedGenre(genre);
  };

  const handleSearch = (title: string) => {
    setIsLoading(true);
    setError(null);
    setSearch({ title });
  };

  let content;
  if (isLoading) {
    content = <p role="status">Loading books...</p>;
  } else if (error) {
    //The error message above already explains the empty grid
    content = null;
  } else if (books.length === 0) {
    content = <p>No books found</p>;
  } else {
    content = <BookGrid books={books} />;
  }

  return (
    <div>
      <Header onSearch={handleSearch} />
      <SideBar
        genres={genres}
        selectedGenre={selectedGenre}
        onSelectGenre={handleSelectGenre}
      />
      {error && <p role="alert">{error}</p>}
      {content}
    </div>
  );
}

export default BooksMainPage;
