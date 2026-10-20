import { useState } from "react";

interface SearchBarProps {
  onSearch: (title: string) => void;
}

function SearchBar({ onSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    //Trimmed so a search of only spaces acts like an empty search
    onSearch(searchQuery.trim());
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <form role="search" onSubmit={handleSubmit}>
      <input
        type="text"
        aria-label="Search books by title"
        placeholder="search..."
        value={searchQuery}
        onChange={handleSearchChange}
      />
      <button type="submit">Search</button>
    </form>
  );
}

export default SearchBar;
