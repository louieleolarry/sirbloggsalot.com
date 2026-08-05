import React from 'react';
import { XIcon, HeartHandshakeIcon } from 'lucide-react';
import { BaseModal } from './Modals';

const SupportModal = ({ onClose }) => {
  return (
    <BaseModal onClose={onClose} className="max-w-md">
      <div>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Need Help?
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <HeartHandshakeIcon className="h-16 w-16 text-primary" />
            <p className="text-lg font-medium">We're here to help! 😊</p>
            <p className="text-gray-600">
              Have questions or need assistance? Drop us a line at:
            </p>
            <a 
              href="mailto:adam@blawgy.com"
              className="text-primary font-medium hover:underline"
            >
              adam@blawgy.com
            </a>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default SupportModal;