import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Check, X, ShieldAlert, Cpu, Server, CreditCard, Database } from 'lucide-react';
import { LogEvent } from '../types';

interface StorefrontProcessingProps {
  logs: LogEvent[];
  activeFailure: string;
  onComplete: (isSuccess: boolean, errorMsg: string) => void;
}

export default function StorefrontProcessing({
  logs,
  activeFailure,
  onComplete
}: StorefrontProcessingProps) {
  const [step, setStep] = useState<'auth' | 'cart' | 'payment' | 'order'>('auth');
  const [statuses, setStatuses] = useState<Record<string, 'pending' | 'running' | 'success' | 'failed'>>({
    auth: 'running',
    cart: 'pending',
    payment: 'pending',
    order: 'pending'
  });

  useEffect(() => {
    // Reverse logs or filter logs for current request ID
    if (logs.length === 0) return;
    const reqId = logs[0].requestId;
    const thisRunLogs = logs.filter(l => l.requestId === reqId).reverse();

    const runSimulation = async () => {
      // 1. Auth Service Sequence
      await delay(700);
      const authError = thisRunLogs.find(l => l.service === 'Auth' && l.level === 'error');
      if (authError) {
        setStatuses(prev => ({ ...prev, auth: 'failed' }));
        await delay(500);
        onComplete(false, authError.message);
        return;
      }
      setStatuses(prev => ({ ...prev, auth: 'success', cart: 'running' }));
      setStep('cart');

      // 2. Cart Service Sequence
      await delay(800);
      const cartError = thisRunLogs.find(l => l.service === 'Cart' && l.level === 'error');
      if (cartError) {
        setStatuses(prev => ({ ...prev, cart: 'failed' }));
        await delay(500);
        onComplete(false, cartError.message);
        return;
      }
      setStatuses(prev => ({ ...prev, cart: 'success', payment: 'running' }));
      setStep('payment');

      // 3. Payment Service Sequence
      // Introduce longer DB timeout delays to make it look realistic
      const paymentDelay = activeFailure === 'payment_db_timeout' ? 1800 : 950;
      await delay(paymentDelay);
      const paymentError = thisRunLogs.find(l => l.service === 'Payment' && l.level === 'error');
      if (paymentError) {
        setStatuses(prev => ({ ...prev, payment: 'failed' }));
        await delay(500);
        onComplete(false, paymentError.message);
        return;
      }
      setStatuses(prev => ({ ...prev, payment: 'success', order: 'running' }));
      setStep('order');

      // 4. Order Service Sequence
      await delay(750);
      const orderError = thisRunLogs.find(l => l.service === 'Order' && l.level === 'error');
      if (orderError) {
        setStatuses(prev => ({ ...prev, order: 'failed' }));
        await delay(500);
        onComplete(false, orderError.message);
        return;
      }
      setStatuses(prev => ({ ...prev, order: 'success' }));
      await delay(500);
      onComplete(true, '');
    };

    runSimulation();
  }, [logs]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const renderStatusIcon = (status: 'pending' | 'running' | 'success' | 'failed') => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4.5 w-4.5 text-indigo-400 animate-spin" />;
      case 'success':
        return (
          <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Check className="h-3 w-3" />
          </div>
        );
      case 'failed':
        return (
          <div className="h-4.5 w-4.5 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <X className="h-3 w-3" />
          </div>
        );
      default:
        return <div className="h-2 w-2 rounded-full bg-slate-800" />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-8 space-y-8 text-center" id="checkout-processing-view">
      <div className="space-y-3">
        <div className="h-14 w-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 relative">
          <Cpu className="h-7 w-7 animate-pulse" />
          <div className="absolute inset-0 rounded-2xl border border-indigo-500/20 animate-ping opacity-30" />
        </div>
        <h3 className="text-lg font-display font-bold text-white">Securing Secure Transaction</h3>
        <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
          Contacting encrypted payment nodes and checking inventory allocation across live microservice APIs...
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-4 text-left max-w-sm mx-auto">
        {/* Step 1: Auth */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          statuses.auth === 'running'
            ? 'bg-indigo-600/5 border-indigo-500/30 text-indigo-300'
            : statuses.auth === 'failed'
            ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            : statuses.auth === 'success'
            ? 'bg-slate-950/40 border-slate-900/80 text-slate-400'
            : 'bg-slate-950/20 border-transparent text-slate-600'
        }`}>
          <div className="flex items-center space-x-3">
            <Server className={`h-4.5 w-4.5 ${statuses.auth === 'running' ? 'text-indigo-400' : ''}`} />
            <div>
              <h4 className="text-xs font-semibold">1. Auth Gateway</h4>
              <p className="text-[10px] opacity-70">Verifying customer security tokens</p>
            </div>
          </div>
          <div>{renderStatusIcon(statuses.auth)}</div>
        </div>

        {/* Step 2: Cart */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          statuses.cart === 'running'
            ? 'bg-indigo-600/5 border-indigo-500/30 text-indigo-300'
            : statuses.cart === 'failed'
            ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            : statuses.cart === 'success'
            ? 'bg-slate-950/40 border-slate-900/80 text-slate-400'
            : 'bg-slate-950/20 border-transparent text-slate-600'
        }`}>
          <div className="flex items-center space-x-3">
            <Database className={`h-4.5 w-4.5 ${statuses.cart === 'running' ? 'text-indigo-400' : ''}`} />
            <div>
              <h4 className="text-xs font-semibold">2. Cart &amp; Stock Manager</h4>
              <p className="text-[10px] opacity-70">Reserving stock catalog allocations</p>
            </div>
          </div>
          <div>{renderStatusIcon(statuses.cart)}</div>
        </div>

        {/* Step 3: Payment */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          statuses.payment === 'running'
            ? 'bg-indigo-600/5 border-indigo-500/30 text-indigo-300'
            : statuses.payment === 'failed'
            ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            : statuses.payment === 'success'
            ? 'bg-slate-950/40 border-slate-900/80 text-slate-400'
            : 'bg-slate-950/20 border-transparent text-slate-600'
        }`}>
          <div className="flex items-center space-x-3">
            <CreditCard className={`h-4.5 w-4.5 ${statuses.payment === 'running' ? 'text-indigo-400' : ''}`} />
            <div>
              <h4 className="text-xs font-semibold">3. Payment Gateway</h4>
              <p className="text-[10px] opacity-70">Settling credits via Stripe API</p>
            </div>
          </div>
          <div>{renderStatusIcon(statuses.payment)}</div>
        </div>

        {/* Step 4: Order */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
          statuses.order === 'running'
            ? 'bg-indigo-600/5 border-indigo-500/30 text-indigo-300'
            : statuses.order === 'failed'
            ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            : statuses.order === 'success'
            ? 'bg-slate-950/40 border-slate-900/80 text-slate-400'
            : 'bg-slate-950/20 border-transparent text-slate-600'
        }`}>
          <div className="flex items-center space-x-3">
            <Database className={`h-4.5 w-4.5 ${statuses.order === 'running' ? 'text-indigo-400' : ''}`} />
            <div>
              <h4 className="text-xs font-semibold">4. Master Order System</h4>
              <p className="text-[10px] opacity-70">Storing shipping invoices to disk</p>
            </div>
          </div>
          <div>{renderStatusIcon(statuses.order)}</div>
        </div>
      </div>

      <div className="text-[10px] font-mono text-slate-600">
        Active Simulation: {activeFailure === 'none' ? 'HEALTHY' : activeFailure.toUpperCase()}
      </div>
    </div>
  );
}
