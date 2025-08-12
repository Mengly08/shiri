import React, { useState } from 'react';
import { Loader2, Tag, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateRequestSignature, validatePromoCode } from '../lib/security';

interface PromoCodeInputProps {
  onApply: (discount: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function PromoCodeInput({ onApply, onClear, disabled = false }: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);

    try {
      // Validate promo code format and amount
      if (!validatePromoCode(code.trim().toUpperCase(), 1)) {
        setError('Invalid promo code format');
        return;
      }

      // Generate request signature
      const timestamp = Date.now();
      const data = { code: code.trim().toUpperCase() };
      const signature = generateRequestSignature(data, timestamp);

      const { data: result, error } = await supabase
        .rpc('increment_promo_code_usage', {
          code_to_use: code.trim().toUpperCase()
        }, {
          headers: {
            'X-Request-Timestamp': timestamp.toString(),
            'X-Request-Signature': signature,
          }
        });

      if (error) throw error;

      const response = result[0];
      if (!response.success) {
        setError(response.message);
        return;
      }

      setAppliedDiscount(response.discount_percent);
      onApply(response.discount_percent);
    } catch (err) {
      console.error('Error applying promo code:', err);
      setError('Failed to apply promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearPromoCode = () => {
    setCode('');
    setError(null);
    setAppliedDiscount(null);
    onClear();
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              disabled={disabled || loading || appliedDiscount !== null}
              placeholder="Enter promo code"
              className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
              maxLength={12}
            />
          </div>
          {appliedDiscount ? (
            <button
              type="button"
              onClick={clearPromoCode}
              className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!code.trim() || loading || disabled}
              className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Apply'
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {appliedDiscount && (
        <div className="flex items-center gap-1 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>{appliedDiscount}% discount applied!</span>
        </div>
      )}
    </div>
  );
}
