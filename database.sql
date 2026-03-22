-- Create tables
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'personal',
  phone TEXT,
  monthly_fee NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.professional_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  gym TEXT,
  base_time TEXT,
  frequency TEXT,
  plan_type TEXT, -- 'Mensalidade Fixa' or 'Valor por Aula'
  monthly_fee NUMERIC,
  session_fee NUMERIC,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.student_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE public.exercises_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_muscle TEXT,
  equipment TEXT,
  video_url TEXT,
  machine_number TEXT,
  sets INTEGER DEFAULT 3,
  reps TEXT DEFAULT '10-12',
  weight TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  notes TEXT,
  letter TEXT DEFAULT 'A',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises_library(id) ON DELETE CASCADE,
  sets INTEGER,
  reps TEXT,
  weight TEXT,
  machine_number TEXT
);

CREATE TABLE public.workout_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  letter TEXT DEFAULT 'A',
  muscle_group TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  total_sessions INTEGER,
  sessions_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.workout_plan_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises_library(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  letter TEXT, -- Added to explicitly store the plan letter on the exercise
  muscle_group TEXT,
  sets INTEGER,
  reps TEXT,
  weight TEXT,
  machine_number TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  letter TEXT DEFAULT 'A',
  active BOOLEAN DEFAULT true,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Professionals can read their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can manage professional profiles" ON public.profiles
  FOR ALL USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin');

CREATE POLICY "Professionals can read their own payments" ON public.professional_payments
  FOR SELECT USING (auth.uid() = professional_id);

CREATE POLICY "Super admins can manage professional payments" ON public.professional_payments
  FOR ALL USING (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin');

CREATE POLICY "Professionals can manage their own students" ON public.students
  FOR ALL USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can manage their own student payments" ON public.student_payments
  FOR ALL USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can manage their own exercises" ON public.exercises_library
  FOR ALL USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can manage their own workouts" ON public.workouts
  FOR ALL USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can manage their own workout exercises" ON public.workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id AND w.professional_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can manage their own workout plans" ON public.workout_plans
  FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Professionals can manage their own workout plan exercises" ON public.workout_plan_exercises
  FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Professionals can manage their own workout sessions" ON public.workout_sessions
  FOR ALL USING (auth.uid() = professional_id) WITH CHECK (auth.uid() = professional_id);

-- Trigger to create profile on user creation (Removed to allow manual insert)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to get all professionals (only accessible by super_admins)
CREATE OR REPLACE FUNCTION public.get_all_professionals()
RETURNS TABLE(id UUID, email TEXT, name TEXT, created_at TIMESTAMP WITH TIME ZONE, active BOOLEAN, monthly_fee NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the calling user has the 'super_admin' role in app_metadata
  IF coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied: User is not a super admin';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT, p.full_name, u.created_at, coalesce(p.active, true), coalesce(p.monthly_fee, 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id;
END;
$$;

-- Schema Synchronization (Run this if columns are missing)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'personal';
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
-- ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
-- ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS letter TEXT DEFAULT 'A';
-- ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
-- ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS muscle_group TEXT;
-- ALTER TABLE public.workout_plan_exercises ADD COLUMN IF NOT EXISTS muscle_group TEXT;
-- ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS letter TEXT DEFAULT 'A';
-- ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
-- ALTER TABLE public.workout_plan_exercises ADD COLUMN IF NOT EXISTS letter TEXT;
