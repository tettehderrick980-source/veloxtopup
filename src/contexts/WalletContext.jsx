import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWallet();
    } else {
      setWallet(null);
      setLoading(false);
    }
  }, [user]);

  const fetchWallet = async () => {
    try {
      const { data, error } = await db.getWallet(user.id);
      if (error) {
        console.error('Error fetching wallet:', error);
        // Create wallet if it doesn't exist
        const { data: newWallet } = await db.createWallet(user.id);
        setWallet(newWallet);
      } else {
        setWallet(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchWallet:', error);
      setLoading(false);
    }
  };

  const fundWallet = async (amount) => {
    try {
      // This will be called after successful Paystack payment verification
      const currentBalance = wallet?.balance || 0;
      const newBalance = currentBalance + amount;
      
      const { data, error } = await db.updateWalletBalance(user.id, newBalance);
      if (error) throw error;
      
      setWallet(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error funding wallet:', error);
      return { success: false, error };
    }
  };

  const deductFromWallet = async (amount) => {
    try {
      const currentBalance = wallet?.balance || 0;
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }
      
      const newBalance = currentBalance - amount;
      const { data, error } = await db.updateWalletBalance(user.id, newBalance);
      if (error) throw error;
      
      setWallet(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error deducting from wallet:', error);
      return { success: false, error };
    }
  };

  const refundToWallet = async (amount) => {
    try {
      const currentBalance = wallet?.balance || 0;
      const newBalance = currentBalance + amount;
      
      const { data, error } = await db.updateWalletBalance(user.id, newBalance);
      if (error) throw error;
      
      setWallet(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error refunding to wallet:', error);
      return { success: false, error };
    }
  };

  const refreshWallet = async () => {
    await fetchWallet();
  };

  const value = {
    wallet,
    loading,
    fundWallet,
    deductFromWallet,
    refundToWallet,
    refreshWallet
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
