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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
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

    return () => subscription.unsubscribe();
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
          role: 'user',
          referral_code: generateReferralCode(),
          created_at: new Date().toISOString()
        });
        
        if (createError) {
          console.error('Error creating user profile:', createError);
        } else {
          setUserProfile(newProfile);
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
          }
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
        if (profileError) throw profileError;

        // Handle referral if provided
        if (referralCode) {
          await handleReferral(referralCode, data.user.id);
        }

        // Create wallet
        await db.createWallet(data.user.id);
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
