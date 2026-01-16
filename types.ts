export type TransactionStatus = 'COMPLETED' | 'CANCELLED' | 'ERROR';
export type TransactionType = 'BUY' | 'SELL';
export type DataSource = 'GB' | 'BP' | 'BA' | 'OTC' | 'OTHER';

export interface Location {
  id: string;
  name: string;
  city: string;
  state: string; // GA, FL, TX, SC, AL
  zip: string;
  rentModel: 'FIXED' | 'VOLUME_TIER';
  baseRent: number;
}

export interface Terminal {
  sn: string; // Terminal SN
  atmId: string; // ATM ID
  locationId: string;
  cashOnHand: number;
  lastOnline: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
}

export interface Transaction {
  id: string;
  terminalSn: string;
  timestamp: string;
  type: TransactionType;
  amountCash: number;
  amountCrypto: number;
  exchangePrice: number;
  markupPercent: number;
  fixedFee: number;
  status: TransactionStatus;
  
  // New Segmentation Fields
  source: DataSource; // e.g., 'GB' (General Bytes), 'BP' (BitPay)
  period: string;     // e.g., '2024-Q1'
  
  // Flexible storage for provider-specific raw data
  metadata?: Record<string, any>;

  // Computed fields for convenience
  grossProfit: number;
  location?: Location; 
}

export interface DailyStat {
  date: string;
  volume: number;
  transactions: number;
  profit: number;
}

export interface StateSummary {
  state: string;
  totalVolume: number;
  activeTerminals: number;
  cashOnHand: number;
}