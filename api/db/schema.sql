DROP TABLE IF EXISTS items;

CREATE TABLE IF NOT EXISTS devices (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (
    type IN (
      'pc', 'notebook', 'server', 'phone', 'printer',
      'switch', 'hub',
      'router', 'router_wifi'
    )
  ),
  x real NOT NULL,
  y real NOT NULL,
  ip text,
  mask text,
  gateway text,
  ip2 text,
  mask2 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Existing labs were created with the first type list: widen it in place.
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_type_check;
ALTER TABLE devices ADD CONSTRAINT devices_type_check CHECK (
  type IN (
    'pc', 'notebook', 'server', 'phone', 'printer',
    'switch', 'hub',
    'router', 'router_wifi'
  )
);

CREATE TABLE IF NOT EXISTS links (
  id serial PRIMARY KEY,
  a_id integer NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
  b_id integer NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT links_distinct_devices CHECK (a_id <> b_id),
  CONSTRAINT links_unique_pair UNIQUE (a_id, b_id)
);

-- Starter lab: two PCs on a switch, plus a router leading to a second subnet.
INSERT INTO devices (name, type, x, y, ip, mask, gateway, ip2, mask2)
SELECT * FROM (VALUES
  ('PC1', 'pc', 22::real, 18::real, '192.168.0.10', '255.255.255.0', '192.168.0.1', NULL, NULL),
  ('PC2', 'pc', 78::real, 18::real, '192.168.0.11', '255.255.255.0', '192.168.0.1', NULL, NULL),
  ('SW1', 'switch', 50::real, 40::real, NULL, NULL, NULL, NULL, NULL),
  ('R1', 'router', 50::real, 62::real, '192.168.0.1', '255.255.255.0', NULL, '10.0.0.1', '255.255.255.0'),
  ('PC3', 'pc', 24::real, 86::real, '10.0.0.10', '255.255.255.0', '10.0.0.1', NULL, NULL)
) AS seed(name, type, x, y, ip, mask, gateway, ip2, mask2)
WHERE NOT EXISTS (SELECT 1 FROM devices);

INSERT INTO links (a_id, b_id)
SELECT a.id, b.id
FROM (VALUES ('PC1', 'SW1'), ('PC2', 'SW1'), ('SW1', 'R1'), ('R1', 'PC3')) AS pairs(a_name, b_name)
JOIN devices a ON a.name = pairs.a_name
JOIN devices b ON b.name = pairs.b_name
WHERE NOT EXISTS (
  SELECT 1 FROM links l
  WHERE (l.a_id = a.id AND l.b_id = b.id) OR (l.a_id = b.id AND l.b_id = a.id)
);
