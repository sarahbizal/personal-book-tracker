import type { Book } from "../types/book";
import BookGrid from "../components/books/BookGrid";
import { useEffect, useState } from "react";
import Header from "../components/layout/Header";
import SideBar from "../components/layout/Sidebar";

//Directly renders components for now. Eventually will be swapped out for wrapper component and the props will pass through them.
function BooksMainPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    const loadGenres = async () => {
      const response = await fetch("http://localhost:3000/genres");
      const data = await response.json();
      setGenres(data);
    };
    loadGenres();
  }, []);

  const handleSelectGenre = (genre: string) => {
    console.log(genre);
  };

  const handleSearch = async (title: string) => {
    const response = await fetch(
      `http://localhost:3000/books?title=${encodeURIComponent(title)}`,
    );
    const data = await response.json();
    setBooks(data);
  };

  return (
    <div>
      <Header onSearch={handleSearch} />
      <SideBar genres={genres} onSelectGenre={handleSelectGenre} />
      <BookGrid books={books} />
    </div>
  );
}

export default BooksMainPage;
