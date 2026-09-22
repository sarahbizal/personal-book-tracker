import { useState } from "react";

interface SearchBarProps {
  onSearch: (title: string) => void;
}

function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="search..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </form>
    </div>
  );
}

export default SearchBar;
