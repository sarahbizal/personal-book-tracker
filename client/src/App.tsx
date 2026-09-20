import { Routes, Route } from "react-router";
import "./App.css";
import BookDetailPage from "./pages/BookDetailPage";
import BooksMainPage from "./pages/BooksMainPage";
import BookTubePage from "./pages/BookTubePage";

function App() {
  return (
    <Routes>
      <Route path="/">
        <Route index element={<BooksMainPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
        <Route path="/booktube" element={<BookTubePage />} />
      </Route>
    </Routes>
  );
}

export default App;
