import storeConfig from '../config/store.json';
import { StoreConfig, GameConfig } from '../types';

export const getConfig = (): StoreConfig => {
  return storeConfig;
};

export const getGameConfig = (game: string): GameConfig => {
  return storeConfig.games[game];
};

export const getPaymentConfig = () => {
  return storeConfig.payment;
};

export const getAllGames = (): string[] => {
  return Object.keys(storeConfig.games);
};

export default storeConfig;
