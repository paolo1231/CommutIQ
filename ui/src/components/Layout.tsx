import React, { useState } from 'react';
import { BookOpenIcon, CrownIcon } from 'lucide-react';
import { PricingModal } from './PricingModal';
export const Layout = ({
  children
}) => {
  const [showPricing, setShowPricing] = useState(false);
  return <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <BookOpenIcon className="mr-2" />
            <h1 className="text-xl font-bold">CommutIQ</h1>
          </div>
          <button onClick={() => setShowPricing(true)} className="flex items-center bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-md text-sm font-medium transition-colors">
            <CrownIcon size={16} className="mr-1" />
            Upgrade
          </button>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 md:p-8">{children}</main>
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </div>;
};