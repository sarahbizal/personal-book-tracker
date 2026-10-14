import { useState } from "react";
import GenreItem from "./GenreItem";

interface GenreListProps {
  items: string[];
  onSelectItem: (item: string) => void;
}

function GenreList({ items, onSelectItem }: GenreListProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <ul className="genre-list">
      {items.map((item) => (
        <GenreItem
          key={item}
          name={item}
          isSelected={selectedItem === item}
          onClick={() => {
            setSelectedItem(item);
            onSelectItem(item);
          }}
        />
      ))}
    </ul>
  );
}

export default GenreList;
