interface GenreItemProps {
  name: string;
  isSelected: boolean;
  onClick: () => void;
}

function GenreItem({ name, isSelected, onClick }: GenreItemProps) {
  return (
    <li
      className={isSelected ? "genre-list-item active" : "genre-list-item"}
      onClick={onClick}
    >
      {name}
    </li>
  );
}

export default GenreItem;
