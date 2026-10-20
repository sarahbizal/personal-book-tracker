import GenreList from "../sidebar/GenreList";

interface SideBarProps {
  genres: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
}

function SideBar({ genres, selectedGenre, onSelectGenre }: SideBarProps) {
  return (
    <aside className="sidebar">
      <h2>Genres</h2>
      <GenreList
        items={genres}
        selectedItem={selectedGenre}
        onSelectItem={onSelectGenre}
      />
    </aside>
  );
}

export default SideBar;
