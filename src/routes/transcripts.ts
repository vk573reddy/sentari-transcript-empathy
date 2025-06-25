// src/routes/transcripts.ts
// Transcript Processing API Routes for Supabase Integration
// Team: Sajandeep - Backend Developer

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../services/auth';
import { DiaryEntryService, AnalyticsService } from '../services/database';
import { processTranscriptWithSupabase } from '../pipeline-supabase';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Process new transcript
router.post('/process', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        message: 'Please login to process transcripts'
      });
    }

    const { transcript } = req.body;

    // Validation
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({
        error: 'Invalid transcript',
        message: 'Transcript text is required and must be a string'
      });
    }

    if (transcript.trim().length < 3) {
      return res.status(400).json({
        error: 'Transcript too short',
        message: 'Transcript must be at least 3 characters long'
      });
    }

    if (transcript.length > 5000) {
      return res.status(400).json({
        error: 'Transcript too long',
        message: 'Transcript must be less than 5000 characters'
      });
    }

    console.log(`📝 Processing transcript for user: ${req.user.id}`);

    // Process transcript through pipeline
    const result = await processTranscriptWithSupabase(transcript.trim(), req.user.id);

    res.status(201).json({
      success: true,
      message: 'Transcript processed successfully',
      data: {
        entry_id: result.entryId,
        response_text: result.response_text,
        carry_in: result.carry_in,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Process transcript error:', error);
    res.status(500).json({
      error: 'Processing failed',
      message: 'Unable to process transcript. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's transcript entries with pagination
router.get('/entries', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const orderBy = (req.query.order_by as 'created_at' | 'updated_at') || 'created_at';
    const order = (req.query.order as 'asc' | 'desc') || 'desc';

    console.log(`📖 Fetching entries for user: ${req.user.id}`);

    const entries = await DiaryEntryService.getUserEntries(
      req.user.id,
      limit,
      offset,
      orderBy,
      order
    );

    // Format response data
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      raw_text: entry.raw_text,
      response_text: entry.response_text,
      themes: entry.parsed_themes,
      vibes: entry.parsed_vibes,
      carry_in: entry.carry_in,
      word_count: entry.word_count,
      char_count: entry.char_count,
      created_at: entry.created_at,
      updated_at: entry.updated_at
    }));

    res.json({
      success: true,
      data: {
        entries: formattedEntries,
        pagination: {
          limit,
          offset,
          count: entries.length,
          has_more: entries.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch entries'
    });
  }
});

// Get specific entry by ID
router.get('/entries/:entryId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const { entryId } = req.params;

    if (!entryId) {
      return res.status(400).json({
        error: 'Invalid entry ID',
        message: 'Entry ID is required'
      });
    }

    console.log(`📄 Fetching entry: ${entryId} for user: ${req.user.id}`);

    const entry = await DiaryEntryService.getEntry(entryId, req.user.id);

    if (!entry) {
      return res.status(404).json({
        error: 'Entry not found',
        message: 'The requested entry does not exist or you do not have access to it'
      });
    }

    // Format detailed entry response
    const formattedEntry = {
      id: entry.id,
      raw_text: entry.raw_text,
      response_text: entry.response_text,
      parsed: {
        themes: entry.parsed_themes,
        vibes: entry.parsed_vibes,
        intent: entry.parsed_intent,
        subtext: entry.parsed_subtext,
        persona_traits: entry.parsed_persona_traits,
        buckets: entry.parsed_buckets
      },
      metadata: {
        word_count: entry.word_count,
        char_count: entry.char_count,
        top_words: entry.top_words,
        has_questions: entry.has_questions,
        has_exclamations: entry.has_exclamations,
        sentiment_indicators: entry.sentiment_indicators
      },
      carry_in: entry.carry_in,
      carry_in_similarity: entry.carry_in_similarity,
      created_at: entry.created_at,
      updated_at: entry.updated_at
    };

    res.json({
      success: true,
      data: {
        entry: formattedEntry
      }
    });

  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch entry'
    });
  }
});

// Search entries by text content
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const query = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Invalid search query',
        message: 'Search query must be at least 2 characters long'
      });
    }

    console.log(`🔍 Searching entries for user: ${req.user.id} with query: "${query}"`);

    const entries = await DiaryEntryService.searchEntries(req.user.id, query.trim(), limit);

    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      raw_text: entry.raw_text,
      response_text: entry.response_text,
      themes: entry.parsed_themes,
      vibes: entry.parsed_vibes,
      carry_in: entry.carry_in,
      created_at: entry.created_at,
      // Highlight search matches (basic implementation)
      excerpt: entry.raw_text.substring(0, 200) + (entry.raw_text.length > 200 ? '...' : '')
    }));

    res.json({
      success: true,
      data: {
        entries: formattedEntries,
        query,
        count: entries.length
      }
    });

  } catch (error) {
    console.error('Search entries error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to search entries'
    });
  }
});

// Get entries by date range
router.get('/entries/date-range', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing date parameters',
        message: 'Both start_date and end_date are required (YYYY-MM-DD format)'
      });
    }

    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Dates must be in YYYY-MM-DD format'
      });
    }

    if (startDateObj > endDateObj) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'Start date must be before end date'
      });
    }

    console.log(`📅 Fetching entries for user: ${req.user.id} from ${startDate} to ${endDate}`);

    const entries = await DiaryEntryService.getEntriesByDateRange(
      req.user.id,
      startDate,
      endDate + 'T23:59:59.999Z' // Include full end day
    );

    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      raw_text: entry.raw_text,
      response_text: entry.response_text,
      themes: entry.parsed_themes,
      vibes: entry.parsed_vibes,
      carry_in: entry.carry_in,
      created_at: entry.created_at
    }));

    res.json({
      success: true,
      data: {
        entries: formattedEntries,
        date_range: {
          start_date: startDate,
          end_date: endDate
        },
        count: entries.length
      }
    });

  } catch (error) {
    console.error('Get entries by date range error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch entries for date range'
    });
  }
});

// Delete entry
router.delete('/entries/:entryId', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const { entryId } = req.params;

    if (!entryId) {
      return res.status(400).json({
        error: 'Invalid entry ID',
        message: 'Entry ID is required'
      });
    }

    console.log(`🗑️ Deleting entry: ${entryId} for user: ${req.user.id}`);

    // Check if entry exists first
    const entry = await DiaryEntryService.getEntry(entryId, req.user.id);
    if (!entry) {
      return res.status(404).json({
        error: 'Entry not found',
        message: 'The requested entry does not exist or you do not have access to it'
      });
    }

    const success = await DiaryEntryService.deleteEntry(entryId, req.user.id);

    if (success) {
      res.json({
        success: true,
        message: 'Entry deleted successfully'
      });
    } else {
      res.status(500).json({
        error: 'Delete failed',
        message: 'Unable to delete entry'
      });
    }

  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to delete entry'
    });
  }
});

// Get user analytics and statistics
router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    console.log(`📊 Fetching analytics for user: ${req.user.id}`);

    const stats = await AnalyticsService.getUserStats(req.user.id);

    res.json({
      success: true,
      data: {
        analytics: stats
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch analytics'
    });
  }
});

export default router; 