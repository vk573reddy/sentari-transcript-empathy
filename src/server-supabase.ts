// src/server-supabase.ts
// Enhanced Supabase-Integrated Web Server
// Team: Sajandeep - Backend Developer

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkDatabaseConnection, initializeDatabase } from './config/database';

// Import route modules
import authRoutes from './routes/auth';
import transcriptRoutes from './routes/transcripts';
import insightRoutes from './routes/insights';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function for error handling
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/insights', insightRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: getErrorMessage(error)
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Sentari Transcript Empathy API',
    version: '2.0.0',
    description: 'Supabase-powered AI empathy processing pipeline',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/logout': 'User logout',
        'POST /api/auth/refresh': 'Refresh access token',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'GET /api/auth/stats': 'Get user statistics'
      },
      transcripts: {
        'POST /api/transcripts/process': 'Process new transcript',
        'GET /api/transcripts/entries': 'Get user entries (paginated)',
        'GET /api/transcripts/entries/:id': 'Get specific entry',
        'GET /api/transcripts/search': 'Search entries',
        'GET /api/transcripts/entries/date-range': 'Get entries by date range',
        'DELETE /api/transcripts/entries/:id': 'Delete entry',
        'GET /api/transcripts/analytics': 'Get user analytics'
      },
      insights: {
        'POST /api/insights/generate': 'Generate period insights',
        'GET /api/insights/summaries': 'Get insight summaries',
        'GET /api/insights/latest/:periodType': 'Get latest insight',
        'GET /api/insights/themes': 'Get theme analysis',
        'GET /api/insights/emotions': 'Get emotional patterns',
        'GET /api/insights/recommendations': 'Get personalized recommendations',
        'GET /api/insights/carry-in-patterns': 'Get carry-in patterns'
      }
    },
    authentication: 'Bearer token required for most endpoints',
    database: 'Supabase PostgreSQL with Row Level Security'
  });
});

// Simple web interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sentari Supabase API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
            h1 { color: #333; text-align: center; }
            .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { font-weight: bold; color: #007bff; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧩 Sentari Supabase API</h1>
            <p>Enhanced transcript empathy processing with Supabase backend</p>
            
            <h3>🔐 Authentication Endpoints</h3>
            <div class="endpoint">
                <span class="method">POST</span> /api/auth/register - Register new user
            </div>
            <div class="endpoint">
                <span class="method">POST</span> /api/auth/login - User login
            </div>
            
            <h3>📝 Transcript Endpoints</h3>
            <div class="endpoint">
                <span class="method">POST</span> /api/transcripts/process - Process transcript
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /api/transcripts/entries - Get user entries
            </div>
            
            <h3>💡 Insights Endpoints</h3>
            <div class="endpoint">
                <span class="method">GET</span> /api/insights/recommendations - Get recommendations
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /api/insights/themes - Analyze themes
            </div>
            
            <h3>📊 System</h3>
            <div class="endpoint">
                <span class="method">GET</span> /api/health - Health check
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /api/docs - Full documentation
            </div>
        </div>
    </body>
    </html>
  `);
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Supabase-integrated Sentari server...');
    
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    
    if (dbConnected) {
      console.log('✅ Database connection verified');
    } else {
      console.warn('⚠️ Database connection failed - some features may not work');
    }
    
    // Initialize database if needed
    if (process.env.INIT_DATABASE === 'true') {
      await initializeDatabase();
    }
    
    app.listen(PORT, () => {
      console.log(`🌟 Server running on http://localhost:${PORT}`);
      console.log('📚 API Documentation: http://localhost:' + PORT + '/api/docs');
      console.log('🔍 Health Check: http://localhost:' + PORT + '/api/health');
      console.log('🧩 Enhanced Features:');
      console.log('  ✅ Supabase Authentication');
      console.log('  ✅ PostgreSQL Storage with RLS');
      console.log('  ✅ Vector Similarity Search');
      console.log('  ✅ Rich Analytics & Insights');
      console.log('  ✅ RESTful API Endpoints');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app; 