import BookCard from "./BookCard";
import type { Book } from "../../types/book";

interface BookGridProps {
  books: Book[];
}

function BookGrid({ books }: BookGridProps) {
  return (
    <div>
      {books.map((book) => (
        <BookCard
          key={book.id}
          id={book.id}
          title={book.title}
          author={book.author}
          genre={book.genre}
          readStatus={book.readStatus}
          coverImageUrl={book.coverImageUrl}
        />
      ))}
    </div>
  );
}

export default BookGrid;
