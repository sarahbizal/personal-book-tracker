import { useState } from "react";
import GenreItem from "./GenreItem";

interface GenreListProps {
  items: string[];
  onSelectItem: (item: string) => void;
}

function GenreList({ items, onSelectItem }: GenreListProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  return (
    <ul className="genre-list">
      {items.map((item, index) => (
        <GenreItem
          key={item}
          name={item}
          isSelected={selectedIndex === index}
          onClick={() => {
            setSelectedIndex(index);
            onSelectItem(item);
          }}
        />
      ))}
    </ul>
  );
}

export default GenreList;
