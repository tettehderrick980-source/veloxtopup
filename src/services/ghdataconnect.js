/**
 * GhDataConnect API Service
 * All API calls go through Supabase Edge Functions to avoid CORS issues
 */

import { supabase } from '../lib/supabase';

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const cache = new Map();

export class GhDataConnectService {
  static async fetchAllNetworks(forceRefresh = false) {
    const cacheKey = 'networks_all';

    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const { data, error } = await supabase.functions.invoke('ghdataconnect-networks', {
      method: 'POST'
    });
    if (error) throw error;

    const networks = data?.data || [];
    cache.set(cacheKey, { data: networks, timestamp: Date.now() });
    return networks;
  }

  static async getWalletBalance(forceRefresh = false) {
    const cacheKey = 'wallet_balance';

    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }

    const { data, error } = await supabase.functions.invoke('ghdataconnect-balance', {
      method: 'POST'
    });
    if (error) throw error;

    const balance = data?.data?.balance || '0';
    cache.set(cacheKey, { data: balance, timestamp: Date.now() });
    return balance;
  }

  static clearCache() {
    cache.clear();
  }
}

export class PricingService {
  static calculateSellingPrice(costPrice, marginPercentage = 20) {
    return Number((costPrice * (1 + marginPercentage / 100)).toFixed(2));
  }

  static calculateProfit(costPrice, sellingPrice) {
    return Number((sellingPrice - costPrice).toFixed(2));
  }

  static applyMarginToBundles(bundles, marginPercentage = 20) {
    return bundles.map(bundle => {
      const costPrice = Number(bundle.price);
      const sellingPrice = this.calculateSellingPrice(costPrice, marginPercentage);
      return {
        ...bundle,
        id: bundle.id?.toString() || `${bundle.capacity}_${Date.now()}`,
        name: `${bundle.capacity}GB`,
        cost_price: costPrice,
        selling_price: sellingPrice,
        price: sellingPrice,
        margin_percentage: marginPercentage,
        profit: this.calculateProfit(costPrice, sellingPrice),
        validity: 'Unlimited',
        capacity: bundle.capacity
      };
    });
  }
}

export const GhDataConnectAPI = {
  async getPlansForNetwork(network) {
    const networks = await GhDataConnectService.fetchAllNetworks();
    const networkData = networks.find(n => n.key === network.toLowerCase());
    if (!networkData?.bundles?.length) throw new Error(`No bundles found for network: ${network}`);
    return PricingService.applyMarginToBundles(networkData.bundles);
  },

  async getAvailableNetworks() {
    const networks = await GhDataConnectService.fetchAllNetworks();
    return networks.map(n => ({
      key: n.key,
      name: n.name || n.key,
      bundlesCount: n.bundles?.length || 0,
      hasBundles: (n.bundles?.length || 0) > 0
    }));
  },

  clearCache() {
    GhDataConnectService.clearCache();
  }
};

export default GhDataConnectService;
