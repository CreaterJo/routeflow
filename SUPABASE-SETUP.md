# RouteFlow — Supabase Einrichtung

## Deine Projekt-Daten
- **URL**: https://wlntdgfqhumhboeuaprm.supabase.co
- **Anon Key**: `sb_publishable_g-_jKRxv1BQOnXF5jAHXFQ_c90MG1Rd`
- **.env** Datei ist bereits angelegt

## Tabellen erstellen

In Supabase Dashboard → SQL Editor → "New Query" ausführen:

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  mode VARCHAR(20) DEFAULT 'local',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Touren
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_address TEXT,
  addresses JSONB,
  route_order JSONB,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Statistiken
CREATE TABLE IF NOT EXISTS stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  total_deliveries INTEGER DEFAULT 0,
  total_km DOUBLE PRECISION DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own tours" ON tours FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tours" ON tours FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own stats" ON stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON stats FOR UPDATE USING (auth.uid() = user_id);
```

## RLS Policies für anonymous access (optional)
Wenn du keine Anmeldung willst und nur die Tabellen brauchst:

```sql
-- Für den Anfang: alle Tabellen öffentlich lesbar/schreibbar
CREATE POLICY "Allow anonymous read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous read tours" ON tours FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert tours" ON tours FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous read stats" ON stats FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update stats" ON stats FOR UPDATE USING (true);
```
