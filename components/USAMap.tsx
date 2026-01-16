import React, { useState } from 'react';
import { StateSummary } from '../types';

interface USAMapProps {
  data: StateSummary[];
}

// Complete paths for US States (Lower 48 + DC)
// Coordinate system approx 960x600
const STATE_PATHS: Record<string, string> = {
  AL: "M566.6,448.6l-6.2-22.3l19.8-3.7l3.1-4.3l-2.5-4.3l6.2-6.2l-1.9-8.7l27.2-0.6l12.4,59.5l-8,3.1l-1.9,6.2l-6.8,1.9l-3.1,8l-10.5,1.9l-8.7-11.8l-4.3,0.6L566.6,448.6z",
  AZ: "M163.7,358l6.2-1.9l4.3-6.2l12.4,1.2l-1.2,16.7l-3.7,1.2l-0.6,3.7l4.3,2.5l-0.6,4.3l5,3.1l2.5,6.8l21.1,8l0.6,18.6l-37.2,13l-4.3,2.5l-3.1-6.8l-3.1-0.6l-14.2-25.4l-11.2-54.5l67.5,13.6L163.7,358z",
  AR: "M434.7,406.4l1.2-12.4l11.2-1.9l8,4.3l3.7-2.5l22.9,2.5l0.6,5l-3.7,16.7l-4.3,2.5l-2.5,9.3l-8,1.2l-0.6,4.3l-4.3,3.7l-15.5-3.1l-6.8,2.5l-12.4-1.2l-0.6-45.2L434.7,406.4z",
  CA: "M56.5,237.2l44,9.3l31.6,48.3l67.5,134.5l-16.7,2.5l-4.3,6.2l-12.4,1.2l-2.5,6.2l-3.1,1.9l-4.3,9.3l-8,3.1l-6.8,6.8l-5.6,2.5l-3.7-4.3l-1.9-6.2l-6.2-4.3l-2.5-5l-2.5-0.6l-1.9-4.3l-6.2-4.3l-1.2-5l-3.1-3.7l-3.7-5.6l-1.2-5l1.2-6.8l-1.2-6.8l3.7-18l-1.9-5l-1.9-1.9l0.6-6.2l4.3-15.5l-1.2-11.2l1.9-10.5l5.6-6.2l-0.6-13l4.3-19.8V237.2z",
  CO: "M205.8,284.2l102.9,6.2l4.3,71.3l-109.1-5.6L205.8,284.2z",
  CT: "M724,241.5l3.1,1.2l8.7-5.6l1.2,5l-11.8,4.3L724,241.5z",
  DE: "M703.5,296.7l1.2-5.6l6.8,2.5l-1.2,11.2l-4.3-0.6L703.5,296.7z",
  DC: "M678.7,301l4.3-2.5l1.2,3.7l-4.3,2.5L678.7,301z",
  FL: "M649.6,539.1l-4.3-3.1l-3.7,1.9l-4.3-1.2l-1.2,2.5l-6.2-0.6l-5,8l-3.1-1.2l-1.9,3.7l-4.3-0.6l-0.6,3.1l-5,1.2l-4.3-4.3l-2.5,1.9l-1.2-3.1l-3.7,0.6l-2.5-1.9l1.2-5l-3.7-1.2l-0.6-2.5l-14.2-2.5l-11.8-6.2l-1.2-3.1l3.7-3.7l8-1.9l1.2-3.1l6.8-1.2l0.6-5.6l5-1.9l1.9-5.6l34.1-6.2l3.7,2.5l3.1-1.9l3.7,5.6l3.7,2.5l3.1,9.9l3.1,4.3l1.9,8l-2.5,4.3l1.2,5l3.1,5.6l6.8,11.2l-1.9,3.1l-1.9,0.6L649.6,539.1z",
  GA: "M605,459.8l-12.4-59.5l17.3-4.3l5.6-8l6.8,1.9l8.7,9.3l23.5,31l-1.9,5.6l-5,1.9l-0.6,5.6l-6.8,1.2l-1.2,3.1l-8,1.9l-3.7,3.7l1.2,3.1l-10.5,1.9l-13.6,1.2l-0.6-1.9L605,459.8z",
  ID: "M104.2,126.9l5.6-2.5l4.3,1.9l3.1-1.9l3.7,3.1l3.1-0.6l1.2,1.9l5,0.6l1.9-1.9l3.7,1.2l28.5,12.4l-5,24.8l2.5,6.2l-1.2,7.4l-1.9,2.5l1.9,3.7l0.6,4.3l5.6,2.5l-1.9,8l-3.7,1.2l-3.1,5l-2.5,23.5l-63.2,6.2l-4.3-33.5l5.6-16.1l4.3-2.5l3.1-8.7l-0.6-18.6l1.2-5.6l3.7-6.2L104.2,126.9z",
  IL: "M475,301l19.8,1.9l11.2,35.9l-1.2,5l-11.2,6.8l-6.8,16.7l-3.7,3.7l1.9,6.2l-6.8,6.8l2.5,5l-1.9,1.9l-1.9,9.9l-6.2,3.1l-3.7-1.9l-8-6.2l1.9-6.2l-4.3-4.3l-2.5,3.1l-4.3-3.1l0.6-67.5L475,301z",
  IN: "M504.7,301.7l28.5,1.9l3.7,46.5l-6.8,3.1l-4.3,6.2l-8,0.6l-5,5l-1.9-6.2l3.7-3.7l6.8-16.7l11.2-6.8l1.2-5l-11.2-35.9L504.7,301.7z",
  IA: "M403.7,252.1l7.4,1.9l6.2,6.8l2.5,6.8l5,3.1l8-1.2l2.5,4.3l39.7,1.2l2.5,4.3l-8,31l-3.7,10.5l-21.7-1.2l-46.5-3.1l-1.2-51.4L403.7,252.1z",
  KS: "M308.9,328.3l110.3,3.7l1.2,46.5l-110.9-4.3L308.9,328.3z",
  KY: "M504.1,364.9l8,0.6l3.1-5l5-1.9l8.7,12.4l11.8,2.5l18.6-8.7l6.2,6.8l-0.6,8.7l-4.3,0.6l-1.9,6.2l-79.3-13.6l1.9-9.9l-2.5-5l6.8-6.8L504.1,364.9z",
  LA: "M422.3,478.3l15.5,0.6l3.7,3.7l4.3,10.5l8.7,1.2l2.5,6.2l4.3,0.6l6.2,8l-2.5,2.5l-8.7-0.6l-2.5,3.1l1.9,4.3l-2.5,3.7l1.9,5.6l-3.1,2.5l-3.7,8.7l-5,1.9l-4.3-2.5l-3.1,1.9l-0.6,6.2l-3.7,1.2l-1.9,5l-2.5-1.9l-1.2,3.1l-1.9-0.6l-4.3,5l-5.6-3.1l-4.3-16.7l-15.5-17.3l0.6-15.5l-5-10.5l-3.1-3.7l-1.2-8L422.3,478.3z",
  ME: "M760.5,147.3l12.4,9.3l-0.6,3.7l5.6,9.3l-1.2,4.3l5,4.3l-1.2,14.9l-4.3,6.2l-5-1.9l-3.7,1.2l-4.3-5l-1.2-6.8l-3.7-2.5l-4.3,3.7l-5-5l-10.5-3.7l2.5-14.2l-1.2-4.3l8.7-11.8l6.8-6.2L760.5,147.3z",
  MD: "M662.6,289.8l16.1,1.9l1.2,9.3l8.7,18.6l3.7,1.9l0.6,1.9l-0.6,4.3l-6.8,1.2l-10.5-1.9l-6.2,6.2l-6.8-1.2l0.6-6.2l8.7,4.3l1.2-3.7l0.6-12.4l4.3-12.4l-3.1-9.9l-6.2-11.2L662.6,289.8z",
  MA: "M719.7,222.9l16.1-1.2l2.5,7.4l6.8,7.4l-1.9,6.2l-3.1-1.9l-11.2,1.2l-0.6-2.5l-3.1-1.2L719.7,222.9z",
  MI: "M544.4,213l3.7,8l13,6.8l16.1-4.3l5.6,4.3l1.2,9.9l-4.3,1.9l-1.9,5l1.9,5l12.4,14.2l-2.5,4.3l-4.3,2.5l-3.7-1.9l-6.8,4.3l-28.5-1.9l-0.6-32.8l-8.7-18l-1.9-9.3l3.7-6.2l5,1.9L544.4,213z M493.5,200.6l8.7-2.5l11.8,2.5l12.4-5l6.8-5.6l2.5-4.3l-8.7-3.1l-18.6,4.3l-12.4,11.2L493.5,200.6z",
  MN: "M398.7,166.5l22.3,4.3l21.7,3.1l-5,5l-3.7,6.2l1.9,9.3l8.7,18l0.6,32.8l-6.8,0.6l-3.7-6.2l-1.2-4.3l-39.7-1.2l-1.2-64.4L398.7,166.5z",
  MS: "M536.8,421.9l-2.5,4.3l-3.1,4.3l-19.8,3.7l6.2,22.3l16.1,1.2l3.7-1.2l1.9,2.5l3.7-1.2l11.8,1.2l4.3-0.6l8.7,11.8l10.5-1.9l3.1-8l6.8-1.9l1.9-6.2l8-3.1l0.6,1.9l0.6-0.6l-4.3-24.8l-31-6.8L536.8,421.9z",
  MO: "M409.9,325.2l27.9,1.9l23.5,6.2l4.3,3.1l2.5-3.1l4.3,4.3l-1.9,6.2l8,6.2l3.7,1.9l6.2-3.1l1.9-9.9l16.7,13l-1.9,6.2l-8,1.2l-11.8,51.4l-48.3-2.5l-0.6-45.2l-26.7-1.9L409.9,325.2z",
  MT: "M174.9,122.6l165.4,8l-4.3,47.7l-42.1-4.3l-34.7,6.2l-5.6-2.5l-0.6-4.3l-1.9-3.7l1.9-2.5l1.2-7.4l-2.5-6.2l5-24.8L174.9,122.6z",
  NE: "M303.4,267.6l68.2,3.1l21.7,1.2l3.7-10.5l8,6.8l-0.6,60.1l-110.3-3.7l-5-44L303.4,267.6z",
  NV: "M100.5,246.5l63.2-6.2l13.6,112.8l-33.5,29.1l-67.5-134.5L100.5,246.5z",
  NH: "M732.1,192.6l6.8,4.3l4.3,16.7l-4.3,1.2l-3.1-1.2l-3.7,10.5l-8.7,5.6l-1.2-18.6l8-14.2L732.1,192.6z",
  NJ: "M703.5,263.3l6.2,5l-1.2,16.7l-5,5.6l-5.6-3.7l2.5-10.5l-1.2-5.6L703.5,263.3z",
  NM: "M203.9,368.5l98.5,5l1.2,46.5l-18,10.5l-39.7-1.2l-4.3,2.5l-37.2-5.6L203.9,368.5z",
  NY: "M684.3,253.3l35.3-22.9l6.8,35.9l-8.7,3.7l-6.2-4.3l-1.9,6.2l-8,1.9l-13.6-14.2l-1.9-4.3l-1.9-2.5L684.3,253.3z",
  NC: "M656.4,387.1l-24.1-8.7l-29.1,6.2l-6.8-1.9l-5.6,8l-17.3,4.3l-2.5-4.3l1.9-8l5.6-3.7l0.6-4.3l12.4-3.1l3.7-8l45.1-8l4.3,6.8l0.6,6.2l8.7,4.3l1.2,3.7l-6.8,8.7l-2.5-0.6l-3.7,4.3l-1.9,4.3l1.9,0.6L656.4,387.1z",
  ND: "M308.9,129.4l89.9,6.2l-1.2,64.4l-88-5L308.9,129.4z",
  OH: "M576.6,284.9l20.4,6.2l8,10.5l1.2,26l-13,6.2l-8,0.6l-5-1.9l-3.1,5l-8-0.6l-6.8-14.9l5-5l8-0.6l4.3-6.2l6.8-3.1L576.6,284.9z",
  OK: "M310.2,374.8l110.9,4.3l0.6,27.3l-12.4,1.2l-6.8-2.5l-15.5,3.1l-4.3-3.7l-0.6-4.3l-8-1.2l-2.5-9.3l-56.4-3.1l-4.3-13.6L310.2,374.8z",
  OR: "M45.3,161.9l36.6,8l22.3-5l4.3,2.5l-5.6,16.1l4.3,33.5l-102.3,15.5l-0.6-13l3.7-5l3.1-13l3.7-3.1l3.1-10.5l3.1-4.3l2.5-6.8l8-2.5l2.5-4.3l5-1.9l6.2-4.3L45.3,161.9z",
  PA: "M628.6,259.6l54.5-11.2l1.9,2.5l1.9,4.3l13.6,14.2l-4.3,1.9l-6.2,16.7l-0.6,3.1l-61.4-1.9L628.6,259.6z",
  RI: "M738.9,245.9l5-3.1l2.5,1.9l-1.2,3.7l-5,1.2L738.9,245.9z",
  SC: "M635.3,425.1l-23.5-31l-8.7-9.3l29.1-6.2l24.1,8.7l-5,6.8l-2.5,0.6l-2.5,5l-3.7,0.6l-2.5,6.2l-0.6,3.7l-3.1,1.9l-1.2,3.7L635.3,425.1z",
  SD: "M309.6,195l88,5l-3.7,44.6l-8,1.2l-5-3.1l-2.5-6.8l-6.2-6.8l-7.4-1.9l-5.6,41.2l-68.2-3.1l-5-29.7l2.5-5l5-4.3l2.5-6.2l11.2-13.6L309.6,195z",
  TN: "M566,396.5l-1.9,8l2.5,4.3l-27.2,0.6l1.9,8.7l-6.2,6.2l-5.6-29.1l-39.7-8l-9.3,21.7l-50.2-1.9l6.2-30.4l32.2-4.3l8.7,2.5l19.2-3.1l79.3,13.6L566,396.5z",
  TX: "M328.7,488.8l16.7-52.1l29.1-0.6l3.1,43.4l52.7,2.5l1.2,8l3.1,3.7l5,10.5l-0.6,15.5l15.5,17.3l5,18l11.2,7.4l-4.3,3.7l-3.7,8.7l-9.9,3.7l-8,8.7l-5-1.2l-3.1,3.7l-6.2-4.3l-5,1.9l-8,8.7l-6.2,1.2l-8.7-6.2l-11.2-13l-6.8-4.3l-19.8-19.2l-34.1-13.6l-8-8.7l-18-10.5L328.7,488.8z",
  UT: "M163.7,358l40.3-5l3.7-22.3l6.2-32.8l38.4,2.5l-4.3,71.3l-98.5-5L163.7,358z",
  VT: "M717.8,187.6l6.8,5l7.4,0.6l-8,14.2l1.2,18.6l-3.1-1.2l-6.8-7.4l-2.5-7.4l2.5-22.3L717.8,187.6z",
  VA: "M662.6,372.3l-4.3-6.8l45.8-27.9l6.2,11.2l3.1,9.9l-4.3,12.4l-0.6,12.4l-1.2-3.7l-8.7-4.3l-0.6-6.2L662.6,372.3z",
  WA: "M109.8,124.4l-3.7,6.2l-1.2,5.6l0.6,18.6l-3.1,8.7l-4.3,2.5l-5.6,16.1l-36.6-8l1.2-13l1.9-8.7l-1.9-5.6l-6.8-6.2l1.9-4.3l3.7-1.9l1.9-2.5l3.1,0.6l6.8-3.1l8.7,1.9l1.9-1.9l9.3,3.1l1.9-1.9L109.8,124.4z",
  WV: "M596.5,310.9l-6.8,3.1l-4.3,6.2l-8,0.6l-5,5l6.8,14.9l8,0.6l3.1-5l5,1.9l1.9,6.2l-6.8,6.8l2.5,5l-1.9,9.9l-11.8-2.5l-8.7-12.4l-5,1.9l-3.1,5l-8-0.6l-6.8,16.7l-3.7,3.7l6.2-3.1l1.9-9.9l1.9-1.9l-2.5-5l6.8-6.8l-1.9-6.2l3.7-3.7l6.8-16.7l11.2-6.8l1.2-5l61.4,1.9L596.5,310.9z",
  WI: "M475,301l-18-28.5l-1.2-14.9l5.6-3.7l-1.9-9.3l3.7-6.2l5-5l-21.7-3.1l-22.3-4.3l26-17.3l8.7,4.3l3.1-4.3l2.5,0.6l4.3,8.7l1.9-2.5l1.9,0.6l0.6,4.3l2.5,0.6l3.7,3.1l-1.2,8.7l5.6,9.9l-0.6,11.8l3.7,2.5l-1.9,6.8L475,301z",
  WY: "M205.8,284.2l4.3-30.4l92.8,7.4l-5,44l-8-6.8l-3.7,10.5l-21.7-1.2l-68.2-3.1l-6.2,32.8l-3.7,22.3l-83-11.8l-1.2-24.8l2.5-5l3.1-5l3.7-1.2l1.9-8l-5.6-2.5l-0.6-4.3l-1.9-3.7l1.9-2.5l1.2-7.4l-2.5-6.2l5-24.8L205.8,284.2z"
};

// A helper to normalize state codes
const normalizeState = (state: string) => state.toUpperCase().trim();

const USAMap: React.FC<USAMapProps> = ({ data }) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // 1. Find Max Volume for scaling
  const maxVolume = Math.max(...data.map(d => d.totalVolume), 1);

  // 2. Map data to easy lookup
  const dataMap = data.reduce((acc, curr) => {
    acc[normalizeState(curr.state)] = curr;
    return acc;
  }, {} as Record<string, StateSummary>);

  // 3. Helper to get color
  const getFill = (stateCode: string) => {
    const stats = dataMap[stateCode];
    // Changed fallback: Slate-100 for empty states (creates the "map" shape)
    if (!stats) return '#f1f5f9'; 
    
    // Calculate intensity (0 to 1)
    const intensity = stats.totalVolume / maxVolume;
    
    if (intensity < 0.2) return '#bfdbfe';
    if (intensity < 0.4) return '#60a5fa';
    if (intensity < 0.6) return '#3b82f6';
    if (intensity < 0.8) return '#2563eb';
    return '#1e40af';
  };

  const getOpacity = (stateCode: string) => {
      const stats = dataMap[stateCode];
      return stats ? 1 : 1; // Keep full opacity for empty states so they are visible
  };

  const availableStates = Object.keys(STATE_PATHS);

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-white rounded-xl overflow-hidden">
      
      {/* Tooltip Layer */}
      {hoveredState && dataMap[hoveredState] && (
        <div 
            className="absolute z-10 pointer-events-none bg-slate-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl transform -translate-y-12"
            style={{ top: '50%', left: '50%' }}
        >
          <div className="font-bold text-sm mb-1">{dataMap[hoveredState].state} Performance</div>
          <div>Volume: <span className="text-emerald-400 font-mono">${dataMap[hoveredState].totalVolume.toLocaleString()}</span></div>
          <div>Active ATMs: {dataMap[hoveredState].activeTerminals}</div>
        </div>
      )}

      {/* Map SVG */}
      <svg 
        viewBox="0 0 960 600" 
        className="w-full h-full filter drop-shadow-sm"
        style={{ maxHeight: '500px' }}
      >
        <title>USA Performance Heatmap</title>
        
        {availableStates.map(stateCode => {
          const hasData = !!dataMap[stateCode];
          return (
            <path
              key={stateCode}
              d={STATE_PATHS[stateCode]}
              fill={getFill(stateCode)}
              stroke="white"
              strokeWidth="1.5"
              opacity={getOpacity(stateCode)}
              className={`transition-all duration-300 ease-in-out ${hasData ? 'hover:brightness-110 cursor-pointer' : 'cursor-default hover:fill-slate-200'}`}
              onMouseEnter={() => setHoveredState(stateCode)}
              onMouseLeave={() => setHoveredState(null)}
            />
          );
        })}

        {/* Labels - Only for states with data to avoid clutter */}
        {availableStates.map(stateCode => {
            // Expanded centroids list for common states
            const centroids: Record<string, [number, number]> = {
                TX: [380, 480], FL: [700, 520], GA: [640, 440], 
                AL: [590, 440], SC: [670, 410], CA: [70, 350],
                NY: [710, 240], IL: [520, 300], PA: [660, 260],
                NC: [680, 380], TN: [570, 390], NV: [120, 300],
                AZ: [180, 400], WA: [100, 100], CO: [250, 320]
            };
            const pos = centroids[stateCode];
            const hasData = !!dataMap[stateCode];

            if (pos && hasData) {
                return (
                    <text 
                        key={`label-${stateCode}`}
                        x={pos[0]} 
                        y={pos[1]} 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="11" 
                        fontWeight="bold"
                        className="pointer-events-none shadow-black drop-shadow-md select-none"
                    >
                        {stateCode}
                    </text>
                );
            }
            return null;
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm text-xs">
          <div className="font-semibold text-slate-700 mb-2">Volume Heatmap</div>
          <div className="flex items-center gap-2">
              <span className="text-slate-500">Low</span>
              <div className="flex gap-0.5">
                  <div className="w-4 h-4 bg-blue-200 rounded-sm"></div>
                  <div className="w-4 h-4 bg-blue-400 rounded-sm"></div>
                  <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
                  <div className="w-4 h-4 bg-blue-800 rounded-sm"></div>
              </div>
              <span className="text-slate-500">High</span>
          </div>
      </div>
    </div>
  );
};

export default USAMap;