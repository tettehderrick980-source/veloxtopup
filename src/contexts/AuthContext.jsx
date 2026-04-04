import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, db } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] Loading timeout reached, forcing loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second max loading time

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[Auth] getSession error:', error);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('[Auth] getSession exception:', error);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await db.getUserProfile(userId);
      if (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
        return;
      }
      
      if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await db.createUserProfile({
          id: userId,
          email: user?.email,
          phone: user?.phone || '',
          role: user?.user_metadata?.role || 'user',
          referral_code: generateReferralCode(),
          created_at: new Date().toISOString()
        });
        
        if (createError) {
          // If profile already exists (409), just fetch it
          if (createError.code === '409') {
            const { data: existingProfile } = await db.getUserProfile(userId);
            setUserProfile(existingProfile);
          } else {
            console.error('Error creating user profile:', createError);
          }
          setLoading(false); // Always set loading false after handling create error
        } else {
          setUserProfile(newProfile);
          setLoading(false); // Always set loading false after handling create error
          // Try to create wallet (may fail if already exists)
          await db.createWallet(userId).catch(() => {});
        }
      } else {
        setUserProfile(data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const signUp = async (email, password, phone, referralCode = null) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        const profileData = {
          id: data.user.id,
          email: data.user.email,
          phone,
          role: 'user',
          referral_code: generateReferralCode(),
          created_at: new Date().toISOString()
        };

        const { data: profile, error: profileError } = await db.createUserProfile(profileData);
        if (profileError) {
          // If profile already exists (409), that's ok - continue
          if (profileError.code !== '409') {
            console.log('Profile might already exist, continuing...');
          }
        }

        // Handle referral if provided
        if (referralCode) {
          await handleReferral(referralCode, data.user.id).catch(() => {});
        }

        // Create wallet (ignore if already exists)
        await db.createWallet(data.user.id).catch(() => {});
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleReferral = async (referralCode, newUserId) => {
    try {
      // Find referrer
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single();

      if (referrerError || !referrer) return;

      // Create referral record
      await db.createReferral(referrer.id, newUserId, 5.00); // 5 GHS bonus

      // Credit referrer's wallet
      const { data: referrerWallet } = await db.getWallet(referrer.id);
      if (referrerWallet) {
        await db.updateWalletBalance(referrer.id, referrerWallet.balance + 5.00);
      }
    } catch (error) {
      console.error('Error handling referral:', error);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
