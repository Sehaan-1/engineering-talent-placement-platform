CREATE TABLE IF NOT EXISTS skill_categories (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_definitions (
  id serial PRIMARY KEY,
  category_id integer NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_matrices (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_id integer REFERENCES skill_definitions(id) ON DELETE CASCADE,
  proficiency text NOT NULL DEFAULT 'working',
  years_used integer NOT NULL DEFAULT 1,
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text NOT NULL DEFAULT ''
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'skill_matrices' AND column_name = 'skill_id'
  ) THEN
    ALTER TABLE skill_matrices ADD COLUMN skill_id integer REFERENCES skill_definitions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE candidates ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, ''))
    ) STORED;
    CREATE INDEX IF NOT EXISTS candidates_search_idx ON candidates USING gin(search_vector);
  END IF;
END $$;

INSERT INTO skill_categories (name, slug, color)
VALUES
  ('Frontend', 'frontend', '#3b82f6'),
  ('Backend', 'backend', '#10b981'),
  ('Cloud & DevOps', 'cloud-devops', '#f59e0b'),
  ('Mobile', 'mobile', '#8b5cf6'),
  ('Data & Storage', 'data-storage', '#ec4899'),
  ('Architecture & Other', 'architecture', '#64748b')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO skill_definitions (category_id, name, slug)
SELECT c.id, s.name, s.slug
FROM (
  VALUES
    ('frontend', 'React', 'react'),
    ('frontend', 'TypeScript', 'typescript'),
    ('frontend', 'Next.js', 'nextjs'),
    ('frontend', 'JavaScript', 'javascript'),
    ('frontend', 'Vue.js', 'vue'),
    ('frontend', 'Nuxt', 'nuxt'),
    ('frontend', 'Angular', 'angular'),
    ('frontend', 'Svelte', 'svelte'),
    ('frontend', 'Tailwind CSS', 'tailwind'),
    ('frontend', 'HTML / CSS', 'html-css'),
    ('frontend', 'WebGL / Three.js', 'threejs'),
    ('frontend', 'Astro', 'astro'),
    ('backend', 'Node.js', 'nodejs'),
    ('backend', 'Express', 'express'),
    ('backend', 'NestJS', 'nestjs'),
    ('backend', 'Python', 'python'),
    ('backend', 'Django', 'django'),
    ('backend', 'FastAPI', 'fastapi'),
    ('backend', 'Go', 'go'),
    ('backend', 'Rust', 'rust'),
    ('backend', 'Java', 'java'),
    ('backend', 'Spring Boot', 'springboot'),
    ('backend', 'C# / .NET', 'csharp-dotnet'),
    ('backend', 'Ruby on Rails', 'rails'),
    ('backend', 'GraphQL', 'graphql'),
    ('backend', 'REST APIs', 'rest-apis'),
    ('backend', 'gRPC', 'grpc'),
    ('cloud-devops', 'AWS', 'aws'),
    ('cloud-devops', 'GCP', 'gcp'),
    ('cloud-devops', 'Azure', 'azure'),
    ('cloud-devops', 'Docker', 'docker'),
    ('cloud-devops', 'Kubernetes', 'kubernetes'),
    ('cloud-devops', 'Terraform', 'terraform'),
    ('cloud-devops', 'CI / CD', 'ci-cd'),
    ('cloud-devops', 'Linux', 'linux'),
    ('mobile', 'React Native', 'react-native'),
    ('mobile', 'Flutter', 'flutter'),
    ('mobile', 'iOS / Swift', 'swift'),
    ('mobile', 'Android / Kotlin', 'kotlin'),
    ('data-storage', 'PostgreSQL', 'postgresql'),
    ('data-storage', 'Redis', 'redis'),
    ('data-storage', 'MongoDB', 'mongodb'),
    ('data-storage', 'MySQL', 'mysql'),
    ('data-storage', 'Elasticsearch', 'elasticsearch'),
    ('data-storage', 'Kafka', 'kafka'),
    ('architecture', 'System Design', 'system-design'),
    ('architecture', 'Microservices', 'microservices'),
    ('architecture', 'Design Systems', 'design-systems'),
    ('architecture', 'Monorepos', 'monorepos')
) AS s(cat_slug, name, slug)
JOIN skill_categories c ON c.slug = s.cat_slug
ON CONFLICT (slug) DO NOTHING;
