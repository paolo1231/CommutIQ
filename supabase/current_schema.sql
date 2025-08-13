-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  subject_id uuid,
  title character varying NOT NULL,
  description text,
  difficulty_level character varying DEFAULT 'beginner'::character varying CHECK (difficulty_level::text = ANY (ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying]::text[])),
  estimated_duration integer,
  lesson_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT courses_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.lesson_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id uuid,
  interaction_type character varying NOT NULL,
  interaction_data jsonb NOT NULL,
  interaction_order integer NOT NULL,
  is_required boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_interactions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
);
CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid,
  title character varying NOT NULL,
  content text NOT NULL,
  audio_url text,
  duration integer,
  lesson_order integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  icon character varying,
  color character varying DEFAULT '#3B82F6'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text NOT NULL DEFAULT 'None'::text,
  is_premium boolean NOT NULL DEFAULT false,
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sync_state (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  device_id character varying NOT NULL,
  last_sync_at timestamp with time zone DEFAULT now(),
  sync_version integer DEFAULT 1,
  sync_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sync_state_pkey PRIMARY KEY (id),
  CONSTRAINT sync_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  device_id character varying NOT NULL,
  device_name character varying,
  device_type character varying,
  platform character varying,
  push_token text,
  is_active boolean DEFAULT true,
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_devices_pkey PRIMARY KEY (id),
  CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_interaction_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  interaction_id uuid,
  response_data jsonb NOT NULL,
  is_correct boolean,
  completed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_interaction_responses_pkey PRIMARY KEY (id),
  CONSTRAINT user_interaction_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT user_interaction_responses_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES public.lesson_interactions(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  commute_time integer NOT NULL DEFAULT 30 CHECK (commute_time >= 5 AND commute_time <= 240),
  last_active_at timestamp with time zone DEFAULT now(),
  preferences jsonb DEFAULT '{"autoPlay": true, "audioSpeed": 1.0, "downloadQuality": "standard", "backgroundPlayback": true, "notificationsEnabled": true}'::jsonb,
  subscription_tier text NOT NULL DEFAULT 'free'::text CHECK (subscription_tier = ANY (ARRAY['free'::text, 'premium'::text])),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  course_id uuid,
  lesson_id uuid,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent integer DEFAULT 0,
  last_position integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT user_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.user_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  subject_id uuid,
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT user_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT user_subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);