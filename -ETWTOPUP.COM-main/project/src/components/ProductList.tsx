import React, { useMemo } from 'react';
import { GameProduct } from '../types';
import { Check, ShoppingCart, Star, Sparkles, Flame, Crown } from 'lucide-react';

interface Props {
  products: GameProduct[];
  selectedProduct: GameProduct | null;
  onSelect: (product: GameProduct) => void;
  game: string; // Updated to include 'freefire_th'
}

export function ProductList({ products, selectedProduct, onSelect, game }: Props) {
  const isReseller = localStorage.getItem('jackstore_reseller_auth') === 'true';

  // Group products by type
  const groupedProducts = useMemo(() => {
    const groups = products.reduce((acc, product) => {
      const type = product.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(product);
      return acc;
    }, {} as Record<string, GameProduct[]>);

    // Sort diamonds packages by amount
    if (groups.diamonds) {
      groups.diamonds.sort((a, b) => (a.diamonds || 0) - (b.diamonds || 0));
    }

    return groups;
  }, [products]);

  // Helper function to get tagname icon
  const getTagIcon = (tagname: string) => {
    const lowercaseTag = tagname.toLowerCase();
    if (lowercaseTag.includes('hot')) return <Flame className="w-3 h-3" />;
    if (lowercaseTag.includes('best')) return <Star className="w-3 h-3" />;
    if (lowercaseTag.includes('new')) return <Sparkles className="w-3 h-3" />;
    if (lowercaseTag.includes('premium')) return <Crown className="w-3 h-3" />;
    return null;
  };

  const renderProductCard = (product: GameProduct) => (
    <div
      key={product.id}
      onClick={() => onSelect(product)}
      className={`relative group overflow-visible rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
        selectedProduct?.id === product.id
          ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50/10 to-yellow-100/5 ring-4 ring-yellow-400/20'
          : 'border border-white/10 hover:border-yellow-400/50 bg-white/5 hover:bg-white/10'
      }`}
    >
      {/* Tagname badge with dynamic styling */}
      {product.tagname && (
        <div className="absolute -top-3 left-0 right-0 z-20 flex justify-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-red-500 blur opacity-50 rounded-full"></div>
            <div className="relative bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap text-xs font-bold">
              {getTagIcon(product.tagname)}
              <span className="relative z-10">{product.tagname.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Product content with horizontal layout */}
      <div className={`p-2 flex flex-row items-center gap-2 ${product.tagname ? 'pt-6' : ''} h-16`}>
        {/* Product image with glow effect */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <img
            src={product.image || 'https://via.placeholder.com/40'}
            alt={product.name}
            className="w-10 h-10 rounded-lg object-cover transform group-hover:scale-110 transition-transform relative z-10"
            loading="lazy"
          />
          {selectedProduct?.id === product.id && (
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1 z-20 animate-bounce">
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>
        
        {/* Product details in a vertical stack */}
        <div className="text-left space-y-0.5 flex-1 overflow-hidden">
          <h3 className="font-medium text-xs text-white leading-tight truncate">{product.name}</h3>
          {product.diamonds && (
            <div className="flex items-center gap-1">
            </div>
          )}

          {/* Price section with animations */}
          <div className="space-y-0">
            {product.originalPrice && product.discountApplied && product.discountApplied > 0 ? (
              <p className="text-[10px] text-gray-400 line-through decoration-red-500/50">
                ${product.originalPrice.toFixed(2)}
              </p>
            ) : null}
            <p className="text-sm font-bold">
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && product.discountApplied && product.discountApplied > 0 && (
                <span className="text-[10px] text-green-400 ml-1">
                  (-{product.discountApplied}%)
                </span>
              )}
            </p>
            {isReseller && product.resellerPrice && (
              <p className="text-[10px] font-medium text-yellow-400/80">
                Reseller: ${product.resellerPrice.toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-1">
        <span className="text-xs text-white font-medium flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
          <ShoppingCart className="w-3 h-3" />
          Select Package
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">

            {/* Special Packages */}
      {groupedProducts.special && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            Special Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {groupedProducts.special.map(renderProductCard)}
          </div>
        </div>
      )}
      
      {/* Diamonds Packages */}
      {groupedProducts.diamonds && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
            </div>
            Diamond Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {groupedProducts.diamonds.map(renderProductCard)}
          </div>
        </div>
      )}

      {/* Subscription Packages */}
      {groupedProducts.subscription && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            Subscription Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {groupedProducts.subscription.map(renderProductCard)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-white/5 rounded-xl p-8 backdrop-blur-sm border border-white/10">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white text-lg font-medium">
              No products available for {
                game === 'mlbb' ? 'Mobile Legends' :
                game === 'mlbb_ph' ? 'Mobile Legends PH' :
                game === 'freefire' ? 'Free Fire' :
                'Free Fire TH' // Added Free Fire TH
              }.
            </p>
            <p className="text-gray-400 mt-2">
              Please check back later for new products.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
