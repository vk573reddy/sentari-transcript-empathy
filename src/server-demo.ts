// src/server-demo.ts
// Demo Server for Sentari Transcript Empathy API
// Shows API structure without requiring real Supabase credentials

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Demo user data
const demoUsers = new Map();
const demoEntries = new Map();
let entryCounter = 1;

// Simple auth middleware for demo
function mockAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Demo mode: Use "Bearer demo-token" for authentication' 
    });
  }
  
  // Add user property to request object
  (req as any).user = { 
    id: 'demo-user-123', 
    email: 'demo@example.com' 
  };
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'demo',
    message: 'Sentari Transcript Empathy API Demo Server',
    timestamp: new Date().toISOString()
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'Sentari Transcript Empathy API',
    version: '1.0.0',
    mode: 'demo',
    description: 'AI-powered transcript processing with empathetic responses',
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/profile': 'Get user profile'
      },
      transcripts: {
        'POST /api/transcripts/process': 'Process a new transcript',
        'GET /api/transcripts/entries': 'Get user entries (paginated)',
        'GET /api/transcripts/entries/:id': 'Get specific entry',
        'GET /api/transcripts/search': 'Search entries'
      },
      insights: {
        'POST /api/insights/generate': 'Generate insights for a period',
        'GET /api/insights/summaries': 'Get insight summaries',
        'GET /api/insights/themes': 'Get theme analysis',
        'GET /api/insights/emotions': 'Get emotional analysis'
      }
    },
    demo_instructions: {
      authentication: 'Use "Bearer demo-token" in Authorization header',
      sample_transcript: 'Try: "I had a really tough day at work today. My boss criticized my project in front of everyone, and I felt so embarrassed. I just want to feel better about myself."'
    }
  });
});

// Auth routes (demo)
app.post('/api/auth/register', (req, res) => {
  const { email, password, full_name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  const userId = `demo-user-${Date.now()}`;
  demoUsers.set(userId, { id: userId, email, full_name, created_at: new Date() });
  
  res.status(201).json({
    success: true,
    message: 'Demo user registered',
    data: {
      user: { id: userId, email },
      access_token: 'demo-token-' + userId
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  res.json({
    success: true,
    message: 'Demo login successful',
    data: {
      user: { id: 'demo-user-123', email },
      access_token: 'demo-token',
      refresh_token: 'demo-refresh-token'
    }
  });
});

app.get('/api/auth/profile', mockAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    success: true,
    data: {
      profile: {
        id: user.id,
        email: user.email,
        full_name: 'Demo User',
        top_themes: ['work_stress', 'self_improvement', 'relationships'],
        dominant_vibe: 'reflective',
        entries_count: Array.from(demoEntries.values()).filter((e: any) => e.user_id === user.id).length
      }
    }
  });
});

// Transcript routes (demo)
app.post('/api/transcripts/process', mockAuth, (req, res) => {
  const { transcript } = req.body;
  const user = (req as any).user;
  
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript required' });
  }
  
  // Mock processing
  const entryId = `entry-${entryCounter++}`;
  const mockEntry = {
    id: entryId,
    user_id: user.id,
    raw_text: transcript,
    response_text: generateMockResponse(transcript),
    themes: extractMockThemes(transcript),
    vibes: extractMockVibes(transcript),
    carry_in: transcript.toLowerCase().includes('again') || transcript.toLowerCase().includes('still'),
    word_count: transcript.split(' ').length,
    created_at: new Date().toISOString()
  };
  
  demoEntries.set(entryId, mockEntry);
  
  res.status(201).json({
    success: true,
    message: 'Transcript processed successfully',
    data: {
      entry_id: entryId,
      response_text: mockEntry.response_text,
      carry_in: mockEntry.carry_in,
      processed_at: mockEntry.created_at
    }
  });
});

app.get('/api/transcripts/entries', mockAuth, (req, res) => {
  const user = (req as any).user;
  const userEntries = Array.from(demoEntries.values())
    .filter((entry: any) => entry.user_id === user.id)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
  res.json({
    success: true,
    data: {
      entries: userEntries,
      pagination: {
        limit: 20,
        offset: 0,
        count: userEntries.length,
        has_more: false
      }
    }
  });
});

app.get('/api/transcripts/entries/:entryId', mockAuth, (req, res) => {
  const user = (req as any).user;
  const entry = demoEntries.get(req.params.entryId);
  
  if (!entry || entry.user_id !== user.id) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  
  res.json({
    success: true,
    data: { entry }
  });
});

// Insights routes (demo)
app.get('/api/insights/themes', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      theme_analysis: {
        top_themes: [
          { theme: 'work_stress', count: 12, percentage: 35 },
          { theme: 'relationships', count: 8, percentage: 24 },
          { theme: 'self_improvement', count: 7, percentage: 21 },
          { theme: 'health_wellness', count: 5, percentage: 15 },
          { theme: 'family', count: 2, percentage: 5 }
        ],
        theme_trends: 'Work stress has been increasing over the past month',
        recommendations: [
          'Consider stress management techniques',
          'Schedule regular breaks during work',
          'Practice mindfulness exercises'
        ]
      }
    }
  });
});

app.get('/api/insights/emotions', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      emotion_analysis: {
        dominant_emotions: ['stressed', 'hopeful', 'reflective'],
        emotion_trends: {
          stress_level: 'moderate-high',
          positivity_trend: 'improving',
          emotional_stability: 'variable'
        },
        mood_patterns: 'Mornings tend to be more positive, evenings more reflective'
      }
    }
  });
});

// Helper functions for mock data
function generateMockResponse(transcript: string): string {
  const responses = [
    "I hear that you're going through a challenging time. It's completely understandable to feel this way when facing difficult situations. Your feelings are valid, and it takes strength to acknowledge them.",
    "Thank you for sharing something so personal. I can sense the weight of what you're experiencing. Please know that having these feelings doesn't define your worth - you're doing the best you can in a tough situation.",
    "I can feel the emotion in your words, and I want you to know that your experience matters. It's okay to feel overwhelmed sometimes. You're showing courage by expressing these feelings.",
    "What you're going through sounds really difficult. I appreciate you trusting me with these feelings. Remember that experiencing challenges doesn't make you weak - it makes you human."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function extractMockThemes(transcript: string): string[] {
  const themeMap: Record<string, string[]> = {
    work: ['work_stress', 'career_development'],
    boss: ['work_stress', 'authority_relationships'],
    family: ['family', 'relationships'],
    friend: ['relationships', 'social_support'],
    health: ['health_wellness', 'self_care'],
    stress: ['stress_management', 'mental_health'],
    happy: ['positive_emotions', 'gratitude'],
    sad: ['emotional_processing', 'mental_health']
  };
  
  const themes = new Set<string>();
  const lowerText = transcript.toLowerCase();
  
  Object.entries(themeMap).forEach(([keyword, themeList]) => {
    if (lowerText.includes(keyword)) {
      themeList.forEach(theme => themes.add(theme));
    }
  });
  
  return themes.size > 0 ? Array.from(themes) : ['general_reflection'];
}

function extractMockVibes(transcript: string): string[] {
  const vibeMap: Record<string, string> = {
    excited: 'energetic',
    happy: 'positive',
    sad: 'melancholic',
    angry: 'frustrated',
    stressed: 'anxious',
    calm: 'peaceful',
    worried: 'concerned',
    grateful: 'appreciative'
  };
  
  const vibes = new Set<string>();
  const lowerText = transcript.toLowerCase();
  
  Object.entries(vibeMap).forEach(([keyword, vibe]) => {
    if (lowerText.includes(keyword)) {
      vibes.add(vibe);
    }
  });
  
  return vibes.size > 0 ? Array.from(vibes) : ['reflective'];
}

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Demo server error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: 'Something went wrong in demo mode' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🎭 DEMO MODE - Sentari Transcript Empathy API');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔑 Demo Authentication: Use "Bearer demo-token" in Authorization header');
  console.log('💡 Try processing a transcript at: POST /api/transcripts/process');
  console.log('');
}); 