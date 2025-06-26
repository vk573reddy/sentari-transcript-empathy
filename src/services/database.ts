// src/services/database.ts
// Database Service for Transcript and User Data Management
// Team: Sajandeep - Backend Developer

import { supabase, supabaseAdmin, UserProfile, DiaryEntry, InsightSummary } from '../config/database';
import { ParsedEntry, MetaData } from '../pipeline';

// User Profile Management
export class UserProfileService {
  
  // Get user profile by user ID
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log(`📋 Fetching profile for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('👤 No profile found for user');
          return null;
        }
        throw error;
      }

      console.log('✅ Profile retrieved successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      throw error;
    }
  }

  // Create user profile
  static async createProfile(userId: string, email: string, fullName?: string): Promise<UserProfile> {
    try {
      console.log(`📋 Creating profile for user: ${userId}`);
      
      const profileData = {
        user_id: userId,
        email,
        full_name: fullName || '',
        top_themes: [],
        theme_count: {},
        dominant_vibe: '',
        vibe_count: {},
        bucket_count: {},
        trait_pool: [],
        last_theme: ''
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Profile created successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      console.log(`📋 Updating profile for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Profile updated successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // Get user's entry count
  static async getEntryCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('diary_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('❌ Error getting entry count:', error);
      throw error;
    }
  }
}

// Diary Entry Management
export class DiaryEntryService {
  
  // Store new diary entry
  static async createEntry(
    userId: string,
    rawText: string,
    embedding: number[],
    parsed: ParsedEntry,
    metadata: MetaData,
    carryIn: boolean,
    carryInSimilarity: number | undefined,
    responseText: string
  ): Promise<DiaryEntry> {
    try {
      console.log(`📝 Creating diary entry for user: ${userId}`);
      
      const entryData = {
        user_id: userId,
        raw_text: rawText,
        embedding: embedding,
        parsed_themes: parsed.theme,
        parsed_vibes: parsed.vibe,
        parsed_intent: parsed.intent,
        parsed_subtext: parsed.subtext,
        parsed_persona_traits: parsed.persona_trait,
        parsed_buckets: parsed.bucket,
        word_count: metadata.word_count,
        char_count: metadata.char_count,
        top_words: metadata.top_words,
        has_questions: metadata.has_questions,
        has_exclamations: metadata.has_exclamations,
        sentiment_indicators: metadata.sentiment_indicators,
        carry_in: carryIn,
        carry_in_similarity: carryInSimilarity,
        response_text: responseText
      };

      const { data, error } = await supabase
        .from('diary_entries')
        .insert(entryData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Diary entry created successfully');
      return data as DiaryEntry;
    } catch (error) {
      console.error('❌ Error creating diary entry:', error);
      throw error;
    }
  }

  // Get user's diary entries with pagination
  static async getUserEntries(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    orderBy: 'created_at' | 'updated_at' = 'created_at',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<DiaryEntry[]> {
    try {
      console.log(`📖 Fetching diary entries for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .order(orderBy, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      console.log(`✅ Retrieved ${data.length} diary entries`);
      return data as DiaryEntry[];
    } catch (error) {
      console.error('❌ Error fetching diary entries:', error);
      throw error;
    }
  }

  // Get diary entry by ID
  static async getEntry(entryId: string, userId: string): Promise<DiaryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as DiaryEntry;
    } catch (error) {
      console.error('❌ Error fetching diary entry:', error);
      throw error;
    }
  }

  // Find similar entries using embedding similarity
  static async findSimilarEntries(
    userId: string,
    embedding: number[],
    threshold: number = 0.86,
    limit: number = 5
  ): Promise<DiaryEntry[]> {
    try {
      console.log(`🔍 Finding similar entries for user: ${userId}`);
      
      // Note: This requires pgvector extension and proper indexing
      // The actual SQL would use vector similarity functions
      const { data, error } = await supabase
        .rpc('find_similar_entries', {
          user_id: userId,
          query_embedding: embedding,
          similarity_threshold: threshold,
          match_count: limit
        });

      if (error) {
        console.warn('⚠️ Vector similarity search failed, falling back to theme matching');
        // Fallback to basic search if vector search fails
        return [];
      }

      console.log(`✅ Found ${data.length} similar entries`);
      return data as DiaryEntry[];
    } catch (error) {
      console.error('❌ Error finding similar entries:', error);
      return [];
    }
  }

  // Search entries by text content
  static async searchEntries(
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<DiaryEntry[]> {
    try {
      console.log(`🔍 Searching entries for user: ${userId} with query: "${query}"`);
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .or(`raw_text.ilike.%${query}%,response_text.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      console.log(`✅ Found ${data.length} entries matching query`);
      return data as DiaryEntry[];
    } catch (error) {
      console.error('❌ Error searching entries:', error);
      throw error;
    }
  }

  // Get entries by date range
  static async getEntriesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DiaryEntry[]> {
    try {
      console.log(`📅 Fetching entries for user: ${userId} from ${startDate} to ${endDate}`);
      
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`✅ Retrieved ${data.length} entries for date range`);
      return data as DiaryEntry[];
    } catch (error) {
      console.error('❌ Error fetching entries by date range:', error);
      throw error;
    }
  }

  // Delete diary entry
  static async deleteEntry(entryId: string, userId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting entry: ${entryId} for user: ${userId}`);
      
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log('✅ Entry deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting entry:', error);
      throw error;
    }
  }
}

// Insights Management
export class InsightsService {
  
  // Create insight summary
  static async createInsightSummary(
    userId: string,
    periodType: 'daily' | 'weekly' | 'monthly',
    periodStart: string,
    periodEnd: string,
    insights: any
  ): Promise<InsightSummary> {
    try {
      console.log(`💡 Creating ${periodType} insight summary for user: ${userId}`);
      
      const summaryData = {
        user_id: userId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        total_entries: insights.totalEntries || 0,
        dominant_themes: insights.dominantThemes || [],
        dominant_vibes: insights.dominantVibes || [],
        avg_sentiment_score: insights.avgSentimentScore || 0.0,
        insights: insights.insights || [],
        recommendations: insights.recommendations || [],
        carry_in_frequency: insights.carryInFrequency || 0.0
      };

      const { data, error } = await supabase
        .from('insight_summaries')
        .upsert(summaryData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('✅ Insight summary created successfully');
      return data as InsightSummary;
    } catch (error) {
      console.error('❌ Error creating insight summary:', error);
      throw error;
    }
  }

  // Get insight summaries for user
  static async getUserInsights(
    userId: string,
    periodType?: 'daily' | 'weekly' | 'monthly',
    limit: number = 10
  ): Promise<InsightSummary[]> {
    try {
      console.log(`💡 Fetching insights for user: ${userId}`);
      
      let query = supabase
        .from('insight_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('period_start', { ascending: false })
        .limit(limit);

      if (periodType) {
        query = query.eq('period_type', periodType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log(`✅ Retrieved ${data.length} insight summaries`);
      return data as InsightSummary[];
    } catch (error) {
      console.error('❌ Error fetching insights:', error);
      throw error;
    }
  }

  // Get latest insight for period type
  static async getLatestInsight(
    userId: string,
    periodType: 'daily' | 'weekly' | 'monthly'
  ): Promise<InsightSummary | null> {
    try {
      const { data, error } = await supabase
        .from('insight_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('period_type', periodType)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as InsightSummary;
    } catch (error) {
      console.error('❌ Error fetching latest insight:', error);
      throw error;
    }
  }
}

// Analytics and Statistics
export class AnalyticsService {
  
  // Get user statistics
  static async getUserStats(userId: string): Promise<any> {
    try {
      console.log(`📊 Fetching analytics for user: ${userId}`);
      
      // Get total entries
      const { count: totalEntries } = await supabase
        .from('diary_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get carry-in frequency
      const { count: carryInEntries } = await supabase
        .from('diary_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('carry_in', true);

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentEntries } = await supabase
        .from('diary_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get most common themes
      const { data: themeData } = await supabase
        .from('diary_entries')
        .select('parsed_themes')
        .eq('user_id', userId);

      const themeCount: Record<string, number> = {};
      themeData?.forEach(entry => {
        entry.parsed_themes?.forEach((theme: string) => {
          themeCount[theme] = (themeCount[theme] || 0) + 1;
        });
      });

      const topThemes = Object.entries(themeCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([theme, count]) => ({ theme, count }));

      const stats = {
        totalEntries: totalEntries || 0,
        carryInFrequency: totalEntries ? (carryInEntries || 0) / totalEntries : 0,
        recentActivity: recentEntries || 0,
        topThemes,
        averageWordsPerEntry: 0, // Calculate if needed
        streakDays: 0 // Calculate if needed
      };

      console.log('✅ Analytics fetched successfully');
      return stats;
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      throw error;
    }
  }
} 