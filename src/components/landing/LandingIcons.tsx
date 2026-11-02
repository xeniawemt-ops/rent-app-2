import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Premium Architectural SVG Icon for "To Rent" (Tenant Discovery Workflow)
 * Features an architecturally refined modern residence with pitched roofline,
 * arched doorway, multi-pane window, and subtle compass/discovery accent geometry.
 */
export const ToRentPropertyIcon: React.FC<IconProps> = ({
  className = 'w-8 h-8',
  size,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
      {...props}
    >
      {/* Soft Architectural Interior Fill Accent */}
      <path
        d="M16 3.5L4 13V27.5C4 28.3284 4.67157 29 5.5 29H26.5C27.3284 29 28 28.3284 28 27.5V13L16 3.5Z"
        fill="currentColor"
        fillOpacity="0.08"
      />
      
      {/* Chimney */}
      <path
        d="M21 7.5V5H25V10.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Roof Gable & Eaves */}
      <path
        d="M2.5 14L16 3.5L29.5 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Outer Walls & Foundation */}
      <path
        d="M5.5 12.5V27.5C5.5 28.3284 6.17157 29 7 29H25C25.8284 29 26.5 28.3284 26.5 27.5V12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Arched Entrance Doorway */}
      <path
        d="M12.5 29V20C12.5 18.067 14.067 16.5 16 16.5C17.933 16.5 19.5 18.067 19.5 20V29"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Door Handle */}
      <circle cx="17.5" cy="22.5" r="0.75" fill="currentColor" />

      {/* Multi-pane Architectural Window */}
      <rect
        x="8.5"
        y="14.5"
        width="4"
        height="4"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="10.5" y1="14.5" x2="10.5" y2="18.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="8.5" y1="16.5" x2="12.5" y2="16.5" stroke="currentColor" strokeWidth="1.2" />

      {/* Compass / Keyhole Discovery Star (Upper Crest) */}
      <path
        d="M16 8L16.6 9.4L18 10L16.6 10.6L16 12L15.4 10.6L14 10L15.4 9.4L16 8Z"
        fill="currentColor"
      />
    </svg>
  );
};

/**
 * Premium Estate Management SVG Icon for "List Your Property" (Owner / Landlord Workflow)
 * Features a stately multi-tier architectural estate with balconies, verified crest,
 * and a precision landlord key symbol signaling property governance & remittances.
 */
export const ListPropertyEstateIcon: React.FC<IconProps> = ({
  className = 'w-8 h-8',
  size,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
      {...props}
    >
      {/* Background Soft Facade Fill */}
      <rect
        x="4"
        y="6"
        width="17"
        height="23"
        rx="2"
        fill="currentColor"
        fillOpacity="0.08"
      />

      {/* Main Building Frame */}
      <rect
        x="4"
        y="6"
        width="17"
        height="23"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Architectural Storey Windows */}
      <rect x="7" y="9.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="13" y="9.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7" y="14.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="13" y="14.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7" y="19.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="13" y="19.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" />

      {/* Building Entrance */}
      <path
        d="M10 29V25H15V29"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Roofline Cornice Accent */}
      <line x1="2.5" y1="6" x2="22.5" y2="6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />

      {/* Landlord Crest Badge (Shield with Key) on the Right */}
      <g className="transform translate-x-1 translate-y-1">
        {/* Shield Backplate */}
        <path
          d="M23 12C26.5 12 28.5 13.5 28.5 16.5C28.5 21.5 24 25.5 23 26.5C22 25.5 17.5 21.5 17.5 16.5C17.5 13.5 19.5 12 23 12Z"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Precision Landlord Key Emblem */}
        <circle
          cx="23"
          cy="16.5"
          r="2.2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M23 18.7V23.5M23 21.5H25M23 23H24.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
