# RouteFlow — Supabase Einrichtung

## 1. Supabase Projekt erstellen
1. Gehe zu https://supabase.com/dashboard
2. Klicke "New Project"
3. Wähle:
   - Name: `routeflow`
   - Database Password: ein sicheres Passwort
   - Region: Frankfurt (eu-central-1)
   - Wait for provisioning to finish
4. Projekt ist nach ~2 Minuten bereit

## 2. Datenbank-Tabellen anlegen
In der SQL Editor (Links "SQL Editor" → "New Query"):

```sql
-- Users Tabelle
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  mode VARCHAR(20) DEFAULT 'local',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Touren Tabelle
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

-- Statistiken Tabelle
CREATE TABLE IF NOT EXISTS stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  total_deliveries INTEGER DEFAULT 0,
  total_km DOUBLE PRECISION DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- RLS Policies (jeder sieht nur seine Daten)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own tours" ON tours FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tours" ON tours FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own stats" ON stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON stats FOR UPDATE USING (auth.uid() = user_id);
```

## 3. Umgebungsvariablen setzen
1. Im Supabase Dashboard: Project Settings → API
2. Kopiere `Project URL` und `anon/public` key
3. Erstelle `.env` Datei im Projekt:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Deployment auf Vercel (optional)
1. Repo auf GitHub pushen
2. Auf vercel.com importieren
3. Umgebungsvariablen setzen
4. Auto-Deploy aktiviert
