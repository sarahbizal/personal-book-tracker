import type { BookCardProps } from "../components/books/BookCard";
import GenreList from "../components/sidebar/GenreList";
import BookGrid from "../components/books/BookGrid";
import { useState } from "react";
import SearchBar from "../components/search/SearchBar";
//import SideBar from "../components/layout/Sidebar";

//Directly renders components for now. Eventually will be swapped out for wrapper component and the props will pass through them.
function BooksMainPage() {
  const [books, setBooks] = useState<BookCardProps[]>([]);
  const items = ["Adventure", "Horror", "Romance", "Fantasy"];

  const handleSelectItem = (item: string) => {
    console.log(item);
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
      <GenreList items={items} onSelectItem={handleSelectItem} />
      <BookGrid books={books} />
      <SearchBar onSearch={handleSearch} />
      {/*<SideBar items={items} onSelectItem={handleSelectItem} />*/}
    </div>
  );
}

export default BooksMainPage;
