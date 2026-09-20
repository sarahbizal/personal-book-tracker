import BookCard from "./BookCard";
import type { BookCardProps } from "./BookCard";

interface BookGridProps {
  books: BookCardProps[];
}

function BookGrid({ books }: BookGridProps) {
  return (
    <div>
      {books.map((book) => (
        <BookCard
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
