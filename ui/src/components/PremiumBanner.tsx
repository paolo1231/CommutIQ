import React, { useState } from 'react';
import { CrownIcon, XIcon } from 'lucide-react';
import { PricingModal } from './PricingModal';
export const PremiumBanner = () => {
  const [showPricing, setShowPricing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return <>
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow-md p-4 mb-8 text-white relative">
        <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-white/80 hover:text-white">
          <XIcon size={16} />
        </button>
        <div className="flex items-center">
          <div className="hidden sm:flex bg-white/20 p-3 rounded-full mr-4">
            <CrownIcon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              Upgrade to CommutIQ Premium
            </h3>
            <p className="text-white/90 text-sm mb-3">
              Get access to expert-curated learning plans, certifications, and
              exclusive partner content.
            </p>
            <button onClick={() => setShowPricing(true)} className="bg-white text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-md font-medium text-sm transition-colors">
              Upgrade for $7.99/month
            </button>
          </div>
        </div>
      </div>
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </>;
};