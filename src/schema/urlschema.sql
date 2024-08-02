CREATE TABLE
    urls (
        id VARCHAR(255) PRIMARY KEY,
        url TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE
    );