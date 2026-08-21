import { CreditCard, Smartphone } from 'lucide-react';
import type { ActiveGateway } from '../lib/paymentGateway';

export type PaymentMethodId = 'flutterwave_card' | 'flutterwave_momo' | 'card' | 'mtn_momo' | 'airtel_money';

interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  description: string;
  icon: typeof CreditCard;
  badge?: string;
  accent: string;
}

const FLUTTERWAVE_OPTIONS: PaymentMethodOption[] = [
  {
    id: 'flutterwave_card',
    label: 'Card Payment',
    description: 'Visa, Mastercard, and more',
    icon: CreditCard,
    accent: 'border-blue-500 bg-blue-50',
  },
  {
    id: 'flutterwave_momo',
    label: 'Mobile Money',
    description: 'MTN MoMo or Airtel Money',
    icon: Smartphone,
    badge: 'MoMo',
    accent: 'border-amber-500 bg-amber-50',
  },
];

const LEGACY_OPTIONS: PaymentMethodOption[] = [
  {
    id: 'card',
    label: 'Card Payment',
    description: 'Visa, Mastercard, Amex',
    icon: CreditCard,
    accent: 'border-blue-500 bg-blue-50',
  },
  {
    id: 'mtn_momo',
    label: 'MTN Mobile Money',
    description: 'Pay with your MTN MoMo wallet',
    icon: Smartphone,
    badge: 'MoMo',
    accent: 'border-amber-500 bg-amber-50',
  },
  {
    id: 'airtel_money',
    label: 'Airtel Money',
    description: 'Pay with your Airtel Money wallet',
    icon: Smartphone,
    badge: 'Airtel',
    accent: 'border-rose-500 bg-rose-50',
  },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethodId | null;
  onChange: (method: PaymentMethodId) => void;
  gateway: ActiveGateway;
}

export function PaymentMethodSelector({ value, onChange, gateway }: PaymentMethodSelectorProps) {
  const OPTIONS = gateway === 'flutterwave' ? FLUTTERWAVE_OPTIONS : LEGACY_OPTIONS;
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
        Choose Payment Method
      </h4>
      <div className="grid gap-2.5">
        {OPTIONS.map((opt) => {
          const selected = value === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                selected
                  ? `${opt.accent} shadow-sm`
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selected ? 'bg-white' : 'bg-neutral-100'
              }`}>
                <Icon className={`w-5 h-5 ${selected ? 'text-neutral-900' : 'text-neutral-500'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${selected ? 'text-neutral-900' : 'text-neutral-700'}`}>
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      selected ? 'bg-white/70 text-neutral-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${selected ? 'text-neutral-600' : 'text-neutral-400'}`}>
                  {opt.description}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300'
              }`}>
                {selected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed pt-1">
        {gateway === 'flutterwave'
          ? 'Processed securely via Flutterwave.'
          : "Cards are processed securely via Pesapal. MTN MoMo & Airtel Money are processed via InTouch — you'll approve a prompt on your phone."}
      </p>
    </div>
  );
}
