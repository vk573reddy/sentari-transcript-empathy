// src/routes/insights.ts
// Insights and Analytics API Routes for Supabase Integration
// Team: Sajandeep - Backend Developer

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../services/auth';
import { InsightsService, DiaryEntryService, AnalyticsService } from '../services/database';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Generate insights for a specific period
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const { period_type, start_date, end_date } = req.body;

    // Validation
    if (!period_type || !['daily', 'weekly', 'monthly'].includes(period_type)) {
      return res.status(400).json({
        error: 'Invalid period type',
        message: 'Period type must be one of: daily, weekly, monthly'
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing date parameters',
        message: 'Both start_date and end_date are required'
      });
    }

    console.log(`💡 Generating ${period_type} insights for user: ${req.user.id}`);

    // Get entries for the specified period
    const entries = await DiaryEntryService.getEntriesByDateRange(
      req.user.id,
      start_date,
      end_date
    );

    if (entries.length === 0) {
      return res.status(404).json({
        error: 'No entries found',
        message: 'No diary entries found for the specified period'
      });
    }

    // Analyze entries to generate insights
    const insights = await generatePeriodInsights(entries);

    // Save insights to database
    const insightSummary = await InsightsService.createInsightSummary(
      req.user.id,
      period_type,
      start_date,
      end_date,
      insights
    );

    res.status(201).json({
      success: true,
      message: 'Insights generated successfully',
      data: {
        insight_summary: insightSummary
      }
    });

  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to generate insights'
    });
  }
});

// Get user's insight summaries
router.get('/summaries', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const periodType = req.query.period_type as 'daily' | 'weekly' | 'monthly' | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    console.log(`💡 Fetching insight summaries for user: ${req.user.id}`);

    const summaries = await InsightsService.getUserInsights(req.user.id, periodType, limit);

    res.json({
      success: true,
      data: {
        summaries,
        count: summaries.length
      }
    });

  } catch (error) {
    console.error('Get insight summaries error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch insight summaries'
    });
  }
});

// Get latest insight for specific period type
router.get('/latest/:periodType', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const { periodType } = req.params;

    if (!['daily', 'weekly', 'monthly'].includes(periodType)) {
      return res.status(400).json({
        error: 'Invalid period type',
        message: 'Period type must be one of: daily, weekly, monthly'
      });
    }

    console.log(`💡 Fetching latest ${periodType} insight for user: ${req.user.id}`);

    const latestInsight = await InsightsService.getLatestInsight(
      req.user.id,
      periodType as 'daily' | 'weekly' | 'monthly'
    );

    if (!latestInsight) {
      return res.status(404).json({
        error: 'No insights found',
        message: `No ${periodType} insights found for this user`
      });
    }

    res.json({
      success: true,
      data: {
        insight: latestInsight
      }
    });

  } catch (error) {
    console.error('Get latest insight error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch latest insight'
    });
  }
});

// Get user's theme analysis
router.get('/themes', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const days = parseInt(req.query.days as string) || 30;

    console.log(`🎯 Analyzing themes for user: ${req.user.id} (last ${days} days)`);

    // Get recent entries
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const entries = await DiaryEntryService.getEntriesByDateRange(
      req.user.id,
      cutoffDate.toISOString(),
      new Date().toISOString()
    );

    // Analyze themes
    const themeAnalysis = analyzeThemes(entries);

    res.json({
      success: true,
      data: {
        theme_analysis: themeAnalysis,
        period_days: days,
        entries_analyzed: entries.length
      }
    });

  } catch (error) {
    console.error('Get theme analysis error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to analyze themes'
    });
  }
});

// Get user's emotional patterns
router.get('/emotions', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const days = parseInt(req.query.days as string) || 30;

    console.log(`😊 Analyzing emotions for user: ${req.user.id} (last ${days} days)`);

    // Get recent entries
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const entries = await DiaryEntryService.getEntriesByDateRange(
      req.user.id,
      cutoffDate.toISOString(),
      new Date().toISOString()
    );

    // Analyze emotions
    const emotionalAnalysis = analyzeEmotions(entries);

    res.json({
      success: true,
      data: {
        emotional_analysis: emotionalAnalysis,
        period_days: days,
        entries_analyzed: entries.length
      }
    });

  } catch (error) {
    console.error('Get emotional analysis error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to analyze emotions'
    });
  }
});

// Get personalized recommendations
router.get('/recommendations', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    console.log(`🎯 Generating recommendations for user: ${req.user.id}`);

    // Get recent entries for analysis
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14); // Last 2 weeks

    const entries = await DiaryEntryService.getUserEntries(req.user.id, 50);
    
    // Generate personalized recommendations
    const recommendations = generateRecommendations(entries);

    res.json({
      success: true,
      data: {
        recommendations,
        generated_at: new Date().toISOString(),
        based_on_entries: entries.length
      }
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to generate recommendations'
    });
  }
});

// Get carry-in patterns analysis
router.get('/carry-in-patterns', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const days = parseInt(req.query.days as string) || 30;

    console.log(`🔄 Analyzing carry-in patterns for user: ${req.user.id}`);

    // Get recent entries
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const entries = await DiaryEntryService.getEntriesByDateRange(
      req.user.id,
      cutoffDate.toISOString(),
      new Date().toISOString()
    );

    // Analyze carry-in patterns
    const carryInAnalysis = analyzeCarryInPatterns(entries);

    res.json({
      success: true,
      data: {
        carry_in_analysis: carryInAnalysis,
        period_days: days,
        entries_analyzed: entries.length
      }
    });

  } catch (error) {
    console.error('Get carry-in patterns error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to analyze carry-in patterns'
    });
  }
});

// Helper functions for analysis

async function generatePeriodInsights(entries: any[]): Promise<any> {
  const totalEntries = entries.length;
  
  // Analyze themes
  const themeCount: Record<string, number> = {};
  entries.forEach(entry => {
    entry.parsed_themes?.forEach((theme: string) => {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
    });
  });

  // Analyze vibes
  const vibeCount: Record<string, number> = {};
  entries.forEach(entry => {
    entry.parsed_vibes?.forEach((vibe: string) => {
      vibeCount[vibe] = (vibeCount[vibe] || 0) + 1;
    });
  });

  // Get dominant themes and vibes
  const dominantThemes = Object.entries(themeCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([theme]) => theme);

  const dominantVibes = Object.entries(vibeCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([vibe]) => vibe);

  // Calculate carry-in frequency
  const carryInEntries = entries.filter(entry => entry.carry_in).length;
  const carryInFrequency = totalEntries > 0 ? carryInEntries / totalEntries : 0;

  // Generate insights
  const insights = [];
  const recommendations = [];

  if (dominantThemes.includes('work-life balance')) {
    insights.push('Work-life balance is a recurring theme in your reflections');
    recommendations.push('Consider setting boundaries between work and personal time');
  }

  if (dominantVibes.includes('anxious')) {
    insights.push('You\'ve been experiencing anxiety frequently');
    recommendations.push('Try mindfulness exercises or breathing techniques');
  }

  if (carryInFrequency > 0.5) {
    insights.push('You often revisit similar themes, showing deep reflection');
    recommendations.push('Consider journaling about solutions or next steps');
  }

  // Calculate average sentiment score (simplified)
  const avgSentimentScore = calculateAverageSentiment(entries);

  return {
    totalEntries,
    dominantThemes,
    dominantVibes,
    avgSentimentScore,
    insights,
    recommendations,
    carryInFrequency
  };
}

function analyzeThemes(entries: any[]): any {
  const themeCount: Record<string, number> = {};
  const themesByDate: Record<string, string[]> = {};

  entries.forEach(entry => {
    const date = entry.created_at.split('T')[0];
    entry.parsed_themes?.forEach((theme: string) => {
      themeCount[theme] = (themeCount[theme] || 0) + 1;
      if (!themesByDate[date]) themesByDate[date] = [];
      themesByDate[date].push(theme);
    });
  });

  const topThemes = Object.entries(themeCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([theme, count]) => ({ theme, count, percentage: (count / entries.length) * 100 }));

  return {
    top_themes: topThemes,
    theme_distribution: themeCount,
    themes_by_date: themesByDate,
    total_unique_themes: Object.keys(themeCount).length
  };
}

function analyzeEmotions(entries: any[]): any {
  const vibeCount: Record<string, number> = {};
  const emotionsByDate: Record<string, string[]> = {};

  entries.forEach(entry => {
    const date = entry.created_at.split('T')[0];
    entry.parsed_vibes?.forEach((vibe: string) => {
      vibeCount[vibe] = (vibeCount[vibe] || 0) + 1;
      if (!emotionsByDate[date]) emotionsByDate[date] = [];
      emotionsByDate[date].push(vibe);
    });
  });

  const emotionalSpectrum = Object.entries(vibeCount)
    .sort(([,a], [,b]) => b - a)
    .map(([emotion, count]) => ({ emotion, count, percentage: (count / entries.length) * 100 }));

  // Categorize emotions
  const positiveEmotions = ['happy', 'excited', 'motivated', 'joyful'];
  const negativeEmotions = ['anxious', 'frustrated', 'sad', 'melancholic'];
  const neutralEmotions = ['neutral', 'contemplative', 'reflective'];

  const emotionalBalance = {
    positive: positiveEmotions.reduce((sum, emotion) => sum + (vibeCount[emotion] || 0), 0),
    negative: negativeEmotions.reduce((sum, emotion) => sum + (vibeCount[emotion] || 0), 0),
    neutral: neutralEmotions.reduce((sum, emotion) => sum + (vibeCount[emotion] || 0), 0)
  };

  return {
    emotional_spectrum: emotionalSpectrum,
    emotions_by_date: emotionsByDate,
    emotional_balance: emotionalBalance,
    dominant_emotion: emotionalSpectrum[0]?.emotion || 'neutral'
  };
}

function generateRecommendations(entries: any[]): any[] {
  const recommendations = [];

  // Analyze recent patterns
  const recentThemes = entries.slice(0, 10).flatMap(entry => entry.parsed_themes || []);
  const recentVibes = entries.slice(0, 10).flatMap(entry => entry.parsed_vibes || []);

  // Work-life balance recommendations
  if (recentThemes.includes('work-life balance')) {
    recommendations.push({
      category: 'Work-Life Balance',
      suggestion: 'Schedule regular breaks and set clear work boundaries',
      priority: 'high',
      actionable: true
    });
  }

  // Emotional wellness recommendations
  if (recentVibes.includes('anxious') || recentVibes.includes('stressed')) {
    recommendations.push({
      category: 'Emotional Wellness',
      suggestion: 'Practice deep breathing exercises or try meditation',
      priority: 'high',
      actionable: true
    });
  }

  // Relationship recommendations
  if (recentThemes.includes('relationships') || recentThemes.includes('family')) {
    recommendations.push({
      category: 'Relationships',
      suggestion: 'Schedule quality time with loved ones',
      priority: 'medium',
      actionable: true
    });
  }

  // Personal growth recommendations
  if (recentVibes.includes('motivated') || recentThemes.includes('learning')) {
    recommendations.push({
      category: 'Personal Growth',
      suggestion: 'Set small, achievable goals for continuous improvement',
      priority: 'medium',
      actionable: true
    });
  }

  // Default recommendation if no specific patterns
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'General Wellness',
      suggestion: 'Continue your reflective practice and stay mindful',
      priority: 'low',
      actionable: true
    });
  }

  return recommendations;
}

function analyzeCarryInPatterns(entries: any[]): any {
  const carryInEntries = entries.filter(entry => entry.carry_in);
  const totalEntries = entries.length;
  const carryInFrequency = totalEntries > 0 ? carryInEntries.length / totalEntries : 0;

  // Analyze what themes tend to carry in
  const carryInThemes: Record<string, number> = {};
  carryInEntries.forEach(entry => {
    entry.parsed_themes?.forEach((theme: string) => {
      carryInThemes[theme] = (carryInThemes[theme] || 0) + 1;
    });
  });

  const topCarryInThemes = Object.entries(carryInThemes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([theme, count]) => ({ theme, count }));

  return {
    carry_in_frequency: carryInFrequency,
    total_carry_in_entries: carryInEntries.length,
    top_carry_in_themes: topCarryInThemes,
    insight: carryInFrequency > 0.5 
      ? 'You frequently revisit themes, showing deep engagement with important topics'
      : 'You explore diverse topics without much repetition'
  };
}

function calculateAverageSentiment(entries: any[]): number {
  // Simplified sentiment calculation based on vibes
  const positiveVibes = ['happy', 'excited', 'motivated', 'joyful'];
  const negativeVibes = ['anxious', 'frustrated', 'sad', 'melancholic'];

  let sentimentSum = 0;
  let sentimentCount = 0;

  entries.forEach(entry => {
    entry.parsed_vibes?.forEach((vibe: string) => {
      if (positiveVibes.includes(vibe)) {
        sentimentSum += 1;
        sentimentCount += 1;
      } else if (negativeVibes.includes(vibe)) {
        sentimentSum -= 1;
        sentimentCount += 1;
      }
    });
  });

  return sentimentCount > 0 ? sentimentSum / sentimentCount : 0;
}

export default router; 