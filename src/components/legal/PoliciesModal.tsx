import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  RotateCcw,
  Scale,
  Lock,
  FileText
} from 'lucide-react';
import { TermsOfServiceModal } from './TermsOfServiceModal';
import { RefundPolicyModal } from './RefundPolicyModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface PoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'terms_of_service' | 'refund_policy' | 'privacy_policy' | 'regulations_eula';
  onOpenTerms?: () => void;
}

export const PoliciesModal: React.FC<PoliciesModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms_of_service',
}) => {
  const [activePolicy, setActivePolicy] = useState<'terms' | 'refunds' | 'privacy'>(
    defaultTab === 'refund_policy' ? 'refunds' : defaultTab === 'privacy_policy' ? 'privacy' : 'terms'
  );

  if (!isOpen) return null;

  if (activePolicy === 'terms') {
    return (
      <TermsOfServiceModal
        isOpen={isOpen}
        onClose={onClose}
        onOpenRefunds={() => setActivePolicy('refunds')}
        onOpenPrivacy={() => setActivePolicy('privacy')}
      />
    );
  }

  if (activePolicy === 'refunds') {
    return (
      <RefundPolicyModal
        isOpen={isOpen}
        onClose={onClose}
        onOpenTerms={() => setActivePolicy('terms')}
      />
    );
  }

  return (
    <PrivacyPolicyModal
      isOpen={isOpen}
      onClose={onClose}
      onOpenTerms={() => setActivePolicy('terms')}
    />
  );
};
