import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { AccountDashboard } from './AccountDashboard';

import { MainAppSection } from '../../App';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: MainAppSection;
  currentCustomerId: string;
  currentOwnerId: string;
  onSwitchCustomerId: (id: string) => void;
  onSwitchOwnerId: (id: string) => void;
  onOpenTerms: () => void;
  onOpenPolicies: (defaultTab?: 'regulations_eula' | 'refund_policy') => void;
  onResetData?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  activeSection,
  currentCustomerId,
  currentOwnerId,
  onSwitchCustomerId,
  onSwitchOwnerId,
  onOpenTerms,
  onOpenPolicies,
  onResetData,
}) => {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  if (!isOpen) return null;

  const currentUserId = activeSection === 'customer_app' ? currentCustomerId : currentOwnerId;
  const userRole = activeSection === 'customer_app' ? 'customer' : 'owner';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <AccountDashboard
          currentUserId={currentUserId}
          userRole={userRole}
          onCloseModal={onClose}
          onLogout={() => {
            onClose();
          }}
        />
      </div>
    </div>
  );
};
