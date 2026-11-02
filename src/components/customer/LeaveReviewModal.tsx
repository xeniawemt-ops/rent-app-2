import React, { useState } from 'react';
import {
  X,
  Star,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Building,
  User,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { RentalAgreement, PropertyReview } from '../../types';
import { StarRating } from '../common/StarRating';
import { backendService } from '../../services/backendService';
import { checkReviewContent } from '../../utils/moderationUtils';

interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: RentalAgreement;
  token?: string;
  onReviewSubmitted: (review: PropertyReview) => void;
}

const AVAILABLE_TAGS = [
  'Full Deposit Returned',
  'Deposit Returned on Time',
  'Responsive Landlord',
  'Prompt Repairs',
  'Quiet & Peaceful',
  'Well-Maintained Flat',
  'Accurate Photos',
  'Great Water Supply',
  'Respects Privacy',
];

export const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  isOpen,
  onClose,
  agreement,
  token,
  onReviewSubmitted,
}) => {
  const [propertyRating, setPropertyRating] = useState<number>(5);
  const [ownerRating, setOwnerRating] = useState<number>(5);
  const [cleanlinessRating, setCleanlinessRating] = useState<number>(5);
  const [maintenanceRating, setMaintenanceRating] = useState<number>(5);
  const [communicationRating, setCommunicationRating] = useState<number>(5);
  const [depositReturnRating, setDepositReturnRating] = useState<number>(5);

  const [title, setTitle] = useState<string>('');
  const [reviewText, setReviewText] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Full Deposit Returned',
    'Responsive Landlord',
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time content safety check
  const liveModeration = checkReviewContent(title, reviewText);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (title.trim().length < 3) {
      setErrorMsg('Please enter a review title of at least 3 characters.');
      return;
    }

    if (reviewText.trim().length < 10) {
      setErrorMsg('Please share at least 10 characters detailing your tenancy experience.');
      return;
    }

    setIsSubmitting(true);

    try {
      const effectiveToken = token || backendService.getAuthToken() || 'dev_session_token';
      const result = backendService.createReview(effectiveToken, {
        agreementId: agreement.id,
        propertyRating,
        ownerRating,
        cleanlinessRating,
        maintenanceRating,
        communicationRating,
        depositReturnRating,
        title: title.trim(),
        reviewText: reviewText.trim(),
        tags: selectedTags,
      });

      setSuccessNotice(
        result.moderationNotice || 'Your verified tenancy review has been submitted successfully.'
      );
      onReviewSubmitted(result.review);

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200/80 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-stone-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h2 id="modal-title" className="font-editorial text-xl font-normal text-stone-900">
                Rate &amp; Review Your Tenancy
              </h2>
              <p className="text-[11px] text-stone-500">
                Verified review for concluded rental agreement &bull; Protected under community guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Concluded Agreement Card */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Concluded Tenancy Verified
                </span>
                <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  {agreement.propertyTitle}
                </h3>
                <p className="text-xs text-stone-500 line-clamp-1">{agreement.propertyAddress}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/60 text-xs text-stone-600">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Owner: <strong className="text-stone-800 font-medium">{agreement.ownerName}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Tenancy: <strong className="text-stone-800 font-medium">{agreement.tenancyPeriodMonths} Months</strong></span>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">Review Submitted!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">{successNotice}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Star Ratings (1-5) */}
            <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/60">
                <div>
                  <h4 className="text-xs font-semibold text-stone-900">Property Quality &amp; Condition</h4>
                  <p className="text-[11px] text-stone-500">How satisfied were you with the physical home and facilities?</p>
                </div>
                <StarRating
                  value={propertyRating}
                  onChange={setPropertyRating}
                  size="md"
                  showText
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-stone-900">Owner &amp; Landlord Experience</h4>
                  <p className="text-[11px] text-stone-500">Communication, cooperation, and timely deposit settlement.</p>
                </div>
                <StarRating
                  value={ownerRating}
                  onChange={setOwnerRating}
                  size="md"
                  showText
                />
              </div>
            </div>

            {/* Sub-ratings Accordion/Grid */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                Detailed Ratings (1-5 Stars)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50/40 p-3.5 rounded-2xl border border-stone-200/70">
                <StarRating
                  label="Cleanliness at Handover"
                  value={cleanlinessRating}
                  onChange={setCleanlinessRating}
                  size="sm"
                  showText
                />
                <StarRating
                  label="Maintenance Responsiveness"
                  value={maintenanceRating}
                  onChange={setMaintenanceRating}
                  size="sm"
                  showText
                />
                <StarRating
                  label="Landlord Communication"
                  value={communicationRating}
                  onChange={setCommunicationRating}
                  size="sm"
                  showText
                />
                <StarRating
                  label="Security Deposit Return"
                  value={depositReturnRating}
                  onChange={setDepositReturnRating}
                  size="sm"
                  showText
                />
              </div>
            </div>

            {/* Quick Experience Tags */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-stone-700">
                Highlights (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900 font-medium shadow-xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Review Title Input */}
            <div>
              <label htmlFor="review-title" className="block text-xs font-medium text-stone-700 mb-1">
                Review Headline <span className="text-rose-500">*</span>
              </label>
              <input
                id="review-title"
                type="text"
                required
                maxLength={120}
                placeholder="e.g. Transparent owner, smooth move-out and full deposit refund"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900 shadow-xs"
              />
            </div>

            {/* Detailed Review Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="review-body" className="block text-xs font-medium text-stone-700">
                  Detailed Experience &amp; Feedback <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-stone-400">{reviewText.length}/1000 characters</span>
              </div>
              <textarea
                id="review-body"
                required
                rows={4}
                maxLength={1000}
                placeholder="Describe your living experience, move-out inspection, neighborhood peacefulness, and landlord responsiveness. (Personal contact info such as phone numbers or emails is strictly prohibited)."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-900 focus:ring-1 focus:ring-stone-900 shadow-xs leading-relaxed"
              />
            </div>

            {/* Automated Content Safety Alert if violation detected in real-time */}
            {!liveModeration.isClean && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-3 rounded-xl space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Content Moderation Notice:
                </div>
                <p>{liveModeration.flaggedReason}</p>
                <p className="text-[10px] text-amber-700 font-light">
                  Please remove phone numbers, contact info, or offensive words to enable instant publication.
                </p>
              </div>
            )}

            {/* Community Standards Notice */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60 text-[11px] text-stone-500 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>
                NivasPay enforces community transparency. Honest constructive reviews are protected. Defamatory speech, personal phone numbers, or spam will be moderated or removed by system administrators.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!successNotice}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Publish Verified Review</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
