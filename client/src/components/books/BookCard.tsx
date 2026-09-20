export interface BookCardProps {
  id: number;
  title: string;
  author: string;
  genre: string;
  readStatus: string;
  coverImageUrl: string | null;
}

function BookCard({
  title,
  author,
  genre,
  readStatus,
  coverImageUrl,
}: BookCardProps) {
  return (
    <div>
      <img src={coverImageUrl ?? "placeholder.jpg"} alt={title} />
      <h3>{title}</h3>
      <p>{author}</p>
      <p>{genre}</p>
      <p>{readStatus}</p>
    </div>
  );
}

export default BookCard;
