/*
  # Update reseller prices for MLBB and Free Fire products

  1. Changes
    - Update reseller prices for Mobile Legends products
    - Update reseller prices for Free Fire products
    - Add missing reseller prices for products
  
  This migration updates the pricing structure for resellers to reflect the new
  pricing strategy. All prices are in USD.
*/

-- First, delete existing reseller prices to avoid duplicates
DELETE FROM reseller_prices;

-- Insert updated MLBB reseller prices
INSERT INTO reseller_prices (product_id, game, price)
VALUES
  -- Mobile Legends Diamonds
  (1, 'mlbb', 0.18),  -- 11 Diamonds
  (2, 'mlbb', 0.34),  -- 22 Diamonds
  (3, 'mlbb', 0.83),  -- 56 Diamonds
  (4, 'mlbb', 1.05),  -- 86 Diamonds
  (5, 'mlbb', 2.09),  -- 172 Diamonds
  (6, 'mlbb', 3.04),  -- 257 Diamonds
  (7, 'mlbb', 4.09),  -- 343 Diamonds
  (8, 'mlbb', 5.12),  -- 429 Diamonds
  (9, 'mlbb', 6.07),  -- 514 Diamonds
  (10, 'mlbb', 7.12), -- 600 Diamonds
  (11, 'mlbb', 8.21), -- 706 Diamonds
  (12, 'mlbb', 9.26), -- 792 Diamonds
  (13, 'mlbb', 10.29), -- 878 Diamonds
  (14, 'mlbb', 11.24), -- 963 Diamonds
  (15, 'mlbb', 12.30), -- 1049 Diamonds
  (16, 'mlbb', 13.33), -- 1135 Diamonds
  (17, 'mlbb', 14.28), -- 1220 Diamonds
  (18, 'mlbb', 16.42), -- 1412 Diamonds
  (19, 'mlbb', 20.50), -- 1755 Diamonds
  (20, 'mlbb', 24.85), -- 2195 Diamonds
  (21, 'mlbb', 33.17), -- 2901 Diamonds
  (22, 'mlbb', 41.45), -- 3688 Diamonds
  (23, 'mlbb', 49.70), -- 4390 Diamonds
  (24, 'mlbb', 62.59), -- 5532 Diamonds
  (25, 'mlbb', 103.95), -- 9288 Diamonds
  
  -- Mobile Legends Subscriptions and Special Items
  (26, 'mlbb', 1.30), -- Weekly Pass (wkp)
  (27, 'mlbb', 2.60), -- 2Weekly Pass (wkp2)
  (28, 'mlbb', 3.90), -- 3Weekly Pass (wkp3)
  (29, 'mlbb', 5.20), -- 4Weekly Pass (wkp4)
  (30, 'mlbb', 6.50), -- 5Weekly Pass (wkp5)
  (31, 'mlbb', 13.00), -- 10Weekly Pass (wkp10)
  (32, 'mlbb', 6.85), -- Twilight Pass
  (33, 'mlbb', 0.69); -- Super Value Pass (svp)

-- Insert Free Fire reseller prices
INSERT INTO reseller_prices (product_id, game, price)
VALUES
  -- Free Fire Diamonds
  (1, 'freefire', 0.20), -- 25 Diamonds
  (2, 'freefire', 0.78), -- 100 Diamonds
  (3, 'freefire', 2.37), -- 310 Diamonds
  (4, 'freefire', 3.97), -- 520 Diamonds
  (5, 'freefire', 7.81), -- 1060 Diamonds
  (6, 'freefire', 15.78), -- 2180 Diamonds
  (7, 'freefire', 39.04), -- 5600 Diamonds
  (8, 'freefire', 80.42), -- 11500 Diamonds
  
  -- Free Fire Subscriptions
  (9, 'freefire', 0.47), -- Evo3D
  (10, 'freefire', 0.71), -- Evo7D
  (11, 'freefire', 2.12), -- Evo30D
  (12, 'freefire', 1.35), -- Weekly
  (13, 'freefire', 6.70), -- Monthly
  (14, 'freefire', 0.28); -- WeeklyLite