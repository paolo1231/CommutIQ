import React from 'react';
import { XIcon, CheckIcon, CrownIcon } from 'lucide-react';
export const PricingModal = ({
  onClose
}) => {
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Upgrade to Premium</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XIcon size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 p-4 rounded-full">
              <CrownIcon size={32} className="text-amber-600" />
            </div>
          </div>
          <div className="flex justify-center mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-800">
                $7.99
                <span className="text-lg font-normal text-gray-500">
                  /month
                </span>
              </div>
              <p className="text-gray-500 mt-1">Cancel anytime</p>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <CheckIcon size={20} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700">
                Access to{' '}
                <span className="font-medium">curated learning plans</span>{' '}
                designed by education experts
              </p>
            </div>
            <div className="flex items-start">
              <CheckIcon size={20} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700">
                Earn <span className="font-medium">certificates</span> to
                showcase your knowledge
              </p>
            </div>
            <div className="flex items-start">
              <CheckIcon size={20} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700">
                Exclusive <span className="font-medium">partner content</span>{' '}
                from leading educators
              </p>
            </div>
            <div className="flex items-start">
              <CheckIcon size={20} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700">
                Unlimited access to{' '}
                <span className="font-medium">all subjects</span> and advanced
                lessons
              </p>
            </div>
            <div className="flex items-start">
              <CheckIcon size={20} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700">
                <span className="font-medium">Ad-free</span> learning experience
              </p>
            </div>
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-md font-medium transition-colors">
            Start 7-Day Free Trial
          </button>
          <p className="text-xs text-center text-gray-500 mt-4">
            By upgrading, you agree to our Terms of Service and Privacy Policy.
            Your subscription will automatically renew each month until
            canceled.
          </p>
        </div>
      </div>
    </div>;
};