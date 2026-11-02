import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value?: number; // 0 to 5 (supports decimals for display)
  rating?: number; // alias for value
  onChange?: (rating: number) => void;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  label?: string;
  showText?: boolean;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  rating,
  onChange,
  maxStars = 5,
  size = 'md',
  readOnly = false,
  label,
  showText = false,
}) => {
  const numericValue = value !== undefined ? value : (rating !== undefined ? rating : 0);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const activeRating = hoverValue !== null ? hoverValue : numericValue;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-xs font-medium text-stone-700 flex items-center justify-between">
          <span>{label}</span>
          {showText && activeRating > 0 && (
            <span className="text-stone-500 font-normal text-[11px]">
              {RATING_LABELS[Math.round(activeRating)] || ''} ({activeRating.toFixed(1)})
            </span>
          )}
        </span>
      )}
      <div
        className="flex items-center gap-1"
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={label || `Rating: ${numericValue} of ${maxStars} stars`}
      >
        {Array.from({ length: maxStars }, (_, i) => {
          const starNumber = i + 1;
          const isFilled = activeRating >= starNumber;
          const isHalf = !isFilled && activeRating >= starNumber - 0.5;

          return (
            <button
              key={starNumber}
              type="button"
              disabled={readOnly}
              onClick={() => onChange && onChange(starNumber)}
              onMouseEnter={() => !readOnly && setHoverValue(starNumber)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              onFocus={() => !readOnly && setHoverValue(starNumber)}
              onBlur={() => !readOnly && setHoverValue(null)}
              className={`transition-transform focus:outline-hidden ${
                readOnly
                  ? 'cursor-default'
                  : 'cursor-pointer hover:scale-110 focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm'
              }`}
              aria-label={`${starNumber} Star${starNumber > 1 ? 's' : ''}`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : isHalf
                    ? 'fill-amber-200 text-amber-400'
                    : 'text-stone-300 fill-stone-100 hover:text-stone-400'
                }`}
              />
            </button>
          );
        })}

        {showText && !label && (
          <span className="text-xs font-semibold text-stone-700 ml-1.5">
            {numericValue > 0 ? numericValue.toFixed(1) : 'Not rated'}
          </span>
        )}
      </div>
    </div>
  );
};
