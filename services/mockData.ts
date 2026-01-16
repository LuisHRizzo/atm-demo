import { Terminal, Transaction, Location } from '../types';

const STATES = ['GA', 'FL', 'TX', 'SC', 'AL'];
const CITIES = ['Atlanta', 'Miami', 'Houston', 'Charleston', 'Birmingham', 'Savannah', 'Orlando', 'Austin'];

export const generateLocations = (): Location[] => {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `LOC-${i + 1}`,
    name: `${CITIES[i]} Merchant Store`,
    city: CITIES[i],
    state: STATES[i % STATES.length],
    zip: `3000${i}`,
    rentModel: i % 2 === 0 ? 'FIXED' : 'VOLUME_TIER',
    baseRent: 500,
  }));
};

export const generateTerminals = (locations: Location[]): Terminal[] => {
  return locations.map((loc, i) => ({
    sn: `ATM-${1000 + i}`,
    atmId: `US-${loc.state}-${100 + i}`,
    locationId: loc.id,
    cashOnHand: Math.floor(Math.random() * 15000) + 2000,
    lastOnline: new Date().toISOString(),
    status: Math.random() > 0.9 ? 'OFFLINE' : 'ONLINE',
  }));
};

export const generateTransactions = (terminals: Terminal[], count: number = 200): Transaction[] => {
  const transactions: Transaction[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const terminal = terminals[Math.floor(Math.random() * terminals.length)];
    const type = Math.random() > 0.3 ? 'BUY' : 'SELL';
    const amountCash = Math.floor(Math.random() * 800) + 20; // $20 to $800
    const btcPrice = 65000 + (Math.random() * 2000 - 1000);
    const markup = 0.12; // 12%
    const fixedFee = 2.50;
    
    // Simulate dates over the last 30 days
    const date = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

    // Calculate profit
    const grossProfit = (amountCash * markup) + fixedFee;

    transactions.push({
      id: `TXN-${Date.now()}-${i}`,
      terminalSn: terminal.sn,
      timestamp: date.toISOString(),
      type,
      amountCash,
      amountCrypto: amountCash / btcPrice,
      exchangePrice: btcPrice,
      markupPercent: markup,
      fixedFee,
      status: Math.random() > 0.95 ? 'CANCELLED' : 'COMPLETED',
      grossProfit: grossProfit,
      source: Math.random() > 0.5 ? 'GB' : 'BP',
      period: '2024-Q1'
    });
  }
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};