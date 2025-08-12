import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PopupBannerProps {
  image: string;
  onClose: () => void;
}

export function PopupBanner({ image, onClose }: PopupBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Preload the image
    const img = new Image();
    img.src = image;

    // Show popup after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300); // Reduced delay to 300ms

    return () => clearTimeout(timer);
  }, [image]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="relative max-w-2xl w-full animate-fade-up">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <img 
          src={image} 
          alt="Special Promotion" 
          className="w-full h-auto rounded-lg shadow-2xl"
          loading="eager" // Ensure the image loads eagerly
        />
      </div>
    </div>
  );
}
