-- Base schema for AnimalMind
-- Creates fundamental tables required before subsequent migrations

CREATE TABLE IF NOT EXISTS public.users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role VARCHAR(30) DEFAULT 'user' NOT NULL CHECK (role IN ('owner', 'user', 'vet', 'veterinarian', 'clinic_admin', 'admin')),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_signed_in TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.animals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(255),
  age INT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.classification_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  animal_id BIGINT NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  state VARCHAR(50) NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  emoji VARCHAR(10),
  model_used VARCHAR(50),
  cached BOOLEAN DEFAULT FALSE,
  feedback VARCHAR(50),
  audio_url TEXT,
  context_tags TEXT[] DEFAULT '{}'::text[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  alert_sensitivity VARCHAR(50) DEFAULT 'medium',
  share_diagnostic_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_animals_user_id ON public.animals(user_id);
CREATE INDEX IF NOT EXISTS idx_classification_events_user_id ON public.classification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_classification_events_animal_id ON public.classification_events(animal_id);
CREATE INDEX IF NOT EXISTS idx_classification_events_created_at ON public.classification_events(created_at);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

GRANT ALL ON public.users TO postgres, authenticated, service_role, anon;
GRANT ALL ON public.animals TO postgres, authenticated, service_role, anon;
GRANT ALL ON public.classification_events TO postgres, authenticated, service_role, anon;
GRANT ALL ON public.settings TO postgres, authenticated, service_role, anon;
