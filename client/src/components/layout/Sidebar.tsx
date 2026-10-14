import GenreList from "../sidebar/GenreList";

interface SideBarProps {
  genres: string[];
  onSelectGenre: (genre: string) => void;
}

function SideBar({ genres, onSelectGenre }: SideBarProps) {
  return (
    <aside className="sidebar">
      <GenreList items={genres} onSelectItem={onSelectGenre} />
    </aside>
  );
}

export default SideBar;
