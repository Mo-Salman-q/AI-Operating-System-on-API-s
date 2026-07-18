import { Product } from '../types';
import { Search, ShoppingBag, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { STORE_PRODUCTS } from '../products';

interface StorefrontHomeProps {
  onSelectProduct: (product: Product) => void;
  onNavigateToCart: () => void;
  cartItemCount: number;
}

export default function StorefrontHome({
  onSelectProduct,
  onNavigateToCart,
  cartItemCount
}: StorefrontHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Hardware Systems', 'Peripherals', 'Displays', 'Diagnostic Tools', 'Security Systems'];

  const filteredProducts = STORE_PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8" id="storefront-home-view">
      {/* Promo Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 md:p-12" id="storefront-hero">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="px-3 py-1 text-xs font-mono font-medium tracking-wider uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            Special Lab Equipment Sale
          </span>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white leading-tight">
            Next-Generation Tools for Modern DevOps Labs
          </h1>
          <p className="text-sm md:text-base text-slate-400 leading-relaxed">
            Equip your workspace with the industry&apos;s leading microservice telemetry nodes, volumetric database display hubs, and physical-layer secure keys.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onSelectProduct(STORE_PRODUCTS[0])}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 hover:translate-x-0.5 cursor-pointer"
            >
              <span>Featured: Aetheris Core Pro</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6" id="storefront-controls">
        {/* Category Pill Filters */}
        <div className="flex flex-wrap gap-2 order-2 md:order-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                activeCategory === category
                  ? 'bg-indigo-600/15 border-indigo-500/30 text-indigo-400 shadow-sm'
                  : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 order-1 md:order-2">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 hover:border-slate-800 text-sm text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-sans"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ShoppingBag className="h-12 w-12 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-medium">No products match your criteria.</p>
          <button
            onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
            className="text-xs text-indigo-400 mt-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="products-catalog-grid">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden cursor-pointer group hover:border-slate-800 hover:shadow-xl hover:shadow-indigo-950/5 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Image Wrap */}
                <div className="aspect-[4/3] w-full bg-slate-950 relative overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.stock <= 5 && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 border border-amber-500/25 text-amber-400 font-semibold rounded">
                      Only {product.stock} left
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 px-2 py-0.5 text-[9px] font-mono tracking-wider bg-slate-950/80 text-slate-400 border border-slate-800 rounded">
                    {product.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-display font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Price & Action footer */}
              <div className="p-5 pt-0 border-t border-slate-900/60 mt-4 flex items-center justify-between">
                <span className="text-lg font-display font-bold text-white">
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-xs font-mono font-medium text-indigo-400 flex items-center group-hover:translate-x-1 transition-transform">
                  <span>View Details</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
