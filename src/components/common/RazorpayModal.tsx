import React, { useState } from 'react';
import { ShieldCheck, CreditCard, Smartphone, Building, CheckCircle2, Lock, X } from 'lucide-react';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentMethod: 'upi' | 'card' | 'netbanking', upiVpa?: string) => void;
  amount: number;
  title: string;
  subtitle: string;
  isEscrow?: boolean;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  amount,
  title,
  subtitle,
  isEscrow = true,
}) => {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiVpa, setUpiVpa] = useState<string>('aarav@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(method, method === 'upi' ? upiVpa : undefined);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* NivasPay Direct Payment Top Bar */}
        <div className="bg-emerald-900 px-5 py-4 flex items-center justify-between text-white border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center font-bold text-sm tracking-tight border border-emerald-700">
              ₹
            </div>
            <div>
              <div className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                <span>NivasPay Direct Pay</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded font-mono">Verified</span>
              </div>
              <div className="text-sm font-bold text-white tracking-wide">₹{amount.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-emerald-950/70 px-5 py-2.5 border-b border-emerald-900/60 flex items-center gap-2 text-[11px] text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>RBI-Authorized Payment Aggregator • NPCI UPI &amp; Bank Direct</span>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setMethod('upi')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                method === 'upi'
                  ? 'bg-blue-900/40 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>UPI / QR</span>
            </button>

            <button
              onClick={() => setMethod('card')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                method === 'card'
                  ? 'bg-blue-900/40 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>Cards</span>
            </button>

            <button
              onClick={() => setMethod('netbanking')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                method === 'netbanking'
                  ? 'bg-blue-900/40 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building className="w-4 h-4 text-purple-400" />
              <span>NetBanking</span>
            </button>
          </div>

          {/* Method Fields */}
          {method === 'upi' && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-xs font-medium text-slate-300">Enter UPI ID (Google Pay, PhonePe, Paytm, BHIM)</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={upiVpa}
                  onChange={e => setUpiVpa(e.target.value)}
                  placeholder="yourname@okaxis"
                  className="flex-1 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {['aarav@okhdfcbank', 'tenant@okicici', 'user@paytm'].map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUpiVpa(id)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <input
                type="text"
                readOnly
                value="4532 •••• •••• 8910"
                className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-300 font-mono"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value="12/28"
                  className="w-1/2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-300 font-mono"
                />
                <input
                  type="password"
                  readOnly
                  value="•••"
                  className="w-1/2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-300 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500">Demo RuPay / Visa Sandbox Token</p>
            </div>
          )}

          {method === 'netbanking' && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="text-slate-300">Select Bank:</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900 border border-blue-500 text-white rounded-lg font-medium text-center">HDFC Bank</div>
                <div className="p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-center">ICICI Bank</div>
                <div className="p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-center">SBI</div>
                <div className="p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-center">Axis Bank</div>
              </div>
            </div>
          )}

          {/* Financial Policy & Disclosure */}
          <div className="text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{amount === 20 ? 'Application Processing Fee Policy' : 'Security Deposit & Tenancy Escrow'}</span>
            </div>
            {amount === 20 ? (
              <p>
                The ₹20 fee covers tenant suitability evaluation and technical submission processing. It is strictly non-refundable under all circumstances. If accepted by the owner, brokerage of <strong>10% of one month&apos;s rent</strong> applies. Property owners do not pay brokerage.
              </p>
            ) : (
              <p>
                Security deposit is 100% held in escrow for your tenancy. Tenancy brokerage equal to <strong>10% of one month&apos;s rent</strong> is credited to NivasPay platform revenue. Property owners do not pay brokerage.
              </p>
            )}
          </div>

          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing secure payment...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Pay ₹{amount.toLocaleString('en-IN')} Securely</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
