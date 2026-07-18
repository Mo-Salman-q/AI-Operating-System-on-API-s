import { Product } from '../types';
import { ArrowLeft, ShoppingCart, Check, Info } from 'lucide-react';
import { useState } from 'react';

interface StorefrontDetailProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export default function StorefrontDetail({
  product,
  onBack,
  onAddToCart
}: StorefrontDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-6" id="storefront-product-detail">
      {/* Back to Catalog Trigger */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Product Listing</span>
      </button>

      {/* Main product display box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-8">
        {/* Left: Beautiful Large Product Image Frame */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-[4/3] w-full rounded-2xl bg-slate-950 border border-slate-900 relative overflow-hidden group">
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Diagnostic Note */}
          <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex items-start space-x-3 text-xs text-slate-400">
            <Info className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="leading-normal">
              Purchasing this item generates a multi-stage microservice transaction simulation. If a simulation failure is injected in the admin dashboard, the sequence will abort accordingly.
            </p>
          </div>
        </div>

        {/* Right: Technical specs and checkout panel */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-indigo-400 uppercase">
                {product.category}
              </span>
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white mt-1">
                {product.name}
              </h1>
              <div className="flex items-center space-x-3 mt-3">
                <span className="text-2xl font-display font-bold text-white">
                  ${product.price.toFixed(2)}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                <span className={`text-xs font-mono font-semibold ${product.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-900/60 pt-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Description</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Specifications Details */}
            <div className="border-t border-slate-900/60 pt-4">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3">Specification Matrix</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="p-2.5 bg-slate-950/50 border border-slate-900 rounded-lg">
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">{key}</span>
                    <span className="text-slate-200 font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="border-t border-slate-900 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Quantity Selector */}
            <div className="flex items-center space-x-3 bg-slate-950 border border-slate-900 p-1.5 rounded-xl">
              <button
                onClick={handleDecrement}
                disabled={quantity <= 1}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-40 hover:bg-slate-900 rounded-lg transition-all cursor-pointer font-bold"
              >
                -
              </button>
              <span className="w-10 text-center font-mono text-sm font-semibold text-white">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                disabled={quantity >= product.stock}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-40 hover:bg-slate-900 rounded-lg transition-all cursor-pointer font-bold"
              >
                +
              </button>
            </div>

            {/* Add to Cart Trigger */}
            <button
              onClick={handleAddToCart}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 font-display text-sm font-semibold rounded-xl border shadow-xl transition-all cursor-pointer ${
                added
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/5'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/50 hover:shadow-indigo-500/20 hover:scale-[1.01]'
              }`}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Added to Cart</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
