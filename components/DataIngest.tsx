import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader, Database, ArrowRight, TableProperties, Settings, Calendar, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { Terminal, Transaction, Location, DataSource } from '../types';
import { syncData } from '../services/apiService';

interface DataIngestProps {
  onDataLoaded: () => void;
}

// --- CONFIGURATION ---

const SOURCES: { id: DataSource; label: string }[] = [
  { id: 'GB', label: 'General Bytes (GB)' },
  { id: 'BP', label: 'BitPay (BP)' },
  { id: 'BA', label: 'BitAccess (BA)' },
  { id: 'OTC', label: 'Over The Counter (OTC)' },
  { id: 'OTHER', label: 'Other / Generic' },
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const YEARS = ['2023', '2024', '2025', '2026'];

// Specific Logic for your file formats
const PRESETS: Record<string, { signature: string[], parser: (row: any, index: number, batch: string) => Partial<Transaction> | null }> = {
  'GB': {
    signature: ['Terminal SN', 'Server Time', 'Cash Amount', 'Crypto Amount'],
    parser: (row) => {
      const type = (row['Type'] || '').toLowerCase().includes('sell') ? 'SELL' : 'BUY';
      // GB uses "Server Time"
      const date = new Date(row['Server Time'] || new Date()); 
      const amount = parseFloat(row['Cash Amount'] || '0');
      // GB Profit is usually "Fixed Transaction Fee" + (% based logic) or explicitly "Expected Profit Value"
      // We will use "Expected Profit Value" if available, else calc
      const grossProfit = parseFloat(row['Expected Profit Value']) || (amount * 0.12); // Fallback calc
      
      return {
        terminalSn: row['Terminal SN'],
        timestamp: date.toISOString(),
        type: type as 'BUY' | 'SELL',
        amountCash: amount,
        amountCrypto: parseFloat(row['Crypto Amount'] || '0'),
        exchangePrice: 0, // Often implied in GB
        grossProfit: grossProfit,
        status: (row['Status'] || '').toLowerCase() === 'confirmed' ? 'COMPLETED' : 'ERROR',
        source: 'GB',
        metadata: {
           serverTimeRaw: row['Server Time'],
           originalTxId: row['Transaction ID'] || null
        }
      };
    }
  },
  'BP': {
    signature: ['ATM ID', 'Transaction Type', 'Cash Value', 'Gross Profit'],
    parser: (row) => {
      const type = (row['Transaction Type'] || '').toLowerCase().includes('sell') ? 'SELL' : 'BUY';
      const amount = parseFloat(row['Cash Value'] || '0');
      
      return {
        terminalSn: row['ATM ID'], // BP uses ATM ID
        timestamp: new Date(row['Datetime'] || new Date()).toISOString(),
        type: type as 'BUY' | 'SELL',
        amountCash: amount,
        amountCrypto: parseFloat(row['Coin Quantity'] || '0'),
        exchangePrice: parseFloat(row['Exchange Feed Price'] || '0'),
        grossProfit: parseFloat(row['Gross Profit'] || '0'),
        status: (row['Status'] || '').toLowerCase() === 'complete' ? 'COMPLETED' : 'CANCELLED',
        source: 'BP',
        metadata: {
            cryptoAddress: row['Crypto Address'] || null,
            networkFee: row['Network Fee'] || null
        },
        // BP has direct location data
        location: {
          id: `LOC-${(row['Location City'] || 'UNK').toUpperCase()}`,
          name: row['Location Store Name'] || 'Unknown Store',
          city: row['Location City'],
          state: row['Location State'],
          zip: row['Location Postal Code'],
          rentModel: 'FIXED',
          baseRent: 500
        } as Location
      };
    }
  },
  'BA': {
    signature: ['BTM Machine Name', 'Amount Deposited', 'Actual Withdrawal Amount', 'Kind'],
    parser: (row) => {
      const kind = (row['Kind'] || '').toLowerCase();
      const type = kind.includes('buy') ? 'BUY' : 'SELL';
      
      // BA separates amounts based on Kind
      let amount = 0;
      if (type === 'BUY') amount = parseFloat(row['Amount Deposited'] || '0');
      else amount = parseFloat(row['Actual Withdrawal Amount'] || '0');

      // BA uses 'State' for status (e.g., 'served', 'confirmed')
      const statusRaw = (row['State'] || '').toLowerCase();
      const status = (statusRaw === 'served' || statusRaw === 'confirmed') ? 'COMPLETED' : 'ERROR';

      return {
        terminalSn: row['BTM Machine Name'],
        timestamp: new Date(row['Created At'] || new Date()).toISOString(),
        type: type as 'BUY' | 'SELL',
        amountCash: amount,
        amountCrypto: 0, // Often calculated from rate
        grossProfit: parseFloat(row['Flat Fee'] || '0') + (amount * (parseFloat(row['Margin Percentage'] || '0')/100)),
        status: status,
        source: 'BA',
        metadata: {
            rawKind: row['Kind'],
            rawState: row['State'],
            marginPercent: row['Margin Percentage']
        },
        location: {
           id: `LOC-${row['Location ID'] || 'UNK'}`,
           name: `BA Location ${row['Location ID']}`,
           city: 'Unknown', // BA CSV often lacks explicit city/state in simple exports, assumes Location ID map
           state: 'GA', // Fallback
           zip: '00000',
           rentModel: 'FIXED',
           baseRent: 0
        } as Location
      };
    }
  },
  'OTC': {
    signature: ['CUST ID', 'Receiving Bank', '$ TX Value', 'WALLET'],
    parser: (row) => {
      // OTC usually doesn't have a Machine ID. We will use a placeholder or City.
      const city = row['Location City'] || 'OTC-DESK';
      const sn = `OTC-${city.replace(/\s/g, '-').toUpperCase()}`;
      const type = (row['Transaction Type'] || '').toLowerCase().includes('sell') ? 'SELL' : 'BUY';

      return {
        terminalSn: sn,
        timestamp: new Date(row['Datetime'] || new Date()).toISOString(),
        type: type as 'BUY' | 'SELL',
        amountCash: parseFloat(row['Cash Value'] || row['$ TX Value'] || '0'),
        amountCrypto: parseFloat(row['Coin Quantity'] || '0'),
        grossProfit: parseFloat(row['Gross Profit'] || '0'),
        status: (row['Status'] || '').toLowerCase() === 'complete' ? 'COMPLETED' : 'CANCELLED',
        source: 'OTC',
        metadata: {
            receivingBank: row['Receiving Bank'],
            walletAddress: row['WALLET'],
            customerId: row['CUST ID']
        },
        location: {
          id: `LOC-OTC-${city.toUpperCase()}`,
          name: row['Customer Name'] || 'OTC Client',
          city: city,
          state: row['Location State'] || 'GA',
          zip: row['Location Postal Code'],
          rentModel: 'FIXED',
          baseRent: 0
        } as Location
      };
    }
  }
};

const DataIngest: React.FC<DataIngestProps> = ({ onDataLoaded }) => {
  const [step, setStep] = useState<'CONFIG' | 'UPLOAD' | 'MAP' | 'PROCESSING' | 'DONE'>('CONFIG');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [detectedPreset, setDetectedPreset] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  // Batch Settings
  const [selectedSource, setSelectedSource] = useState<DataSource>('GB');
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');

  // Manual Mapping Fallback
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-detect preset when headers change
  useEffect(() => {
    if (csvHeaders.length > 0) {
      let found = null;
      for (const [key, preset] of Object.entries(PRESETS)) {
        // Check if file headers contain ALL signature columns of a preset
        const hasAllSignatures = preset.signature.every(sig => csvHeaders.includes(sig));
        if (hasAllSignatures) {
          found = key;
          break;
        }
      }
      setDetectedPreset(found);
      if (found) {
        setSelectedSource(found as DataSource); // Auto-switch dropdown
      }
    }
  }, [csvHeaders]);

  // --- STEP 1: UPLOAD & READ HEADERS ---
  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError("Please upload a CSV file.");
      return;
    }
    setCsvFile(file);
    setError(null);

    Papa.parse(file, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          setPreviewData(results.data as any[]);
          // Logic for presets happens in useEffect
          setStep('MAP');
        } else {
          setError("Could not read CSV headers. Is the file empty?");
        }
      },
      error: (err) => setError(err.message)
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  // --- STEP 2: PROCESS FULL FILE ---
  const handleProcess = () => {
    if (!csvFile) return;
    setStep('PROCESSING');
    setProcessing(true);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawData = results.data as any[];
          const parsedLocations: Record<string, Location> = {};
          const parsedTerminals: Record<string, Terminal> = {};
          const parsedTransactions: Transaction[] = [];
          
          const batchId = `${selectedYear}-${selectedQuarter}`;

          rawData.forEach((row, index) => {
            let txData: Partial<Transaction> | null = null;
            let locData: Location | undefined = undefined;

            // STRATEGY: Use Preset Parser OR Manual Mapping
            if (detectedPreset && PRESETS[detectedPreset]) {
              // 1. Automatic Parsing
              const result = PRESETS[detectedPreset].parser(row, index, batchId);
              if (result) {
                txData = result;
                locData = result.location; // Parser might extract location
              }
            } else {
              // 2. Manual Mapping Logic (Fallback)
              const getVal = (key: string) => row[columnMapping[key]];
              const amountRaw = getVal('amount');
              const amount = parseFloat((amountRaw || '0').toString().replace(/[^0-9.-]+/g,""));
              
              if (amount > 0) {
                 txData = {
                    terminalSn: getVal('sn') || `UNK-${index}`,
                    timestamp: new Date(getVal('date') || new Date()).toISOString(),
                    type: (getVal('type') || '').toUpperCase().includes('SELL') ? 'SELL' : 'BUY',
                    amountCash: amount,
                    grossProfit: amount * 0.1, // Dummy calc for manual
                    status: 'COMPLETED',
                    source: selectedSource,
                    metadata: { manualImport: true, rowData: row }
                 };
                 const city = getVal('city') || 'Unknown';
                 const state = getVal('state') || 'GA';
                 locData = {
                    id: `LOC-${city.toUpperCase()}`,
                    name: `${city} Store`,
                    city, state, zip: '00000', rentModel: 'FIXED', baseRent: 500
                 };
              }
            }

            // If we successfully parsed a transaction line
            if (txData && txData.amountCash && txData.amountCash > 0) {
              const sn = txData.terminalSn || `UNK-${index}`;
              
              // Handle Location
              if (locData) {
                if (!parsedLocations[locData.id]) parsedLocations[locData.id] = locData;
              } else {
                 // Fallback location if parser didn't provide one (e.g. GB often lacks city in CSV)
                 const fallbackId = 'LOC-GENERIC';
                 if (!parsedLocations[fallbackId]) {
                   parsedLocations[fallbackId] = { id: fallbackId, name: 'Generic Location', city: 'Unknown', state: 'GA', zip: '00000', rentModel: 'FIXED', baseRent: 0 };
                 }
              }

              // Handle Terminal
              const locId = locData ? locData.id : 'LOC-GENERIC';
              if (!parsedTerminals[sn]) {
                parsedTerminals[sn] = {
                  sn, 
                  atmId: sn, // Use SN as ID if name missing
                  locationId: locId,
                  cashOnHand: 5000, // Default start
                  lastOnline: new Date().toISOString(), 
                  status: 'ONLINE'
                };
              }

              // Finalize Transaction Object
              parsedTransactions.push({
                id: `TX-${selectedSource}-${Date.now()}-${index}`,
                terminalSn: sn,
                timestamp: txData.timestamp || new Date().toISOString(),
                type: txData.type || 'BUY',
                amountCash: txData.amountCash || 0,
                amountCrypto: txData.amountCrypto || 0,
                exchangePrice: txData.exchangePrice || 65000,
                markupPercent: 0.12,
                fixedFee: 2.5,
                status: txData.status || 'COMPLETED',
                grossProfit: txData.grossProfit || 0,
                source: selectedSource,
                period: batchId,
                metadata: txData.metadata || {}
              });
            }
          });

          await syncData(Object.values(parsedTerminals), parsedTransactions, Object.values(parsedLocations));
          setSuccessMsg(`Success! Imported ${parsedTransactions.length} transactions using ${detectedPreset ? detectedPreset + ' Preset' : 'Manual Mapping'}.`);
          onDataLoaded();
          setStep('DONE');
        } catch (err: any) {
          console.error(err);
          setError(err.message);
          setStep('MAP'); 
        } finally {
          setProcessing(false);
        }
      }
    });
  };

  const manualFields = [
    { key: 'sn', label: 'Terminal ID / SN' },
    { key: 'date', label: 'Date / Timestamp' },
    { key: 'type', label: 'Tx Type (Buy/Sell)' },
    { key: 'amount', label: 'Cash Amount' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Database className="text-blue-600" /> Data Ingest
           </h2>
           <p className="text-slate-500">Import batched data from providers (GB, BP, OTC).</p>
        </div>
        {step !== 'CONFIG' && step !== 'PROCESSING' && (
            <button onClick={() => { setStep('CONFIG'); setCsvFile(null); setDetectedPreset(null); }} className="text-sm text-blue-600 underline">
                Start Over
            </button>
        )}
      </div>

      {/* --- ERROR / SUCCESS MESSAGES --- */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      {step === 'DONE' && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-8 rounded-xl flex flex-col items-center justify-center text-center gap-4 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
             <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-bold">Import Successful</h3>
          <p>{successMsg}</p>
          <button onClick={() => { setStep('CONFIG'); setCsvFile(null); setSuccessMsg(null); setDetectedPreset(null); }} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
             Import Another File
          </button>
        </div>
      )}

      {/* --- STEP 0: CONFIGURATION --- */}
      {step === 'CONFIG' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 animate-in slide-in-from-bottom-2">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <Settings size={20} className="text-slate-400" />
              Batch Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Fiscal Period</label>
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                      <select 
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="relative w-24">
                      <select 
                          value={selectedQuarter}
                          onChange={(e) => setSelectedQuarter(e.target.value)}
                          className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                          {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={() => setStep('UPLOAD')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-md flex items-center gap-2 transition-all"
              >
                Next Step <ArrowRight size={18} />
              </button>
            </div>
         </div>
      )}

      {/* --- STEP 1: UPLOAD UI --- */}
      {step === 'UPLOAD' && (
        <div 
          onDragOver={(e) => e.preventDefault()} 
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors bg-white animate-in slide-in-from-right-2"
        >
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
               Target Period: {selectedYear}-{selectedQuarter}
            </span>
          </div>
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <Upload size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Drag & Drop CSV File</h3>
          <p className="text-slate-400 mb-6 max-w-sm">Compatible with Generic CSV, General Bytes, BitAccess, BitPay, OTC.</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg cursor-pointer transition-colors shadow-lg shadow-blue-600/30">
            Select File
            <input type="file" className="hidden" accept=".csv" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
          </label>
          <button onClick={() => setStep('CONFIG')} className="mt-6 text-slate-400 hover:text-slate-600 text-sm">
             Back to Configuration
          </button>
        </div>
      )}

      {/* --- STEP 2: REVIEW / MAP UI --- */}
      {step === 'MAP' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-right-2">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <TableProperties size={18} className="text-slate-500" />
                      {detectedPreset ? 'Format Detected' : 'Map Columns Manually'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {detectedPreset 
                      ? `We identified this file as ${SOURCES.find(s=>s.id === detectedPreset)?.label}.` 
                      : 'Unknown format. Please map headers to system fields.'}
                  </p>
                </div>
            </div>
            
            <div className="p-6">
                {detectedPreset ? (
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex flex-col items-center text-center">
                      <FileSpreadsheet className="text-blue-500 mb-3" size={40} />
                      <h4 className="font-bold text-blue-900 text-lg mb-2">Ready to Import {detectedPreset} Data</h4>
                      <p className="text-blue-700 mb-6 max-w-md">
                        We have automatically matched the columns for the <strong>{detectedPreset}</strong> format. 
                        No manual mapping is required.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 w-full max-w-md bg-white p-4 rounded border border-blue-100 text-left text-sm mb-4">
                         <div><span className="text-slate-400">Source:</span> <span className="font-medium">{detectedPreset}</span></div>
                         <div><span className="text-slate-400">Period:</span> <span className="font-medium">{selectedYear}-{selectedQuarter}</span></div>
                         <div><span className="text-slate-400">Rows:</span> <span className="font-medium">{previewData.length} (Preview)</span></div>
                      </div>
                   </div>
                ) : (
                   /* MANUAL MAPPING UI */
                   <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                          {manualFields.map((field) => (
                              <div key={field.key} className="flex flex-col gap-1">
                                  <label className="text-sm font-medium text-slate-700">{field.label}</label>
                                  <select 
                                      value={columnMapping[field.key] || ''}
                                      onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                  >
                                      <option value="">-- Select Column --</option>
                                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                  </select>
                              </div>
                          ))}
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preview</h4>
                          <div className="space-y-2 text-sm">
                             <p className="text-slate-500 italic">Please select columns to see preview.</p>
                          </div>
                      </div>
                   </div>
                )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between">
                <button onClick={() => setStep('UPLOAD')} className="text-slate-500 hover:text-slate-700 font-medium">Back</button>
                <button 
                    onClick={handleProcess}
                    disabled={processing}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-8 rounded-lg shadow-md transition-all disabled:opacity-50"
                >
                    {processing ? <Loader className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                    {processing ? "Processing..." : "Import Data"}
                </button>
            </div>
        </div>
      )}
      
      {step === 'PROCESSING' && (
          <div className="flex flex-col items-center justify-center p-12">
              <Loader size={48} className="text-blue-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Processing Data...</h3>
              <p className="text-slate-500">Normalizing and tagging transactions...</p>
          </div>
      )}
    </div>
  );
};

export default DataIngest;