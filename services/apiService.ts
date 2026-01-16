import { Terminal, Transaction, Location } from '../types';

// Use relative path so it goes through the Vite proxy (defined in vite.config.ts)
const API_URL = '/api';

export const fetchData = async () => {
  try {
    const res = await fetch(`${API_URL}/data`);
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    return data; // { locations, terminals, transactions }
  } catch (error) {
    // Log as warning so it doesn't look like a critical crash in the console
    // This allows the App to gracefully fallback to mock data
    console.warn("API unavailable (running in demo/offline mode):", error);
    return null;
  }
};

export const syncData = async (
  terminals: Terminal[], 
  transactions: Transaction[], 
  locations: Location[]
) => {
  try {
    const res = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminals, transactions, locations }),
    });
    if (!res.ok) throw new Error('Failed to sync data');
    return await res.json();
  } catch (error) {
    console.error("Sync Error:", error);
    throw error;
  }
};