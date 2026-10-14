interface GenreItemProps {
  name: string;
  isSelected: boolean;
  onClick: () => void;
}

function GenreItem({ name, isSelected, onClick }: GenreItemProps) {
  return (
    <li className={isSelected ? "genre-list-item active" : "genre-list-item"}>
      <button type="button" aria-pressed={isSelected} onClick={onClick}>
        {name}
      </button>
    </li>
  );
}

export default GenreItem;
