// src/routes/auth.ts
// Authentication API Routes for Supabase Integration
// Team: Sajandeep - Backend Developer

import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshToken,
  authenticateToken,
  validateEmail,
  validatePassword,
  handleAuthError,
  AuthRequest
} from '../services/auth';
import { UserProfileService } from '../services/database';

const router = Router();

// User Registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // Register user
    const result = await registerUser(email, password, fullName);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.user_metadata?.full_name
        },
        session: result.session
      }
    });

  } catch (error) {
    return handleAuthError(error, res);
  }
});

// User Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // Login user
    const result = await loginUser(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.user_metadata?.full_name
        },
        session: result.session
      }
    });

  } catch (error) {
    return handleAuthError(error, res);
  }
});

// User Logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await logoutUser(token);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    return handleAuthError(error, res);
  }
});

// Refresh Token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    const result = await refreshToken(refresh_token);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });

  } catch (error) {
    return handleAuthError(error, res);
  }
});

// Get Current User Profile
router.get('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        message: 'Please login to access your profile'
      });
    }

    // Get user profile from database
    const profile = await UserProfileService.getProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found',
        message: 'User profile does not exist'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.user_metadata?.full_name
        },
        profile: {
          top_themes: profile.top_themes,
          dominant_vibe: profile.dominant_vibe,
          trait_pool: profile.trait_pool,
          last_theme: profile.last_theme,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch user profile'
    });
  }
});

// Update User Profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated',
        message: 'Please login to update your profile'
      });
    }

    const { full_name, avatar_url } = req.body;

    // Prepare updates object
    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No updates provided',
        message: 'Please provide fields to update'
      });
    }

    // Update profile
    const updatedProfile = await UserProfileService.updateProfile(req.user.id, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: {
          full_name: updatedProfile.full_name,
          avatar_url: updatedProfile.avatar_url,
          updated_at: updatedProfile.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to update user profile'
    });
  }
});

// Get User Statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    // Get entry count
    const entryCount = await UserProfileService.getEntryCount(req.user.id);
    
    // Get profile for additional stats
    const profile = await UserProfileService.getProfile(req.user.id);

    const stats = {
      total_entries: entryCount,
      top_themes: profile?.top_themes || [],
      dominant_vibe: profile?.dominant_vibe || '',
      member_since: profile?.created_at || '',
      last_activity: profile?.updated_at || ''
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to fetch user statistics'
    });
  }
});

// Check if user exists (for registration validation)
router.post('/check-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // This is a simple check - in production you might want to limit this for security
    res.json({
      success: true,
      available: true, // For demo purposes, always return available
      message: 'Email is available for registration'
    });

  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Unable to check email availability'
    });
  }
});

export default router; 