CREATE TABLE public.valorant_servers (
  id text PRIMARY KEY,
  region public.valorant_region NOT NULL,
  display_name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX idx_valorant_servers_region ON public.valorant_servers (region, sort_order);

INSERT INTO public.valorant_servers (id, region, display_name, sort_order) VALUES
  ('na-virginia',     'NA',    'Virginia (NA)',          10),
  ('na-illinois',     'NA',    'Illinois (NA)',          20),
  ('na-texas',        'NA',    'Texas (NA)',             30),
  ('na-oregon',       'NA',    'Oregon (NA)',            40),
  ('na-california',   'NA',    'California (NA)',        50),
  ('latam-mexico',    'LATAM', 'Mexico (LATAM)',         10),
  ('latam-chile',     'LATAM', 'Chile (LATAM)',          20),
  ('br-saopaulo',     'BR',    'São Paulo (BR)',         10),
  ('eu-paris',        'EU',    'Paris (EU)',             10),
  ('eu-frankfurt',    'EU',    'Frankfurt (EU)',         20),
  ('eu-stockholm',    'EU',    'Stockholm (EU)',         30),
  ('eu-london',       'EU',    'London (EU)',            40),
  ('eu-madrid',       'EU',    'Madrid (EU)',            50),
  ('eu-warsaw',       'EU',    'Warsaw (EU)',            60),
  ('eu-istanbul',     'EU',    'Istanbul (EU)',          70),
  ('eu-bahrain',      'EU',    'Bahrain (EU)',           80),
  ('kr-seoul',        'KR',    'Seoul (KR)',             10),
  ('apac-tokyo',      'APAC',  'Tokyo (APAC)',           10),
  ('apac-singapore',  'APAC',  'Singapore (APAC)',       20),
  ('apac-hongkong',   'APAC',  'Hong Kong (APAC)',       30),
  ('apac-sydney',     'APAC',  'Sydney (APAC)',          40),
  ('apac-mumbai',     'APAC',  'Mumbai (APAC)',          50),
  ('apac-jakarta',    'APAC',  'Jakarta (APAC)',         60),
  ('apac-taipei',     'APAC',  'Taipei (APAC)',          70);
