import React from 'react';
import { getConfig, getAllGames } from '../lib/config';

interface GameSelectorProps {
  onSelect: (game: string) => void;
}

export function GameSelector({ onSelect }: GameSelectorProps) {
  const config = getConfig();
  const games = getAllGames();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
      {games.map((gameId) => {
        const game = config.games[gameId];
        return (
          <div
            key={gameId}
            onClick={() => game.enabled && onSelect(gameId)}
            className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 text-white transition-all duration-300 group cursor-pointer ${
              game.enabled 
                ? 'hover:bg-white/20' 
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <img
              src={game.logoUrl}
              alt={game.name}
              className="w-16 h-16 rounded-xl mx-auto mb-2 transform group-hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=No+Image';
              }}
            />
            <h3 className="text-base font-semibold text-center">{game.name}</h3>
            <p className="text-xs text-center text-green-200 mt-1">{game.tagline}</p>
            
<div className={`mt-3 w-full py-2 px-4 rounded-lg text-sm font-medium text-center transition-all duration-300 ${
  game.enabled
    ? 'bg-orange-500 text-white hover:bg-orange-600 shadow shadow-black/50'
    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
}`}>
  {game.enabled ? 'Top Up Now' : 'អស់ស្តុក'}
</div>


          </div>
        );
      })}
    </div>
  );
}
