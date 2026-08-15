-- Caster Applications Table (General / Legacy)
CREATE TABLE IF NOT EXISTS public.caster_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    bio TEXT,
    twitch_channel TEXT,
    youtube_channel TEXT,
    languages TEXT[] DEFAULT ARRAY['Español'],
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tournament Casters Table (Casters assigned / applied per tournament)
CREATE TABLE IF NOT EXISTS public.tournament_casters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    bio TEXT,
    twitch_channel TEXT,
    youtube_channel TEXT,
    languages TEXT[] DEFAULT ARRAY['Español'],
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tournament_id, user_id)
);

-- Official Casters Table (Global active caster profiles)
CREATE TABLE IF NOT EXISTS public.casters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    twitch_channel TEXT,
    youtube_channel TEXT,
    is_live BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Match Casters (Casters and streams assigned to matches)
CREATE TABLE IF NOT EXISTS public.match_casters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    caster_id UUID NOT NULL REFERENCES public.casters(id) ON DELETE CASCADE,
    stream_url TEXT,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(match_id, caster_id)
);

-- Alter matches to add schedule and maps if they do not exist
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS selected_maps TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS map_veto_id UUID;

-- Alter map_vetoes to add match_id if it does not exist
ALTER TABLE public.map_vetoes
ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.caster_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_casters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_casters ENABLE ROW LEVEL SECURITY;

-- Policies for tournament_casters
DROP POLICY IF EXISTS "Anyone can view tournament casters" ON public.tournament_casters;
CREATE POLICY "Anyone can view tournament casters" ON public.tournament_casters
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own tournament caster application" ON public.tournament_casters;
CREATE POLICY "Users can insert own tournament caster application" ON public.tournament_casters
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own tournament caster application" ON public.tournament_casters;
CREATE POLICY "Users can update own tournament caster application" ON public.tournament_casters
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Policies for caster_applications
DROP POLICY IF EXISTS "Public read approved casters" ON public.caster_applications;
CREATE POLICY "Public read approved casters" ON public.caster_applications
    FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users can view own application" ON public.caster_applications;
CREATE POLICY "Users can view own application" ON public.caster_applications
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own application" ON public.caster_applications;
CREATE POLICY "Users can insert own application" ON public.caster_applications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own application" ON public.caster_applications;
CREATE POLICY "Users can update own application" ON public.caster_applications
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Policies for casters
DROP POLICY IF EXISTS "Anyone can view casters" ON public.casters;
CREATE POLICY "Anyone can view casters" ON public.casters
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own caster profile" ON public.casters;
CREATE POLICY "Users can update own caster profile" ON public.casters
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Policies for match_casters
DROP POLICY IF EXISTS "Anyone can view match casters" ON public.match_casters;
CREATE POLICY "Anyone can view match casters" ON public.match_casters
    FOR SELECT USING (true);
