import express from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../config/database.js';
import { logger, logUserAction } from '../utils/logger.js';

const router = express.Router();

// Validation rules
const signUpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .matches(/^(0[234]\d{8}|233[234]\d{8})$/)
    .withMessage('Invalid Ghanaian phone number'),
  body('referralCode')
    .optional()
    .isAlphanumeric()
    .isLength({ min: 6, max: 10 })
    .withMessage('Invalid referral code format')
];

const signInValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Helper function to generate referral code
const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// POST /api/v1/auth/signup - User registration
router.post('/signup', signUpValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email, password, phone, referralCode } = req.body;

  try {
    // Check if user already exists
    const { data: existingUser } = await db.getUserProfileByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user profile with referral code
    const profileData = {
      email,
      phone,
      role: 'user',
      referral_code: generateReferralCode(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: profile, error: profileError } = await db.createUserProfile(profileData);
    if (profileError) {
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    // Create wallet for user
    const { error: walletError } = await db.createWallet(profile.id);
    if (walletError) {
      logger.error(`Failed to create wallet for user ${profile.id}:`, walletError);
    }

    // Handle referral if provided
    if (referralCode) {
      await handleReferral(referralCode, profile.id);
    }

    logUserAction(profile.id, 'user_registered', {
      email,
      phone: phone.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2'),
      referralCode: referralCode || null
    });

    res.status(201).json({
      success: true,
      data: {
        user: profile,
        message: 'Registration successful! Please check your email to verify your account.'
      }
    });

  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// POST /api/v1/auth/signin - User login
router.post('/signin', signInValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  const { email, password } = req.body;

  try {
    // Get user profile
    const { data: user, error } = await db.getUserProfileByEmail(email);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // TODO: In a real implementation, you would verify the password here
    // For now, we'll assume the password is valid since we're using Supabase Auth
    // on the frontend

    logUserAction(user.id, 'user_signed_in', {
      email
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        message: 'Login successful'
      }
    });

  } catch (error) {
    logger.error('Signin error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
}));

// GET /api/v1/auth/profile/:userId - Get user profile
router.get('/profile/:userId', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await db.getUserProfile(userId);
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's wallet
    const { data: wallet } = await db.getWallet(userId);

    res.status(200).json({
      success: true,
      data: {
        user,
        wallet
      }
    });

  } catch (error) {
    logger.error(`Error fetching profile for user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
}));

// PUT /api/v1/auth/profile/:userId - Update user profile
router.put('/profile/:userId', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    delete updates.role; // Role updates should be done by admin only

    const { data: user, error } = await db.updateUserProfile(userId, updates);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    logUserAction(userId, 'profile_updated', updates);

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    logger.error(`Error updating profile for user ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
}));

// POST /api/v1/auth/referral/validate - Validate referral code
router.post('/referral/validate', asyncHandler(async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required'
      });
    }

    // Check if referral code exists and is valid
    const { data: referrer, error } = await db.getUserByReferralCode(referralCode);
    
    if (error || !referrer) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        referrer: {
          id: referrer.id,
          email: referrer.email
        }
      }
    });

  } catch (error) {
    logger.error('Error validating referral code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate referral code'
    });
  }
}));

// Helper function to handle referral
const handleReferral = async (referralCode, newUserId) => {
  try {
    // Find referrer
    const { data: referrer, error: referrerError } = await db.getUserByReferralCode(referralCode);
    
    if (referrerError || !referrer) {
      logger.warn(`Invalid referral code: ${referralCode}`);
      return;
    }

    // Create referral record
    const { error: referralError } = await db.createReferral(referrer.id, newUserId, 5.00);
    
    if (referralError) {
      logger.error('Error creating referral:', referralError);
      return;
    }

    // Credit referrer's wallet
    const { data: referrerWallet } = await db.getWallet(referrer.id);
    if (referrerWallet) {
      const newBalance = referrerWallet.balance + 5.00;
      await db.updateWalletBalance(referrer.id, newBalance);
      
      logUserAction(referrer.id, 'referral_bonus_received', {
        referredUser: newUserId,
        bonus: 5.00
      });
    }

    logUserAction(newUserId, 'referral_used', {
      referrerId: referrer.id,
      referralCode
    });

  } catch (error) {
    logger.error('Error handling referral:', error);
  }
};

// Add missing helper functions to db object
db.getUserProfileByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching user profile by email:', error);
    return { data: null, error };
  }
};

db.getUserByReferralCode = async (referralCode) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('referral_code', referralCode)
      .maybeSingle();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Error fetching user by referral code:', error);
    return { data: null, error };
  }
};

export default router;
