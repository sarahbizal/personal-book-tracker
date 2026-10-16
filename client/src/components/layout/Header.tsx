import SearchBar from "../search/SearchBar";

interface HeaderProps {
  onSearch: (title: string) => void;
}

function Header({ onSearch }: HeaderProps) {
  return (
    <header className="header">
      <h1>Sarah's Reading Nook</h1>
      <SearchBar onSearch={onSearch} />
      {/* Placeholder for now. Menu behavior is a future feature. */}
      <button type="button" aria-label="Open menu">
        ☰
      </button>
    </header>
  );
}

export default Header;
