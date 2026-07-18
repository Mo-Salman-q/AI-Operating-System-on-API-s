import { CartItem } from '../types';
import { ArrowLeft, Trash2, ShoppingCart, ShoppingBag } from 'lucide-react';

interface StorefrontCartProps {
  cart: CartItem[];
  onRemoveItem: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onBack: () => void;
  onCheckout: () => void;
}

export default function StorefrontCart({
  cart,
  onRemoveItem,
  onUpdateQuantity,
  onBack,
  onCheckout
}: StorefrontCartProps) {
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shipping = 0.00; // Free demo shipping
  const total = subtotal + shipping;

  const handleIncrement = (item: CartItem) => {
    if (item.quantity < item.product.stock) {
      onUpdateQuantity(item.product.id, item.quantity + 1);
    }
  };

  const handleDecrement = (item: CartItem) => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.product.id, item.quantity - 1);
    }
  };

  return (
    <div className="space-y-6" id="storefront-cart">
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Continue Shopping</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 md:p-6">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-900 mb-6">
              <ShoppingCart className="h-5 w-5 text-indigo-400" />
              <h2 className="text-sm font-display uppercase tracking-wider font-semibold text-slate-300">
                Shopping Cart Items ({cart.reduce((sum, i) => sum + i.quantity, 0)})
              </h2>
            </div>

            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-4">
                <ShoppingBag className="h-12 w-12 text-slate-700 mx-auto" />
                <p className="text-sm font-medium">Your shopping cart is empty.</p>
                <button
                  onClick={onBack}
                  className="text-xs font-mono bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Browse Hardware Catalog
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-900/60">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Item info */}
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 bg-slate-950 border border-slate-900 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white leading-snug">{item.product.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{item.product.category}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1">${item.product.price.toFixed(2)} each</p>
                      </div>
                    </div>

                    {/* Actions and quantities */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-slate-900/40 sm:border-t-0 pt-3 sm:pt-0">
                      {/* Quantity adjusting toggle */}
                      <div className="flex items-center space-x-2 bg-slate-950 border border-slate-900 p-1 rounded-lg">
                        <button
                          onClick={() => handleDecrement(item)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-40 hover:bg-slate-900 rounded transition-all cursor-pointer font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono text-xs font-semibold text-slate-300">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleIncrement(item)}
                          disabled={item.quantity >= item.product.stock}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-40 hover:bg-slate-900 rounded transition-all cursor-pointer font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Line subtotal */}
                      <span className="text-sm font-mono font-bold text-white w-20 text-right">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>

                      {/* Remove button */}
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary panel */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 md:p-6 space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-900">
              Order Summary
            </h3>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-300">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shipping (Lab Express)</span>
                <span className="text-emerald-400 font-semibold">FREE</span>
              </div>
              <div className="border-t border-slate-900/60 pt-3.5 flex justify-between text-sm">
                <span className="text-slate-300 font-display font-medium">Est. Total</span>
                <span className="text-white font-bold">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              disabled={cart.length === 0}
              className={`w-full flex items-center justify-center space-x-2 py-3 font-display text-xs font-bold uppercase tracking-wider rounded-xl border shadow-xl transition-all cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/50 hover:shadow-indigo-500/25 hover:scale-[1.01]'
              }`}
            >
              <span>Proceed to Checkout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
