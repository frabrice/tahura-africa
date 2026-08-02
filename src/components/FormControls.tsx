import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

/* ---------- validation helpers ---------- */
export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());
export const phoneDigits = (s: string) => (s || '').replace(/\D/g, '');
export const isValidPhone = (s: string) => {
  const d = phoneDigits(s);
  return d.length >= 9 && d.length <= 15;
};

/* ---------- shared field shell ---------- */
export function Field({
  label, required, hint, error, children,
}: { label: string; required?: boolean; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error
        ? <p className="text-[11px] text-red-600 mt-1">{error}</p>
        : hint ? <p className="text-[11px] text-neutral-400 mt-1">{hint}</p> : null}
    </div>
  );
}

/* ---------- text input (optional leading icon) ---------- */
const shell = 'w-full rounded-lg border text-sm text-neutral-800 placeholder:text-neutral-400 bg-white transition-colors focus:outline-none py-2.5 pr-3';
const ok = 'border-neutral-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200';
const bad = 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  invalid?: boolean;
}
export function TextInput({ icon: Icon, invalid, className = '', ...props }: TextInputProps) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />}
      <input
        {...props}
        className={`${shell} ${invalid ? bad : ok} ${Icon ? 'pl-10' : 'pl-3'} ${className}`}
      />
    </div>
  );
}

export function TextArea({ invalid, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border text-sm text-neutral-800 placeholder:text-neutral-400 bg-white transition-colors focus:outline-none px-3 py-2.5 resize-none ${invalid ? bad : ok} ${className}`}
    />
  );
}

export function SelectInput({ invalid, className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border text-sm text-neutral-800 bg-white transition-colors focus:outline-none px-3 py-2.5 ${invalid ? bad : ok} ${className}`}
    >
      {children}
    </select>
  );
}

/* ---------- phone input with country code (default Rwanda +250) ---------- */
export const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: '+250', label: '🇷🇼 +250' },
  { code: '+254', label: '🇰🇪 +254' },
  { code: '+256', label: '🇺🇬 +256' },
  { code: '+255', label: '🇹🇿 +255' },
  { code: '+257', label: '🇧🇮 +257' },
  { code: '+243', label: '🇨🇩 +243' },
  { code: '+251', label: '🇪🇹 +251' },
  { code: '+27',  label: '🇿🇦 +27' },
  { code: '+1',   label: '🇺🇸 +1' },
  { code: '+44',  label: '🇬🇧 +44' },
  { code: '+33',  label: '🇫🇷 +33' },
  { code: '+49',  label: '🇩🇪 +49' },
  { code: '+86',  label: '🇨🇳 +86' },
  { code: '+91',  label: '🇮🇳 +91' },
];

export function splitPhone(full: string): { code: string; number: string } {
  const m = (full || '').trim().match(/^(\+\d{1,4})\s*(.*)$/);
  if (m && COUNTRY_CODES.some(c => c.code === m[1])) return { code: m[1], number: m[2] };
  return { code: '+250', number: (full || '').trim() };
}

/** Join a code + local number into a stored value; empty number => empty string. */
export function joinPhone(code: string, number: string): string {
  return number.trim() ? `${code} ${number.trim()}` : '';
}

export function PhoneInput({
  value, onChange, invalid,
}: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const { code, number } = splitPhone(value);
  return (
    <div className={`flex rounded-lg border bg-white transition-colors ${invalid ? bad : ok}`}>
      <select
        value={code}
        onChange={e => onChange(joinPhone(e.target.value, number))}
        className="pl-3 pr-1 py-2.5 text-sm bg-transparent border-r border-neutral-200 focus:outline-none rounded-l-lg"
        aria-label="Country code"
      >
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <input
        type="tel"
        value={number}
        onChange={e => onChange(joinPhone(code, e.target.value))}
        placeholder="788 123 456"
        className="flex-1 min-w-0 px-3 py-2.5 text-sm bg-transparent focus:outline-none placeholder:text-neutral-400 rounded-r-lg"
      />
    </div>
  );
}
