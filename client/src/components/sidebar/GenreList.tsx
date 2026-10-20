import GenreItem from "./GenreItem";

interface GenreListProps {
  items: string[];
  selectedItem: string | null;
  onSelectItem: (item: string | null) => void;
}

//null means no genre is selected, so all books show
function GenreList({ items, selectedItem, onSelectItem }: GenreListProps) {
  return (
    <ul className="genre-list">
      <GenreItem
        name="All genres"
        isSelected={selectedItem === null}
        onClick={() => onSelectItem(null)}
      />
      {items.map((item) => (
        <GenreItem
          key={item}
          name={item}
          isSelected={selectedItem === item}
          //Clicking the selected genre again clears it
          onClick={() => onSelectItem(selectedItem === item ? null : item)}
        />
      ))}
    </ul>
  );
}

export default GenreList;
