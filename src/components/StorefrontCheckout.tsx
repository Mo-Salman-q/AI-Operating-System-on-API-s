import { CartItem } from '../types';
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

interface StorefrontCheckoutProps {
  cart: CartItem[];
  onBack: () => void;
  onPlaceOrder: (formData: any) => void;
}

export default function StorefrontCheckout({
  cart,
  onBack,
  onPlaceOrder
}: StorefrontCheckoutProps) {
  const [shippingForm, setShippingForm] = useState({
    fullName: 'Alex Carter',
    email: 'alex.carter@example.com',
    address: '1024 Quantum Way, Suite 404',
    city: 'Techopolis',
    zip: '94016',
    cardNumber: '4242 4242 4242 4242',
    cardExpiry: '12/28',
    cardCvc: '137'
  });

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const total = subtotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlaceOrder(shippingForm);
  };

  const handleInputChange = (field: string, value: string) => {
    setShippingForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6" id="storefront-checkout">
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Return to Cart</span>
      </button>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Customer Billing / Shipping Form Details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 md:p-6 space-y-6">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-900">
              <CreditCard className="h-5 w-5 text-indigo-400" />
              <h2 className="text-sm font-display uppercase tracking-wider font-semibold text-slate-300">
                Billing &amp; Shipping Details
              </h2>
            </div>

            {/* Form grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-slate-500 block uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={shippingForm.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-slate-500 block uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={shippingForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-slate-500 block uppercase">Street Address</label>
                <input
                  type="text"
                  required
                  value={shippingForm.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-slate-500 block uppercase">City</label>
                <input
                  type="text"
                  required
                  value={shippingForm.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-slate-500 block uppercase">Zip / Postal Code</label>
                <input
                  type="text"
                  required
                  value={shippingForm.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 md:p-6 space-y-6">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-900">
              <Lock className="h-4.5 w-4.5 text-indigo-400" />
              <h2 className="text-sm font-display uppercase tracking-wider font-semibold text-slate-300">
                Secure Card Payment (Simulated)
              </h2>
            </div>

            {/* Credit card form details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-slate-500 block uppercase">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={shippingForm.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-500 block uppercase">Expiration Date</label>
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  value={shippingForm.cardExpiry}
                  onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 block uppercase">Security Code (CVC)</label>
                <input
                  type="text"
                  required
                  placeholder="xxx"
                  value={shippingForm.cardCvc}
                  onChange={(e) => handleInputChange('cardCvc', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="bg-slate-950/60 p-3.5 border border-slate-900 rounded-xl flex items-center space-x-2.5 text-[11px] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>TLS 1.3 Encryption. Fully simulated local sandbox.</span>
            </div>
          </div>
        </div>

        {/* Right: Cart Invoice checkout details */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 md:p-6 space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-900">
              Order Basket
            </h3>

            {/* List items mini */}
            <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between items-center text-xs">
                  <div className="truncate pr-3">
                    <span className="text-slate-300 font-semibold">{item.product.name}</span>
                    <span className="text-slate-500 text-[10px] block font-mono">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-mono text-slate-400 font-medium">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-900/60 pt-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-300">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping</span>
                <span className="text-emerald-400 font-bold">FREE</span>
              </div>
              <div className="border-t border-slate-900/60 pt-4 flex justify-between text-sm">
                <span className="text-slate-300 font-display">Order Total</span>
                <span className="text-white font-bold">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-display text-xs font-bold uppercase tracking-wider rounded-xl border border-indigo-500/50 shadow-xl shadow-indigo-950/20 hover:shadow-indigo-500/25 hover:scale-[1.01] transition-all cursor-pointer"
            >
              <span>Place Order</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
