// src/config/database.ts
// Supabase Database Configuration and Setup
// Team: Sajandeep - Backend Developer

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase clients
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Database schema interfaces
export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  top_themes: string[];
  theme_count: Record<string, number>;
  dominant_vibe: string;
  vibe_count: Record<string, number>;
  bucket_count: Record<string, number>;
  trait_pool: string[];
  last_theme: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  raw_text: string;
  embedding: number[];
  parsed_themes: string[];
  parsed_vibes: string[];
  parsed_intent: string;
  parsed_subtext: string;
  parsed_persona_traits: string[];
  parsed_buckets: string[];
  word_count: number;
  char_count: number;
  top_words: string[];
  has_questions: boolean;
  has_exclamations: boolean;
  sentiment_indicators: string[];
  carry_in: boolean;
  carry_in_similarity?: number;
  response_text: string;
  created_at: string;
  updated_at: string;
}

export interface InsightSummary {
  id: string;
  user_id: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  total_entries: number;
  dominant_themes: string[];
  dominant_vibes: string[];
  avg_sentiment_score: number;
  insights: string[];
  recommendations: string[];
  carry_in_frequency: number;
  created_at: string;
}

// SQL schema for Supabase setup
export const DATABASE_SCHEMA = `
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  top_themes TEXT[] DEFAULT '{}',
  theme_count JSONB DEFAULT '{}',
  dominant_vibe TEXT DEFAULT '',
  vibe_count JSONB DEFAULT '{}',
  bucket_count JSONB DEFAULT '{}',
  trait_pool TEXT[] DEFAULT '{}',
  last_theme TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create diary_entries table
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  embedding VECTOR(384), -- Using pgvector for embedding storage
  parsed_themes TEXT[] DEFAULT '{}',
  parsed_vibes TEXT[] DEFAULT '{}',
  parsed_intent TEXT DEFAULT '',
  parsed_subtext TEXT DEFAULT '',
  parsed_persona_traits TEXT[] DEFAULT '{}',
  parsed_buckets TEXT[] DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  char_count INTEGER DEFAULT 0,
  top_words TEXT[] DEFAULT '{}',
  has_questions BOOLEAN DEFAULT FALSE,
  has_exclamations BOOLEAN DEFAULT FALSE,
  sentiment_indicators TEXT[] DEFAULT '{}',
  carry_in BOOLEAN DEFAULT FALSE,
  carry_in_similarity FLOAT,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create insight_summaries table
CREATE TABLE IF NOT EXISTS insight_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_entries INTEGER DEFAULT 0,
  dominant_themes TEXT[] DEFAULT '{}',
  dominant_vibes TEXT[] DEFAULT '{}',
  avg_sentiment_score FLOAT DEFAULT 0.0,
  insights TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  carry_in_frequency FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_start)
);

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON diary_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_summaries_user_id ON insight_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_summaries_period ON insight_summaries(user_id, period_type, period_start);

-- Create embedding similarity index
CREATE INDEX IF NOT EXISTS idx_diary_entries_embedding ON diary_entries USING ivfflat (embedding vector_cosine_ops);

-- Row Level Security Policies

-- User profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Diary entries: Users can only access their own entries
CREATE POLICY "Users can view own diary entries" ON diary_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own diary entries" ON diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diary entries" ON diary_entries FOR UPDATE USING (auth.uid() = user_id);

-- Insight summaries: Users can only access their own insights
CREATE POLICY "Users can view own insights" ON insight_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own insights" ON insight_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_summaries ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diary_entries_updated_at BEFORE UPDATE ON diary_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Helper function to initialize database schema
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔧 Initializing database schema...');
    
    // Note: In production, run this SQL directly in Supabase SQL Editor
    // This is for reference and development setup
    console.log('Database schema prepared. Run the following SQL in your Supabase SQL Editor:');
    console.log(DATABASE_SCHEMA);
    
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
} 