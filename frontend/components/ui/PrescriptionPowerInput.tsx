'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PrescriptionPowerInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  type?: 'sph' | 'cyl' | 'add' | 'axis' | 'pd' | 'vn' | 'general';
  className?: string;
  required?: boolean;
}

export default function PrescriptionPowerInput({
  value,
  onChange,
  placeholder = '-1.50',
  label,
  type = 'sph',
  className = '',
  required = false,
}: PrescriptionPowerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate suggestions based on user input
  const getSuggestions = (query: string): { plus: string[]; minus: string[]; special?: string[] } => {
    const q = query.trim();

    // Specific logic for V/N (Visual Acuity e.g. 6/6, 6/9, 6/)
    if (type === 'vn') {
      const commonVNs = ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', '6/'];
      if (!q) return { plus: commonVNs, minus: [] };
      const filtered = commonVNs.filter((v) => v.startsWith(q));
      return { plus: filtered.length > 0 ? filtered : [q], minus: [] };
    }

    // Specific logic for AXIS (0 to 180 degrees)
    if (type === 'axis') {
      const commonAxes = ['10', '20', '45', '70', '80', '85', '90', '95', '100', '110', '135', '170', '180'];
      if (!q) return { plus: commonAxes.slice(0, 8), minus: [] };
      const filtered = commonAxes.filter((a) => a.startsWith(q));
      return { plus: filtered.length > 0 ? filtered : [q], minus: [] };
    }

    // Specific logic for Pupillary Distance (PD: 25mm to 75mm)
    if (type === 'pd') {
      const commonPDs = ['28', '29', '30', '31', '31.5', '32', '32.5', '33', '60', '62', '63', '64', '65', '66'];
      if (!q) return { plus: commonPDs.slice(0, 8), minus: [] };
      const filtered = commonPDs.filter((p) => p.startsWith(q));
      return { plus: filtered.length > 0 ? filtered : [q], minus: [] };
    }

    // Ophthalmic Power values (SPH, CYL, ADD)
    if (!q) {
      if (type === 'add') {
        return {
          plus: ['+1.00', '+1.25', '+1.50', '+1.75', '+2.00', '+2.25', '+2.50', '+2.75', '+3.00'],
          minus: [],
        };
      }
      return {
        plus: ['+0.25', '+0.50', '+0.75', '+1.00', '+1.25', '+1.50', '+2.00', '+2.50'],
        minus: ['-0.25', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-2.00', '-2.50'],
        special: ['Plano (0.00)'],
      };
    }

    // Special keywords
    if (q.toLowerCase().startsWith('p') || q === '0' || q === '0.00') {
      return {
        plus: ['+0.25', '+0.50', '+0.75'],
        minus: ['-0.25', '-0.50', '-0.75'],
        special: ['Plano', '0.00', 'Balance'],
      };
    }

    // Extract numeric portion
    const cleanNumStr = q.replace(/[^\d.]/g, '');
    const num = parseFloat(cleanNumStr);

    if (isNaN(num)) {
      return {
        plus: ['+0.50', '+1.00', '+1.50', '+2.00'],
        minus: ['-0.50', '-1.00', '-1.50', '-2.00'],
      };
    }

    if (cleanNumStr === '25') {
      return {
        plus: ['+0.25', '+1.25', '+2.25', '+3.25'],
        minus: ['-0.25', '-1.25', '-2.25', '-3.25'],
      };
    }
    if (cleanNumStr === '50' || cleanNumStr === '5') {
      return {
        plus: ['+0.50', '+1.50', '+2.50', '+3.50'],
        minus: ['-0.50', '-1.50', '-2.50', '-3.50'],
      };
    }
    if (cleanNumStr === '75') {
      return {
        plus: ['+0.75', '+1.75', '+2.75', '+3.75'],
        minus: ['-0.75', '-1.75', '-2.75', '-3.75'],
      };
    }

    if (Number.isInteger(num) && !cleanNumStr.includes('.')) {
      const pArr = [
        `+${num.toFixed(2)}`,
        `+${(num + 0.25).toFixed(2)}`,
        `+${(num + 0.5).toFixed(2)}`,
        `+${(num + 0.75).toFixed(2)}`,
      ];
      const mArr = [
        `-${num.toFixed(2)}`,
        `-${(num + 0.25).toFixed(2)}`,
        `-${(num + 0.5).toFixed(2)}`,
        `-${(num + 0.75).toFixed(2)}`,
      ];
      return { plus: pArr, minus: mArr };
    }

    const formatted = num.toFixed(2);
    return {
      plus: [`+${formatted}`, `+${(num + 0.25).toFixed(2)}`],
      minus: [`-${formatted}`, `-${(num + 0.25).toFixed(2)}`],
    };
  };

  const suggestions = getSuggestions(value);

  const handleSelect = (val: string) => {
    const finalVal = val.startsWith('Plano') ? 'Plano' : val;
    onChange(finalVal);
    setIsOpen(false);
  };

  const handleQuickSign = (sign: '+' | '-') => {
    if (!value) {
      onChange(`${sign}1.00`);
      return;
    }
    const clean = value.replace(/[^\d.]/g, '');
    if (!clean) return;
    const num = parseFloat(clean);
    if (isNaN(num)) return;
    onChange(`${sign}${num.toFixed(2)}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-wider mb-0.5 text-center">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`optic-power-input ${
            value && value.startsWith('+')
              ? 'text-emerald-700 bg-emerald-50/50 border-emerald-300 font-bold'
              : value && value.startsWith('-')
              ? 'text-rose-700 bg-rose-50/50 border-rose-300 font-bold'
              : 'text-slate-800'
          } ${className}`}
        />
      </div>

      {/* AUTO-SUGGESTION FLOATING POPOVER */}
      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-44 sm:w-48 p-2 bg-white rounded-xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
          {/* Quick Header Sign Toggles */}
          {type !== 'axis' && type !== 'pd' && (
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 text-[10px]">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Sign</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleQuickSign('+');
                  }}
                  className="px-1.5 py-0.5 rounded font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors text-[10px]"
                >
                  + PLUS
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleQuickSign('-');
                  }}
                  className="px-1.5 py-0.5 rounded font-black text-rose-700 bg-rose-100 hover:bg-rose-200 transition-colors text-[10px]"
                >
                  - MINUS
                </button>
              </div>
            </div>
          )}

          {/* Suggestions Grid */}
          <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
            {suggestions.special && suggestions.special.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {suggestions.special.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(sp);
                    }}
                    className="flex-1 py-0.5 px-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-center transition-colors"
                  >
                    {sp}
                  </button>
                ))}
              </div>
            )}

            {/* Negative Powers */}
            {suggestions.minus.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-rose-600 mb-0.5">Minus (-)</p>
                <div className="grid grid-cols-4 gap-1">
                  {suggestions.minus.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(item);
                      }}
                      className="py-1 px-0.5 text-[10px] font-mono font-bold rounded-md bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-700 text-center transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Positive Powers */}
            {suggestions.plus.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-emerald-600 mb-0.5">
                  {type === 'axis' ? 'Axis (°)' : type === 'pd' ? 'PD (mm)' : 'Plus (+)'}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {suggestions.plus.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(item);
                      }}
                      className="py-1 px-0.5 text-[10px] font-mono font-bold rounded-md bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-center transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Clear option */}
          {value && (
            <div className="pt-1 mt-1 border-t border-slate-100">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange('');
                  setIsOpen(false);
                }}
                className="w-full py-0.5 text-[10px] font-semibold text-slate-500 hover:text-rose-600 text-center transition-colors"
              >
                Clear value
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
