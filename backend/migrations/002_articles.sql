CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  slug text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Guides',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  cover_url text,
  cover_public_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  published_at timestamptz
);

CREATE UNIQUE INDEX articles_slug_idx ON articles (slug);
CREATE INDEX articles_published_idx ON articles (published_at DESC) WHERE status = 'published';
CREATE INDEX articles_author_idx ON articles (author_id, created_at DESC);
