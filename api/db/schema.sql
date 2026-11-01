CREATE TABLE IF NOT EXISTS items (
  id serial PRIMARY KEY,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO items (title)
SELECT seed.title
FROM (VALUES ('Read the code'), ('Bring the app up with docker compose')) AS seed(title)
WHERE NOT EXISTS (SELECT 1 FROM items);
