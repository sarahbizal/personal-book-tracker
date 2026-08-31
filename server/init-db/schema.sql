CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT NOT NULL,
    read_status TEXT NOT NULL DEFAULT 'want to read',
    cover_img_text TEXT
);

CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    book_review_text TEXT,
    date_finished DATE
);

SELECT * books
