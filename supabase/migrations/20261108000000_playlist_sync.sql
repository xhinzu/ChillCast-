-- ==============================================================================
-- Migration: 20261108000000_playlist_sync.sql
-- Description: Local-first cloud sync for Playlists, Liked Songs, and User Settings
-- Features: Soft deletes (tombstones), fractional ordering, RLS policies, storage bucket
-- ==============================================================================

-- 1. Create Playlists Table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    kind TEXT NOT NULL DEFAULT 'normal' CHECK (kind IN ('normal', 'liked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 2. Create Playlist Items Table
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    position DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
    track JSONB NOT NULL, -- snapshot: { source, sourceId, title, artist, durationSec, thumbnail }
    added_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 3. Create Optional User Settings Table (appearance/audio/shortcuts - NEVER secrets)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_kind ON public.playlists(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_playlists_updated_at ON public.playlists(updated_at);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_user_id ON public.playlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON public.playlist_items(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_items_updated ON public.playlist_items(added_at);

-- 5. Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_playlists_updated_at ON public.playlists;
CREATE TRIGGER set_playlists_updated_at
    BEFORE UPDATE ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Quota Enforcement Triggers: Max 200 playlists per user, Max 5000 items per playlist
CREATE OR REPLACE FUNCTION public.check_playlist_limits()
RETURNS TRIGGER AS $$
DECLARE
    playlist_count INT;
BEGIN
    SELECT COUNT(*) INTO playlist_count
    FROM public.playlists
    WHERE user_id = NEW.user_id AND deleted_at IS NULL;

    IF playlist_count >= 200 THEN
        RAISE EXCEPTION 'User has exceeded maximum allowed active playlists (200)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_playlist_limit ON public.playlists;
CREATE TRIGGER trg_check_playlist_limit
    BEFORE INSERT ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.check_playlist_limits();

CREATE OR REPLACE FUNCTION public.check_playlist_item_limits()
RETURNS TRIGGER AS $$
DECLARE
    item_count INT;
BEGIN
    SELECT COUNT(*) INTO item_count
    FROM public.playlist_items
    WHERE playlist_id = NEW.playlist_id AND deleted_at IS NULL;

    IF item_count >= 5000 THEN
        RAISE EXCEPTION 'Playlist has exceeded maximum allowed items (5,000)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_playlist_item_limit ON public.playlist_items;
CREATE TRIGGER trg_check_playlist_item_limit
    BEFORE INSERT ON public.playlist_items
    FOR EACH ROW
    EXECUTE FUNCTION public.check_playlist_item_limits();

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Playlists RLS: Users can only see and modify their own records
CREATE POLICY "Users can select own playlists"
    ON public.playlists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
    ON public.playlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
    ON public.playlists FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
    ON public.playlists FOR DELETE
    USING (auth.uid() = user_id);

-- Playlist Items RLS: Users can only see and modify their own items
CREATE POLICY "Users can select own playlist items"
    ON public.playlist_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlist items"
    ON public.playlist_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlist items"
    ON public.playlist_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlist items"
    ON public.playlist_items FOR DELETE
    USING (auth.uid() = user_id);

-- User Settings RLS
CREATE POLICY "Users can select own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 8. Storage Bucket for Playlist Covers
-- Inserts the playlist-covers bucket into storage.buckets if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('playlist-covers', 'playlist-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read access
CREATE POLICY "Public read for playlist covers"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'playlist-covers');

-- Storage RLS: Authenticated users can upload to their own user_id folder
CREATE POLICY "Users can upload their own playlist covers"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'playlist-covers' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can update their own playlist covers"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'playlist-covers' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own playlist covers"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'playlist-covers' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
