import { Link } from "react-router";
import SearchBar from "../search/SearchBar";

interface HeaderProps {
  onSearch: (title: string) => void;
  //null while the login check is still running, so neither button shows yet
  isAdmin: boolean | null;
  onLogout: () => void;
}

function Header({ onSearch, isAdmin, onLogout }: HeaderProps) {
  return (
    <header className="header">
      <h1>Sarah's Reading Nook</h1>
      <SearchBar onSearch={onSearch} />
      {isAdmin === false && <Link to="/login">Log in</Link>}
      {isAdmin === true && (
        <button type="button" onClick={onLogout}>
          Log out
        </button>
      )}
      {/* Placeholder for now. Menu behavior is a future feature. */}
      <button type="button" aria-label="Open menu">
        ☰
      </button>
    </header>
  );
}

export default Header;
