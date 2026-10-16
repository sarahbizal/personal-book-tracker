import SearchBar from "../search/SearchBar";

interface HeaderProps {
  onSearch: (title: string) => void;
}

function Header({ onSearch }: HeaderProps) {
  return (
    <header className="header">
      <SearchBar onSearch={onSearch} />
    </header>
  );
}

export default Header;
