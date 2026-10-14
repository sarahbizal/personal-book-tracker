import type { Book } from "../types/book";
import BookGrid from "../components/books/BookGrid";
import { useState } from "react";
import SearchBar from "../components/search/SearchBar";
import SideBar from "../components/layout/Sidebar";

//Directly renders components for now. Eventually will be swapped out for wrapper component and the props will pass through them.
function BooksMainPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const genres = ["Adventure", "Horror", "Romance", "Fantasy"];

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
      <SideBar genres={genres} onSelectGenre={handleSelectGenre} />
      <BookGrid books={books} />
      <SearchBar onSearch={handleSearch} />
    </div>
  );
}

export default BooksMainPage;
