import { CheckCircle, AlertCircle, Sparkles, RefreshCw, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

interface StorefrontResultProps {
  isSuccess: boolean;
  errorMsg: string;
  orderId: string;
  onRestart: () => void;
  onAskAI: (errorContext: string) => void;
}

export default function StorefrontResult({
  isSuccess,
  errorMsg,
  orderId,
  onRestart,
  onAskAI
}: StorefrontResultProps) {
  // Generate random order confirmation code
  const confirmationCode = orderId || `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  // Map backend raw errors into polite, high-quality front-end buyer notices
  const getFriendlyErrorMessage = (raw: string) => {
    const errorStr = raw.toLowerCase();
    if (errorStr.includes('unauthorized') || errorStr.includes('expired_signature') || errorStr.includes('expired')) {
      return 'Customer Session Expired. Your security verification token is invalid or expired. Please sign in and try again.';
    }
    if (errorStr.includes('rate limit') || errorStr.includes('pool exhausted') || errorStr.includes('redis-cart')) {
      return 'Server Capacity Saturated. Our inventory nodes are experiencing temporary high volume. Please check back in a few seconds.';
    }
    if (errorStr.includes('postgresql database timeout') || errorStr.includes('database timeout') || errorStr.includes('connection timed out')) {
      return 'Payment Authorization Gateway Timeout. The payment processor is currently unable to establish database handshakes. Your card has not been charged.';
    }
    if (errorStr.includes('enospc') || errorStr.includes('no space left on device') || errorStr.includes('disk full')) {
      return 'Order Register Error. The database journal writes failed due to storage volume limitations on the master node.';
    }
    return raw || 'An unexpected payment processor gateway error has occurred (Code: GW_504). Please try again.';
  };

  return (
    <div className="max-w-md mx-auto" id="storefront-result-view">
      {isSuccess ? (
        /* SUCCESS VIEW */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-8 text-center space-y-6"
        >
          <div className="h-14 w-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-white">Order Confirmed!</h2>
            <p className="text-xs text-slate-400">Thank you for your order. We are preparing your shipment.</p>
          </div>

          {/* Receipt details */}
          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 text-xs font-mono text-left space-y-2.5">
            <div className="flex justify-between border-b border-slate-900 pb-2 text-[10px] text-slate-500">
              <span>Receipt Date</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID</span>
              <span className="text-slate-200 font-semibold">{confirmationCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shipping Mode</span>
              <span className="text-slate-200">Lab Express (Free)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Status</span>
              <span className="text-emerald-400 font-semibold">PAID</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onRestart}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/20"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Continue Shopping</span>
            </button>
          </div>
        </motion.div>
      ) : (
        /* FAILURE VIEW */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-8 text-center space-y-6"
        >
          <div className="h-14 w-14 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-white">We couldn&apos;t process your order</h2>
            <p className="text-xs text-slate-400">Your transaction was aborted by our safety checkpoints.</p>
          </div>

          {/* Friendly customer message */}
          <div className="bg-rose-950/10 border border-rose-500/15 p-4 rounded-2xl text-left space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block font-semibold">
              Gateway Anomaly Response
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {getFriendlyErrorMessage(errorMsg)}
            </p>
          </div>

          {/* DevOps CTA links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={onRestart}
              className="flex items-center justify-center space-x-1.5 border border-slate-850 bg-slate-950 hover:bg-slate-900 text-slate-300 text-xs py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </button>

            <button
              onClick={() => onAskAI(errorMsg)}
              className="flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
              <span>Ask RCA Troubleshooter</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
