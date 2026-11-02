import React from 'react';
import { TermsOfServiceModal } from './TermsOfServiceModal';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPolicies?: () => void;
}

/**
 * Re-exporting comprehensive Terms of Service modal as TermsAndConditionsModal
 * to preserve compatibility with existing routes and components.
 */
export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onClose,
  onOpenPolicies,
}) => {
  return (
    <TermsOfServiceModal
      isOpen={isOpen}
      onClose={onClose}
      onOpenRefunds={onOpenPolicies}
    />
  );
};
