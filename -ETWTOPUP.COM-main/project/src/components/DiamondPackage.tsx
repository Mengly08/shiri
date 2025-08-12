import React from 'react';
import { Diamond, Sparkles } from 'lucide-react';
import { DiamondPackage as DiamondPackageType } from '../types';

interface Props {
  pack: DiamondPackageType;
  selected: boolean;
  onSelect: (pack: DiamondPackageType) => void;
}

export function DiamondPackage({ pack, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(pack)}
      className={`${
        selected 
          ? 'border-pink-500 bg-gradient-to-br from-purple-50 to-pink-50 transform scale-105' 
          : 'border-purple-200 hover:border-pink-200 hover:transform hover:scale-102 bg-white'
      } border-2 rounded-2xl p-6 transition-all duration-300 flex flex-col items-center gap-4 w-full group relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative">
        <img 
          src={pack.image} 
          alt="Diamond Pack"
          className="w-16 h-16 rounded-xl"
        />
        {pack.bonus > 0 && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            +{pack.bonus}
          </div>
        )}
      </div>
      
      <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        {pack.diamonds} 💎
      </div>
      
      {pack.bonus > 0 && (
        <div className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
          +{pack.bonus} Bonus Diamonds
        </div>
      )}
      
      <div className="text-2xl font-bold text-purple-600">
        {pack.currency} {pack.price.toFixed(2)}
      </div>
    </button>
  );
}