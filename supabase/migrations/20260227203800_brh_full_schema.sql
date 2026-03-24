-- =============================================================================
-- BRH Habitat — Schema complet (projet Supabase neuf)
-- =============================================================================

-- =============================================================================
-- PROFILES (extension de auth.users)
-- =============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  locale TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_data" ON profiles
  FOR ALL USING (id = auth.uid());

-- Auto-create profile on signup + auto-admin for BRH email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    CASE
      WHEN NEW.email = 'contact@contact-brh.fr' THEN 'admin'
      ELSE 'user'
    END,
    'fr'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- DIAGNOSTICS
-- =============================================================================
CREATE TABLE brh_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  types TEXT[] NOT NULL,
  property_type TEXT,
  property_address TEXT,
  property_surface INT,
  property_year INT,
  property_floors INT,
  equipment JSONB NOT NULL DEFAULT '{}',
  symptoms JSONB NOT NULL DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  results JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'contacted', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brh_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own diagnostics" ON brh_diagnostics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create diagnostics" ON brh_diagnostics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read all diagnostics" ON brh_diagnostics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update diagnostics" ON brh_diagnostics
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- HOMES (Logements)
-- =============================================================================
CREATE TABLE brh_homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  property_type TEXT,
  surface INT,
  year_built INT,
  floors INT,
  heating_type TEXT,
  insulation_type TEXT,
  dpe_rating TEXT CHECK (dpe_rating IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  photos TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brh_homes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own homes" ON brh_homes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all homes" ON brh_homes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all homes" ON brh_homes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- CASES (Dossiers renovation)
-- =============================================================================
CREATE TABLE brh_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  home_id UUID REFERENCES brh_homes(id) ON DELETE SET NULL,
  diagnostic_id UUID REFERENCES brh_diagnostics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  work_types TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'devis', 'travaux', 'termine')),
  estimated_budget NUMERIC,
  start_date DATE,
  end_date DATE,
  documents TEXT[] DEFAULT '{}',
  admin_notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brh_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cases" ON brh_cases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can CRUD all cases" ON brh_cases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- APPOINTMENTS (Rendez-vous)
-- =============================================================================
CREATE TABLE brh_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  case_id UUID REFERENCES brh_cases(id) ON DELETE SET NULL,
  home_id UUID REFERENCES brh_homes(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('diagnostic', 'devis', 'visite', 'suivi')),
  requested_date TIMESTAMPTZ,
  confirmed_date TIMESTAMPTZ,
  status TEXT DEFAULT 'demande' CHECK (status IN ('demande', 'confirme', 'annule', 'termine')),
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brh_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own appointments" ON brh_appointments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create appointments" ON brh_appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can CRUD all appointments" ON brh_appointments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- ARTICLES (Contenu educatif)
-- =============================================================================
CREATE TABLE brh_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  cover_image TEXT,
  author TEXT DEFAULT 'BRH',
  seo_title TEXT,
  seo_description TEXT,
  published BOOLEAN DEFAULT false,
  read_time INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brh_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published articles" ON brh_articles
  FOR SELECT USING (published = true);

CREATE POLICY "Admins can CRUD all articles" ON brh_articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_brh_diagnostics_user ON brh_diagnostics(user_id);
CREATE INDEX idx_brh_diagnostics_status ON brh_diagnostics(status);
CREATE INDEX idx_brh_homes_user ON brh_homes(user_id);
CREATE INDEX idx_brh_cases_user ON brh_cases(user_id);
CREATE INDEX idx_brh_cases_status ON brh_cases(status);
CREATE INDEX idx_brh_appointments_user ON brh_appointments(user_id);
CREATE INDEX idx_brh_appointments_status ON brh_appointments(status);
CREATE INDEX idx_brh_articles_slug ON brh_articles(slug);
CREATE INDEX idx_brh_articles_category ON brh_articles(category);
CREATE INDEX idx_brh_articles_published ON brh_articles(published);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brh_diagnostics_updated_at BEFORE UPDATE ON brh_diagnostics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brh_homes_updated_at BEFORE UPDATE ON brh_homes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brh_cases_updated_at BEFORE UPDATE ON brh_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brh_appointments_updated_at BEFORE UPDATE ON brh_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER brh_articles_updated_at BEFORE UPDATE ON brh_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
