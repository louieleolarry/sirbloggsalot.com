import React from 'react';
import { useImpersonation } from '../contexts/ImpersonationContext';
import { XCircleIcon } from 'lucide-react';

const ImpersonationBanner = () => {
  const { impersonatedSite, stopImpersonation } = useImpersonation();

  if (!impersonatedSite) return null;

  return (
    <div className="fixed top-2 right-4 z-50 flex items-center gap-2 bg-yellow-400 text-black text-xs font-medium pl-3 pr-2 py-1.5 rounded-full shadow-md">
      <span className="truncate max-w-[200px]">{impersonatedSite.email}</span>
      <button
        onClick={stopImpersonation}
        className="flex items-center hover:text-gray-700 shrink-0"
        title="Stop Impersonating"
      >
        <XCircleIcon size={16} />
      </button>
    </div>
  );
};

export default ImpersonationBanner;
