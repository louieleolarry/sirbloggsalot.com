import React from 'react';
import AdminPanel from './AdminPanel';
import { XIcon } from 'lucide-react';

const AdminModal = ({ onClose, email }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">User Management</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto">
          <AdminPanel adminEmail={email} />
        </div>
      </div>
    </div>
  );
};

export default AdminModal;