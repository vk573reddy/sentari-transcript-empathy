// src/services/auth.ts
// Authentication Service for Supabase Integration
// Team: Sajandeep - Backend Developer

import { supabase, supabaseAdmin } from '../config/database';
import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// User registration
export async function registerUser(email: string, password: string, fullName?: string) {
  try {
    console.log(`📝 Registering new user: ${email}`);

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || ''
        }
      }
    });

    if (authError) {
      console.error('❌ Registration error:', authError.message);
      throw new Error(`Registration failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('User registration failed - no user data returned');
    }

    // Create user profile in our database
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: authData.user.email,
        full_name: fullName || '',
        top_themes: [],
        theme_count: {},
        dominant_vibe: '',
        vibe_count: {},
        bucket_count: {},
        trait_pool: [],
        last_theme: ''
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError.message);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('✅ User registered successfully');
    
    return {
      user: authData.user,
      session: authData.session
    };
  } catch (error) {
    console.error('❌ Registration error:', error);
    throw error;
  }
}

// User login
export async function loginUser(email: string, password: string) {
  try {
    console.log(`🔐 Logging in user: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Login error:', error.message);
      throw new Error(`Login failed: ${error.message}`);
    }

    if (!data.user || !data.session) {
      throw new Error('Login failed - no user data returned');
    }

    console.log('✅ User logged in successfully');
    
    return {
      user: data.user,
      session: data.session
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
}

// User logout
export async function logoutUser(accessToken: string) {
  try {
    console.log('🚪 Logging out user');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('❌ Logout error:', error.message);
      throw new Error(`Logout failed: ${error.message}`);
    }

    console.log('✅ User logged out successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Logout error:', error);
    throw error;
  }
}

// Get current user
export async function getCurrentUser(accessToken: string) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error) {
      throw new Error(`Get user failed: ${error.message}`);
    }

    return user;
  } catch (error) {
    console.error('❌ Get current user error:', error);
    throw error;
  }
}

// Refresh access token
export async function refreshToken(refreshToken: string) {
  try {
    console.log('🔄 Refreshing access token');

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      console.error('❌ Token refresh error:', error.message);
      throw new Error(`Token refresh failed: ${error.message}`);
    }

    console.log('✅ Token refreshed successfully');
    return data;
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    throw error;
  }
}

// Middleware to authenticate requests
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid access token in the Authorization header'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please login again to get a fresh token'
      });
    }

    // Add user to request object
    req.user = user as AuthUser;
    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
}

// Middleware to check if user has a complete profile
export async function requireCompleteProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user profile exists and is complete
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'Please complete your profile setup'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Profile check error:', error);
    return res.status(500).json({ 
      error: 'Profile validation error',
      message: 'Error checking user profile'
    });
  }
}

// Generate custom JWT for additional security (optional)
export function generateCustomJWT(payload: object): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options) as string;
}

// Verify custom JWT
export function verifyCustomJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}

// Password strength validation
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Error handler for auth routes
export function handleAuthError(error: any, res: Response) {
  console.error('Auth error:', error);
  
  if (error.message.includes('User already exists')) {
    return res.status(409).json({
      error: 'User already exists',
      message: 'An account with this email already exists'
    });
  }
  
  if (error.message.includes('Invalid login credentials')) {
    return res.status(401).json({
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });
  }
  
  if (error.message.includes('Email not confirmed')) {
    return res.status(401).json({
      error: 'Email not verified',
      message: 'Please check your email and click the verification link'
    });
  }
  
  // Generic error
  return res.status(500).json({
    error: 'Authentication error',
    message: 'An unexpected error occurred during authentication'
  });
} 