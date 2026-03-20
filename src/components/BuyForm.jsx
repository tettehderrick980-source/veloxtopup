import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import { paystackService } from '../services/paystack';

const NETWORKS = [
  { id: 'mtn', name: 'MTN', color: 'bg-yellow-500' },
  { id: 'airteltigo', name: 'AirtelTigo', color: 'bg-blue-500' },
  { id: 'vodafone', name: 'Vodafone', color: 'bg-red-500' }
];

const DATA_PLANS = {
  mtn: [
    { name: '1GB', amount: 5.00, validity: '24 hours' },
    { name: '2GB', amount: 10.00, validity: '24 hours' },
    { name: '5GB', amount: 20.00, validity: '24 hours' },
    { name: '10GB', amount: 35.00, validity: '30 days' },
    { name: '20GB', amount: 60.00, validity: '30 days' }
  ],
  airteltigo: [
    { name: '1GB', amount: 4.50, validity: '24 hours' },
    { name: '2GB', amount: 9.00, validity: '24 hours' },
    { name: '5GB', amount: 18.00, validity: '24 hours' },
    { name: '10GB', amount: 32.00, validity: '30 days' },
    { name: '20GB', amount: 55.00, validity: '30 days' }
  ],
  vodafone: [
    { name: '1GB', amount: 4.00, validity: '24 hours' },
    { name: '2GB', amount: 8.00, validity: '24 hours' },
    { name: '5GB', amount: 17.00, validity: '24 hours' },
    { name: '10GB', amount: 30.00, validity: '30 days' },
    { name: '20GB', amount: 50.00, validity: '30 days' }
  ]
};

const AIRTIME_AMOUNTS = [5, 10, 20, 50, 100];

export default function BuyForm() {
  const { wallet, deductFromWallet } = useWallet();
  const [type, setType] = useState('data'); // 'airtime' or 'data'
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedNetworkPlans = selectedNetwork ? DATA_PLANS[selectedNetwork] : [];
  const totalAmount = type === 'data' 
    ? selectedPlan ? selectedPlan.amount : 0
    : parseFloat(customAmount) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (!selectedNetwork) {
        throw new Error('Please select a network');
      }
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('Please enter a valid phone number');
      }
      if (totalAmount <= 0) {
        throw new Error('Please select a plan or enter an amount');
      }

      // Create transaction record with pending status
      const transactionData = {
        user_id: user.id,
        type,
        network: selectedNetwork,
        phone: phoneNumber,
        plan: type === 'data' ? selectedPlan.name : `GH₵${totalAmount}`,
        amount: totalAmount,
        status: 'pending_payment',
        reference: `VTU${Date.now()}`,
        created_at: new Date().toISOString()
      };

      const { data: transaction, error: transactionError } = await db.createTransaction(transactionData);
      if (transactionError) throw transactionError;

      // Initialize Paystack payment
      await paystackService.initializePayment({
        email: user.email,
        amount: totalAmount,
        metadata: {
          transaction_id: transaction.id,
          user_id: user.id,
          type: 'airtime_data_purchase',
          network: selectedNetwork,
          phone: phoneNumber,
          plan: type === 'data' ? selectedPlan.name : `GH₵${totalAmount}`
        },
        onSuccess: async (response) => {
          try {
            // Update transaction with payment reference
            await db.updateTransaction(transaction.id, {
              status: 'paid',
              payment_reference: response.reference,
              updated_at: new Date().toISOString()
            });

            setSuccess('Payment successful! Processing your purchase...');
            
            // Call Edge Function to process purchase
            const { data, error } = await supabase.functions.invoke('purchase-data', {
              body: {
                transactionId: transaction.id,
                type,
                network: selectedNetwork,
                phone: phoneNumber,
                amount: totalAmount,
                plan: type === 'data' ? selectedPlan : null
              }
            });

            if (error) throw error;

            setSuccess('Purchase completed successfully!');
            // Reset form
            setSelectedNetwork('');
            setPhoneNumber('');
            setCustomAmount('');
            setSelectedPlan(null);
            
          } catch (error) {
            console.error('Purchase processing error:', error);
            setError('Payment received but purchase failed. Please contact support.');
          }
        },
        onClose: () => {
          // Update transaction as cancelled
          db.updateTransaction(transaction.id, {
            status: 'cancelled',
            updated_at: new Date().toISOString()
          });
          setLoading(false);
        }
      });

    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  // Add user prop from AuthContext
  const { user } = useAuth();

  return (
    <div className="card max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Buy Airtime/Data</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Purchase Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType('airtime')}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                type === 'airtime'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              Airtime
            </button>
            <button
              type="button"
              onClick={() => setType('data')}
              className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                type === 'data'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              Data Bundle
            </button>
          </div>
        </div>

        {/* Network Selection */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Select Network
          </label>
          <div className="grid grid-cols-3 gap-4">
            {NETWORKS.map((network) => (
              <button
                key={network.id}
                type="button"
                onClick={() => setSelectedNetwork(network.id)}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  selectedNetwork === network.id
                    ? 'bg-primary-500 text-white ring-2 ring-primary-400'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                <div className={`w-3 h-3 ${network.color} rounded-full mx-auto mb-1`} />
                {network.name}
              </button>
            ))}
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="0234567890"
            className="input-field w-full"
            required
          />
        </div>

        {/* Plan/Amount Selection */}
        {type === 'data' ? (
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Select Data Plan
            </label>
            <div className="space-y-2">
              {selectedNetworkPlans.map((plan) => (
                <button
                  key={plan.name}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-4 rounded-lg border transition-all ${
                    selectedPlan === plan
                      ? 'border-primary-500 bg-dark-700'
                      : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="text-white font-medium">{plan.name}</div>
                      <div className="text-dark-400 text-sm">{plan.validity}</div>
                    </div>
                    <div className="text-primary-400 font-semibold">
                      GH₵{plan.amount.toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Enter Amount
            </label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {AIRTIME_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setCustomAmount(amount.toString())}
                  className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                    customAmount === amount.toString()
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  GH₵{amount}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Enter custom amount"
              className="input-field w-full"
              min="1"
              step="0.01"
              required
            />
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-dark-700 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-dark-300">Total Amount:</span>
            <span className="text-2xl font-bold text-primary-400">
              GH₵{totalAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-dark-400 text-sm">Payment Method:</span>
            <span className="text-dark-300">
              Paystack (Secure Payment)
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || totalAmount <= 0}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Pay with Paystack'}
        </button>
      </form>
    </div>
  );
}
