import React, { useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
  Lock,
  CheckCircle,
  Clock,
  FileText,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Grid,
  Layers,
  ImageIcon,
  Eye,
  Download,
  Trash2,
  HelpCircle,
  Globe,
  Check,
  Flag,
  Bed,
  Bath,
  Square,
  Car,
  Heart,
  Calendar,
  SlidersHorizontal,
  Phone,
  X,
  CreditCard,
  Building,
  Building2,
  Home,
  Mail,
  Compass,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Star,
  MessageSquareQuote,
  ThumbsUp
} from 'lucide-react';
import { Listing, CustomerProfile, Application, PaymentRecord, RentalAgreement, PropertyReview } from '../../types';
import { backendService } from '../../services/backendService';
import { DPDP_NOTICE_TEXT, GRIEVANCE_OFFICER } from '../../constants/dpdpNotice';
import { RazorpayModal } from '../common/RazorpayModal';
import { AccountDashboard } from '../profile/AccountDashboard';
import { PanoramaViewer } from '../common/PanoramaViewer';
import { StarRating } from '../common/StarRating';
import { LeaveReviewModal } from './LeaveReviewModal';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime, formatApplicationDate, formatAbsoluteDate } from '../../utils/dateUtils';

interface CustomerAppProps {
  currentUserId: string;
  onSwitchUser?: (userId: string) => void;
  onOpenTerms?: () => void;
  onOpenPolicies?: (defaultTab?: 'regulations_eula' | 'refund_policy') => void;
  onOpenProfile?: () => void;
  discoveryCategory?: 'housing' | 'commercial';
  onCategoryChange?: (category: 'housing' | 'commercial') => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  currentUserId: propUserId,
  onSwitchUser,
  onOpenTerms,
  onOpenPolicies,
  onOpenProfile,
  discoveryCategory = 'housing',
  onCategoryChange,
}) => {
  const { isAuthenticated, role, openAuthModal, user, token } = useAuth();
  const currentUserId = (isAuthenticated && role === 'customer' && user) ? user.id : propUserId;

  // Active discovery category (housing vs commercial)
  const activeCategory = discoveryCategory;

  // Navigation tabs within Customer App
  const [navTab, setNavTab] = useState<'explore' | 'applications' | 'rentals' | 'saved' | 'profile'>('explore');
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // Housing Category Filter: APARTMENT, INDEPENDENT_HOUSE, VILLA, PG, HOSTEL, SHARED_ROOM
  const [selectedHousingCategory, setSelectedHousingCategory] = useState<string>('ALL');

  // Commercial Category Filter: OFFICE, SHOP_SHOWROOM, WAREHOUSE, INDUSTRIAL, COWORKING, CLINIC, OTHER_COMMERCIAL
  const [selectedCommercialCategory, setSelectedCommercialCategory] = useState<string>('ALL');

  // Unified Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('All');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('All');
  const [bhkFilter, setBhkFilter] = useState<string>('All');
  const [minRent, setMinRent] = useState<string>('');
  const [maxRent, setMaxRent] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recommended' | 'rent-low' | 'rent-high'>('recommended');
  type SavedRentalSearch = { id: string; label: string; location: string; propertyType: string; bhk: string; minRent: string; maxRent: string; query: string };
  const [savedSearches, setSavedSearches] = useState<SavedRentalSearch[]>(() => {
    try {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem('rentapp_saved_searches:' + currentUserId) : null;
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((item): item is SavedRentalSearch => Boolean(item && typeof item.id === 'string' && typeof item.label === 'string')) : [];
    } catch {
      return [];
    }
  });
  const [savedSearchesLoadedFor, setSavedSearchesLoadedFor] = useState(currentUserId);
  useEffect(() => {
    if (savedSearchesLoadedFor === currentUserId) return;
    try {
      const stored = window.localStorage.getItem('rentapp_saved_searches:' + currentUserId);
      const parsed = stored ? JSON.parse(stored) : [];
      setSavedSearches(Array.isArray(parsed) ? parsed.filter((item): item is SavedRentalSearch => Boolean(item && typeof item.id === 'string' && typeof item.label === 'string')) : []);
    } catch {
      setSavedSearches([]);
    }
    setSavedSearchesLoadedFor(currentUserId);
  }, [currentUserId, savedSearchesLoadedFor]);
  useEffect(() => {
    if (savedSearchesLoadedFor !== currentUserId) return;
    try {
      window.localStorage.setItem('rentapp_saved_searches:' + currentUserId, JSON.stringify(savedSearches));
    } catch {
      // Saved searches remain available for the current session if storage is unavailable.
    }
  }, [savedSearches, currentUserId, savedSearchesLoadedFor]);
  const [savedSearchNotice, setSavedSearchNotice] = useState<string | null>(null);
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState<boolean>(false);
  const [savedListingIds, setSavedListingIds] = useState<Set<string>>(new Set(['lst_1']));

  // Property Details Modal / Overlay
  const [inspectingListing, setInspectingListing] = useState<Listing | null>(null);
  const [inspectPhotoIndex, setInspectPhotoIndex] = useState<number>(0);
  const [inspectPhotoViewMode, setInspectPhotoViewMode] = useState<'carousel' | 'grid' | 'virtual_tour'>('carousel');

  // Tenant Review & Agreement State
  const [reviewModalAgreement, setReviewModalAgreement] = useState<RentalAgreement | null>(null);
  const [reviewsRefreshTrigger, setReviewsRefreshTrigger] = useState<number>(0);
  const [concludeSuccessNotice, setConcludeSuccessNotice] = useState<string | null>(null);

  const handleOpenInspectListing = (
    listing: Listing,
    initialPhotoIndex: number = 0,
    initialMode: 'carousel' | 'grid' | 'virtual_tour' = 'carousel'
  ) => {
    setInspectingListing(listing);
    setInspectPhotoIndex(initialPhotoIndex);
    setInspectPhotoViewMode(initialMode);
    setSwipeOffset(0);
    setZoomScale(1);
    setZoomPan({ x: 0, y: 0 });
  };

  // =========================================================================
  // 1. IMAGE PRELOADING STRATEGY
  // =========================================================================
  // Maintains an in-memory cache of decoded images ensuring next/previous
  // carousel slides display instantly with zero flicker or latency during swipes
  const preloadedImagesRef = React.useRef<Set<string>>(new Set());

  const preloadPhoto = (url: string) => {
    if (!url || preloadedImagesRef.current.has(url)) return;
    const img = new Image();
    img.src = url;
    preloadedImagesRef.current.add(url);
  };

  // Preload immediate next & previous images whenever active listing or slide changes
  React.useEffect(() => {
    if (!inspectingListing) return;
    const photos = inspectingListing.photos || [];
    const total = photos.length;
    if (total <= 1) return;

    const safeIndex = Math.min(Math.max(0, inspectPhotoIndex), total - 1);
    const nextIdx = (safeIndex + 1) % total;
    const prevIdx = (safeIndex - 1 + total) % total;

    // High priority: preload adjacent frames immediately
    preloadPhoto(photos[nextIdx]);
    preloadPhoto(photos[prevIdx]);

    // Background priority: preload remaining listing images after brief yield
    const bgTimer = setTimeout(() => {
      photos.forEach(p => preloadPhoto(p));
    }, 150);

    return () => clearTimeout(bgTimer);
  }, [inspectingListing, inspectPhotoIndex]);

  // Preload top featured listing cover images on mount and sync with PostgreSQL
  React.useEffect(() => {
    backendService.syncWithDatabase().then(() => {
      setRefreshTrigger(prev => prev + 1);
    });
    const activeListings = backendService.getListings();
    activeListings.slice(0, 8).forEach(l => {
      if (l.photos && l.photos[0]) preloadPhoto(l.photos[0]);
    });
  }, [isAuthenticated, currentUserId]);

  // =========================================================================
  // 2. PINCH-TO-ZOOM & PAN GESTURE RECOGNITION
  // =========================================================================
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [zoomPan, setZoomPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = React.useRef<number | null>(null);
  const pinchStartScaleRef = React.useRef<number>(1);
  const panStartRef = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const lastTapTimeRef = React.useRef<number>(0);

  // Touch & Swipe gesture handling for listing inspect carousel
  const touchStartXRef = React.useRef<number | null>(null);
  const touchStartYRef = React.useRef<number | null>(null);
  const touchCurrentXRef = React.useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const isDraggingRef = React.useRef<boolean>(false);

  // Reset zoom on slide change
  const resetZoom = () => {
    setZoomScale(1);
    setZoomPan({ x: 0, y: 0 });
    pinchStartDistRef.current = null;
    panStartRef.current = null;
  };

  React.useEffect(() => {
    resetZoom();
  }, [inspectPhotoIndex, inspectingListing?.id]);

  const adjustCarouselZoom = (delta: number) => {
    setZoomScale(prev => {
      const next = Math.min(4, Math.max(1, +(prev + delta).toFixed(2)));
      if (next <= 1.05) setZoomPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // 2-Finger Pinch Start
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartScaleRef.current = zoomScale;
      isDraggingRef.current = false;
      setSwipeOffset(0);
      return;
    }

    // 1-Finger Touch Start
    if (e.touches.length === 1) {
      if (zoomScale > 1.05) {
        // Panning while zoomed in
        panStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: zoomPan.x,
          panY: zoomPan.y,
        };
        isDraggingRef.current = false;
      } else {
        // Double-tap toggle zoom check
        const now = Date.now();
        if (now - lastTapTimeRef.current < 280) {
          setZoomScale(prev => (prev > 1.2 ? 1 : 2.5));
          setZoomPan({ x: 0, y: 0 });
          lastTapTimeRef.current = 0;
          return;
        }
        lastTapTimeRef.current = now;

        touchStartXRef.current = e.touches[0].clientX;
        touchStartYRef.current = e.touches[0].clientY;
        touchCurrentXRef.current = e.touches[0].clientX;
        isDraggingRef.current = true;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // 2-Finger Pinch-to-Zoom in progress
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = currentDist / pinchStartDistRef.current;
      const nextScale = Math.min(4, Math.max(1, +(pinchStartScaleRef.current * ratio).toFixed(2)));
      setZoomScale(nextScale);
      if (nextScale <= 1.05) {
        setZoomPan({ x: 0, y: 0 });
      }
      return;
    }

    // 1-Finger Pan while zoomed
    if (e.touches.length === 1 && zoomScale > 1.05 && panStartRef.current) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      const maxPan = (zoomScale - 1) * 200;
      setZoomPan({
        x: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.panX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.panY + dy)),
      });
      return;
    }

    // 1-Finger Normal Horizontal Swipe (only when not zoomed in)
    if (zoomScale <= 1.05 && isDraggingRef.current && touchStartXRef.current !== null && touchStartYRef.current !== null) {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      touchCurrentXRef.current = currentX;

      const deltaX = currentX - touchStartXRef.current;
      const deltaY = currentY - touchStartYRef.current;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        const clamped = Math.max(-100, Math.min(100, deltaX));
        setSwipeOffset(clamped);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }

    if (zoomScale > 1.05) {
      panStartRef.current = null;
      return;
    }

    if (!isDraggingRef.current || touchStartXRef.current === null || touchStartYRef.current === null) {
      setSwipeOffset(0);
      isDraggingRef.current = false;
      return;
    }

    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    const changedTouch = e.changedTouches[0];
    const finalX = changedTouch ? changedTouch.clientX : (touchCurrentXRef.current ?? startX);
    const finalY = changedTouch ? changedTouch.clientY : startY;

    const distanceX = finalX - startX;
    const distanceY = finalY - startY;

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchCurrentXRef.current = null;
    isDraggingRef.current = false;
    setSwipeOffset(0);

    if (Math.abs(distanceX) > 40 && Math.abs(distanceX) > Math.abs(distanceY) * 1.1) {
      const photos = inspectingListing?.photos || [];
      const total = photos.length;
      if (total <= 1) return;

      if (distanceX < 0) {
        setInspectPhotoIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
      } else {
        setInspectPhotoIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (zoomScale > 1.05) {
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: zoomPan.x,
        panY: zoomPan.y,
      };
      isDraggingRef.current = false;
    } else {
      touchStartXRef.current = e.clientX;
      touchStartYRef.current = e.clientY;
      touchCurrentXRef.current = e.clientX;
      isDraggingRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (zoomScale > 1.05 && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      const maxPan = (zoomScale - 1) * 200;
      setZoomPan({
        x: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.panX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.panY + dy)),
      });
      return;
    }

    if (!isDraggingRef.current || touchStartXRef.current === null) return;
    const currentX = e.clientX;
    const deltaX = currentX - touchStartXRef.current;
    touchCurrentXRef.current = currentX;
    const clamped = Math.max(-100, Math.min(100, deltaX));
    setSwipeOffset(clamped);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (zoomScale > 1.05) {
      panStartRef.current = null;
      return;
    }

    if (!isDraggingRef.current || touchStartXRef.current === null) {
      setSwipeOffset(0);
      isDraggingRef.current = false;
      return;
    }

    const startX = touchStartXRef.current;
    const finalX = e.clientX;
    const distanceX = finalX - startX;

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchCurrentXRef.current = null;
    isDraggingRef.current = false;
    setSwipeOffset(0);

    if (Math.abs(distanceX) > 40) {
      const photos = inspectingListing?.photos || [];
      const total = photos.length;
      if (total <= 1) return;

      if (distanceX < 0) {
        setInspectPhotoIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
      } else {
        setInspectPhotoIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
      }
    }
  };

  // Keyboard navigation for carousel & modal
  React.useEffect(() => {
    if (!inspectingListing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspectingListing(null);
      } else if (e.key === 'ArrowLeft') {
        const photos = inspectingListing.photos || [];
        if (photos.length > 1) {
          setInspectPhotoIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
        }
      } else if (e.key === 'ArrowRight') {
        const photos = inspectingListing.photos || [];
        if (photos.length > 1) {
          setInspectPhotoIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectingListing]);

  // Application Flow
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [selectedListingForApply, setSelectedListingForApply] = useState<Listing | null>(null);
  const [applyWarning, setApplyWarning] = useState<string | null>(null);
  const [applyBlockReason, setApplyBlockReason] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isDepositPaymentModalOpen, setIsDepositPaymentModalOpen] = useState<boolean>(false);
  const [targetDepositApp, setTargetDepositApp] = useState<Application | null>(null);

  // Rejection Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportAppId, setReportAppId] = useState<string>('');
  const [reportText, setReportText] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  // Profile Edit State
  const profile = backendService.getCustomerProfile(currentUserId) || {
    id: 'cp_101',
    userId: currentUserId,
    name: 'Aarav Sharma',
    age: 27,
    gender: 'Male' as const,
    occupation: 'Senior Software Engineer (FinTech)',
    maritalStatus: 'Single' as const,
    familySize: 1,
    hasPets: true,
    petType: 'Golden Retriever',
    religion: 'Hindu',
    tribe: 'General',
    consentShareReligionTribe: false,
    agreedDpdpNoticeAt: new Date().toISOString(),
    dpdpNoticeVersion: 'DPDP-2023-v2.4',
    languagePreference: 'en' as const,
  };

  const [editProfile, setEditProfile] = useState<CustomerProfile>({ ...profile });
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);
  const [profileSubTab, setProfileSubTab] = useState<'dashboard' | 'demographics'>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const availableLocations = ['All', 'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Roing'];
  const availablePropertyTypes = ['All', 'House', 'Apartment', 'Villa', 'Studio'];
  const availableBhks = ['All', '1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'];

  const HOUSING_CATEGORIES = [
    { id: 'ALL', label: 'All Housing' },
    { id: 'APARTMENT', label: 'Apartments & Flats' },
    { id: 'INDEPENDENT_HOUSE', label: 'Independent Houses' },
    { id: 'VILLA', label: 'Villas' },
    { id: 'PG', label: 'PG Accommodation' },
    { id: 'HOSTEL', label: 'Hostels' },
    { id: 'SHARED_ROOM', label: 'Shared Rooms' },
  ] as const;

  const COMMERCIAL_CATEGORIES = [
    { id: 'ALL', label: 'All Commercial' },
    { id: 'OFFICE', label: 'Offices' },
    { id: 'SHOP_SHOWROOM', label: 'Shops & Showrooms' },
    { id: 'WAREHOUSE', label: 'Warehouses' },
    { id: 'INDUSTRIAL', label: 'Industrial Spaces' },
    { id: 'COWORKING', label: 'Co-working' },
    { id: 'CLINIC', label: 'Clinics' },
    { id: 'OTHER_COMMERCIAL', label: 'Other Commercial' },
  ] as const;

  const allListings = backendService.getListings();

  // Unified Filtering Logic: Category (Housing vs Commercial), Location, Property Type, BHK, Keywords
  const listings = activeCategory === 'commercial'
    ? [] // No verified commercial listings in database yet (do not fabricate)
    : allListings.filter(l => {
        // 1. Location Filter
        const matchesLocation =
          locationFilter === 'All' ||
          l.city.toLowerCase() === locationFilter.toLowerCase();

        // 2. Housing Category Filter (APARTMENT, INDEPENDENT_HOUSE, VILLA, PG, HOSTEL, SHARED_ROOM)
        let matchesHousingCategory = true;
        if (selectedHousingCategory !== 'ALL') {
          if (selectedHousingCategory === 'APARTMENT') {
            matchesHousingCategory = l.propertyType === 'Apartment' || l.title.toLowerCase().includes('apartment') || l.title.toLowerCase().includes('flat') || l.propertyType === 'Studio';
          } else if (selectedHousingCategory === 'INDEPENDENT_HOUSE') {
            matchesHousingCategory = l.propertyType === 'Independent House' || l.title.toLowerCase().includes('house') || l.title.toLowerCase().includes('cottage');
          } else if (selectedHousingCategory === 'VILLA') {
            matchesHousingCategory = l.propertyType === 'Gated Villa' || l.title.toLowerCase().includes('villa');
          } else if (selectedHousingCategory === 'PG' || selectedHousingCategory === 'HOSTEL' || selectedHousingCategory === 'SHARED_ROOM') {
            // Strictly enforce: No verified PG, Hostel, or Shared Room in current seed records
            // Never fabricate or misrepresent an ordinary apartment as a PG or hostel
            matchesHousingCategory = false;
          }
        }

        // 3. Property Type Filter (within search dropdown)
        let matchesType = true;
        if (propertyTypeFilter !== 'All') {
          if (propertyTypeFilter === 'House') {
            matchesType = l.propertyType === 'Independent House' || l.title.toLowerCase().includes('house') || l.title.toLowerCase().includes('villa');
          } else if (propertyTypeFilter === 'Villa') {
            matchesType = l.propertyType === 'Gated Villa' || l.title.toLowerCase().includes('villa');
          } else if (propertyTypeFilter === 'Apartment') {
            matchesType = l.propertyType === 'Apartment';
          } else if (propertyTypeFilter === 'Studio') {
            matchesType = l.propertyType === 'Studio';
          }
        }

        // 4. BHK Filter
        const matchesBhk = bhkFilter === 'All' || l.bhk === bhkFilter;

        // 5. Monthly rent range
        const matchesMinRent = !minRent || l.rentMonthly >= Number(minRent);
        const matchesMaxRent = !maxRent || l.rentMonthly <= Number(maxRent);

        // 6. Search Query
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery = !q || (
          l.title.toLowerCase().includes(q) ||
          l.locality.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.bhk.toLowerCase().includes(q) ||
          l.propertyType.toLowerCase().includes(q) ||
          l.suitableFor.toLowerCase().includes(q) ||
          l.amenities.some(a => a.toLowerCase().includes(q))
        );

        return matchesLocation && matchesHousingCategory && matchesType && matchesBhk && matchesMinRent && matchesMaxRent && matchesQuery;
      });

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === 'rent-low') return a.rentMonthly - b.rentMonthly;
    if (sortBy === 'rent-high') return b.rentMonthly - a.rentMonthly;
    return Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
  });

  const activeFiltersCount =
    (locationFilter !== 'All' ? 1 : 0) +
    (selectedHousingCategory !== 'ALL' ? 1 : 0) +
    (propertyTypeFilter !== 'All' ? 1 : 0) +
    (bhkFilter !== 'All' ? 1 : 0) +
    (minRent || maxRent ? 1 : 0);

  const myApplications = (isAuthenticated && role === 'customer')
    ? backendService.getApplicationsForCustomer(currentUserId)
    : [];
  const myAgreements = (isAuthenticated && role === 'customer')
    ? backendService.getAgreementsForUser(currentUserId)
    : [];
  const myRentals = myAgreements.length > 0
    ? myAgreements
    : myApplications.filter(a => a.status === 'active_tenancy' || a.depositBalancePaid);
  const savedListings = allListings.filter(l => savedListingIds.has(l.id));

  const handleSaveSearch = () => {
    if (!isAuthenticated || role !== 'customer') {
      openAuthModal('login', 'customer');
      return;
    }

    const criteria = {
      id: String(Date.now()),
      label: [locationFilter !== 'All' ? locationFilter : 'All locations', bhkFilter !== 'All' ? bhkFilter : '', propertyTypeFilter !== 'All' ? propertyTypeFilter : ''].filter(Boolean).join(' · '),
      location: locationFilter,
      propertyType: propertyTypeFilter,
      bhk: bhkFilter,
      minRent,
      maxRent,
      query: searchQuery,
    };
    setSavedSearches(previous => [criteria, ...previous.filter(item => item.label !== criteria.label || item.minRent !== minRent || item.maxRent !== maxRent)].slice(0, 10));
    setSavedSearchNotice('Search saved. You can find it in Saved.');
    window.setTimeout(() => setSavedSearchNotice(null), 3000);
  };

  const handleConcludeAgreement = (agr: RentalAgreement) => {
    if (window.confirm(`Confirm handover and conclude tenancy agreement for ${agr.propertyTitle}? Once concluded, you will be eligible to submit a verified rating & review.`)) {
      try {
        const authToken = token || backendService.getAuthToken() || undefined;
        backendService.concludeAgreement(agr.id, authToken);
        setConcludeSuccessNotice(`Tenancy for ${agr.propertyTitle} has concluded. You can now leave your verified review!`);
        setReviewsRefreshTrigger((p) => p + 1);
        setTimeout(() => setConcludeSuccessNotice(null), 4000);
      } catch (err: any) {
        alert(err.message || 'Failed to conclude agreement.');
      }
    }
  };

  const toggleSave = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isAuthenticated || role !== 'customer') {
      openAuthModal('login', 'customer');
      return;
    }
    setSavedListingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Pre-Flight Suitability Check
  const handleInitiateApply = (listing: Listing) => {
    if (!isAuthenticated || role !== 'customer') {
      openAuthModal('login', 'customer');
      return;
    }
    setSelectedListingForApply(listing);
    const suitability = backendService.checkTenantSuitability(listing, editProfile);

    if (!suitability.compatible) {
      setApplyBlockReason(suitability.blockReason || 'Incompatible with listing criteria');
      setApplyWarning(null);
    } else {
      setApplyBlockReason(null);
      setApplyWarning(suitability.warnings.length > 0 ? suitability.warnings.join(' • ') : null);
    }

    setIsApplying(true);
  };

  // Payment Confirmation (₹20 Non-Refundable Application Fee)
  const handleFeePaymentSuccess = (method: 'upi' | 'card' | 'netbanking', upiVpa?: string) => {
    if (!selectedListingForApply) return;
    try {
      backendService.submitApplication(selectedListingForApply.id, currentUserId, method, upiVpa);
      setIsPaymentModalOpen(false);
      setIsApplying(false);
      setSelectedListingForApply(null);
      setInspectingListing(null);
      setNavTab('applications');
      setRefreshTrigger(prev => prev + 1);
      alert('Application submitted! Your non-refundable ₹20 processing fee has been received.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Pay Deposit & 10% Brokerage upon Acceptance
  const handleDepositPaymentSuccess = (method: 'upi' | 'card' | 'netbanking') => {
    if (!targetDepositApp) return;
    try {
      const res = backendService.payDepositBalance(targetDepositApp.id, currentUserId, method);
      setIsDepositPaymentModalOpen(false);
      setTargetDepositApp(null);
      setRefreshTrigger(prev => prev + 1);
      alert(`Success! Security Deposit & 10% Brokerage settled.\n\nFull Property Address Unlocked: ${res.fullAddress}\nVerified Homeowner Phone: ${res.ownerPhone}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      backendService.updateCustomerProfile(currentUserId, editProfile);
      setProfileSavedMsg('Profile preferences updated successfully.');
      setTimeout(() => setProfileSavedMsg(null), 3000);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // DPDP Section 6(4) Remove / Revoke Consent
  const handleRemoveConsent = () => {
    try {
      const res = backendService.removeConsent(currentUserId);
      setEditProfile(prev => ({
        ...prev,
        consentShareReligionTribe: false,
        religionTribeConsentTimestamp: undefined,
        religionTribeRetentionUntil: undefined,
      }));
      setProfileSavedMsg(res.message);
      setTimeout(() => setProfileSavedMsg(null), 4000);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Right to Erasure
  const handleErasure = () => {
    if (confirm('Exercise Right to Erasure under DPDP Act 2023? This will permanently anonymize your profile and delete voluntary demographic records.')) {
      backendService.eraseCustomerData(currentUserId);
      const updated = backendService.getCustomerProfile(currentUserId);
      if (updated) setEditProfile(updated);
      setRefreshTrigger(prev => prev + 1);
      alert('Your personal demographic data has been permanently erased per Section 12 DPDP Act 2023.');
    }
  };

  // Export Data (JSON)
  const handleExportData = () => {
    const data = {
      profile: backendService.getCustomerProfile(currentUserId),
      applications: backendService.getApplicationsForCustomer(currentUserId),
      consents: backendService.getConsentLogsForUser(currentUserId),
      exportedAt: new Date().toISOString(),
      statutoryCompliance: 'DPDP Act 2023 Section 11 Right to Access',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivaspay-tenant-data-export-${currentUserId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Submit Rejection Report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    try {
      backendService.submitRejectionReport(reportAppId, currentUserId, reportText);
      setReportSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSuccess(false);
        setReportText('');
        setRefreshTrigger(prev => prev + 1);
      }, 1800);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const notice = DPDP_NOTICE_TEXT[lang];

  return (
    <div className="w-full bg-[#fbfaf7] text-stone-900 rounded-[1.75rem] overflow-hidden border border-white shadow-xl shadow-stone-900/[0.06] ring-1 ring-stone-900/[0.04]">
      {/* Page context header: brand and account actions live in CustomerLayout */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 bg-[#f7f6f1] px-5 sm:px-7 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">Renter workspace</p>
          <h1 className="font-editorial text-2xl sm:text-[1.8rem] text-stone-900 leading-tight mt-1">
            {navTab === 'explore' ? 'Find a place to rent' : navTab === 'applications' ? 'Your applications' : navTab === 'rentals' ? 'Your rentals' : navTab === 'saved' ? 'Saved places' : 'Your profile'}
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            {navTab === 'explore' ? 'Compare homes, check availability, and take the next step when you are ready.' : navTab === 'applications' ? 'See each application and what happens next.' : navTab === 'rentals' ? 'Keep your current and past tenancies together.' : navTab === 'saved' ? 'Return to homes and searches you want to revisit.' : 'Manage your renter details and preferences.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          className="min-h-11 self-start sm:self-center inline-flex items-center gap-2 px-3.5 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          aria-label={lang === 'en' ? 'Switch language to Hindi' : 'Switch language to English'}
        >
          <Globe className="w-4 h-4 text-emerald-800" />
          <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>
      </header>

      {/* Navigation Bar */}
      <nav aria-label="Renter navigation" className="bg-white/90 border-b border-stone-200/80 px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setNavTab('explore'); setIsApplying(false); }}
          className={`min-h-11 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            navTab === 'explore'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search rentals</span>
        </button>

        <button
          onClick={() => {
            if (!isAuthenticated || role !== 'customer') {
              openAuthModal('login', 'customer');
              return;
            }
            setNavTab('applications');
            setIsApplying(false);
          }}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            navTab === 'applications'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Applications <span className="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">{myApplications.length}</span></span>
        </button>

        <button
          onClick={() => {
            if (!isAuthenticated || role !== 'customer') {
              openAuthModal('login', 'customer');
              return;
            }
            setNavTab('rentals');
            setIsApplying(false);
          }}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            navTab === 'rentals'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>My rentals <span className="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">{myRentals.length}</span></span>
        </button>

        <button
          onClick={() => {
            if (!isAuthenticated || role !== 'customer') {
              openAuthModal('login', 'customer');
              return;
            }
            setNavTab('saved');
            setIsApplying(false);
          }}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            navTab === 'saved'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Saved <span className="ml-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]">{savedListingIds.size + savedSearches.length}</span></span>
        </button>

        <button
          onClick={() => {
            if (!isAuthenticated || role !== 'customer') {
              openAuthModal('login', 'customer');
              return;
            }
            setNavTab('profile');
            setIsApplying(false);
          }}
          className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            navTab === 'profile'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Profile</span>
        </button>
      </nav>

      {/* Main Container Content */}
      <div className="p-6">
        {/* ================= 1. EXPLORE HOMES TAB ================= */}
        {navTab === 'explore' && !isApplying && (
          <div className="space-y-6">
            {/* Header with Category Context */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="font-editorial text-3xl font-normal text-stone-900 tracking-tight">
                  {activeCategory === 'commercial' ? 'Find a space to rent' : 'Find a place to rent'}
                </h1>
                <p className="text-xs text-stone-500 font-light mt-1">
                  {activeCategory === 'commercial'
                    ? 'Browse commercial spaces for rent by location and property type.'
                    : 'Search homes and apartments for rent across Arunachal Pradesh.'}
                </p>
              </div>

              {/* Sub-Category Filter Carousel / Switcher */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full">
                {activeCategory === 'housing'
                  ? HOUSING_CATEGORIES.map((cat) => {
                      const isSelected = selectedHousingCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedHousingCategory(cat.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950 text-white shadow-xs font-semibold'
                              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })
                  : COMMERCIAL_CATEGORIES.map((cat) => {
                      const isSelected = selectedCommercialCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCommercialCategory(cat.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-stone-900 text-white shadow-xs font-semibold'
                              : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* ONE SINGLE COMPACT, VISUALLY PROMINENT UNIFIED SEARCH BAR / CONTROL */}
            <div className="relative">
              <div
                onClick={() => {
                  if (!isSearchFilterOpen) setIsSearchFilterOpen(true);
                }}
                className={`w-full min-h-12 px-4 py-1.5 bg-white rounded-full border transition-all flex items-center gap-3 cursor-text ${
                  isSearchFilterOpen
                    ? 'border-stone-900 ring-2 ring-stone-900/10 shadow-md'
                    : 'border-stone-300/90 hover:border-stone-400 shadow-xs'
                }`}
              >
                <Search className="w-4 h-4 text-stone-500 shrink-0 stroke-[2.2]" />

                {/* Active Filter Tags Inside Search Control */}
                <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                  {locationFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-800 text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 border border-stone-200">
                      <MapPin className="w-2.5 h-2.5 text-stone-500" />
                      <span>{locationFilter}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocationFilter('All');
                        }}
                        className="hover:text-stone-950 font-bold ml-0.5 cursor-pointer"
                        title="Remove location filter"
                      >
                        &times;
                      </button>
                    </span>
                  )}

                  {propertyTypeFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-800 text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 border border-stone-200">
                      <Building className="w-2.5 h-2.5 text-stone-500" />
                      <span>{propertyTypeFilter}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPropertyTypeFilter('All');
                        }}
                        className="hover:text-stone-950 font-bold ml-0.5 cursor-pointer"
                        title="Remove property type filter"
                      >
                        &times;
                      </button>
                    </span>
                  )}

                  {bhkFilter !== 'All' && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-800 text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 border border-stone-200">
                      <Bed className="w-2.5 h-2.5 text-stone-500" />
                      <span>{bhkFilter}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBhkFilter('All');
                        }}
                        className="hover:text-stone-950 font-bold ml-0.5 cursor-pointer"
                        title="Remove BHK filter"
                      >
                        &times;
                      </button>
                    </span>
                  )}

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={
                      activeFiltersCount > 0
                        ? "Filter or search keywords..."
                        : "Search city, neighborhood, or locality"
                    }
                    className="flex-1 min-w-[200px] text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-hidden bg-transparent font-normal"
                  />
                </div>

                {/* Quick Clear Query Button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    className="text-stone-400 hover:text-stone-700 text-xs px-1 cursor-pointer"
                    title="Clear text query"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Filter Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSearchFilterOpen(!isSearchFilterOpen);
                  }}
                  className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shrink-0 ${
                    isSearchFilterOpen || activeFiltersCount > 0
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                  title="Open location, property type, and criteria filters"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-stone-900 text-[10px] font-bold flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* UNIFIED SEARCH / FILTER INTERFACE PANEL */}
              {isSearchFilterOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white rounded-3xl p-5 border border-stone-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Search &amp; Filter Residences
                    </span>

                    <div className="flex items-center gap-2">
                      {(activeFiltersCount > 0 || searchQuery) && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocationFilter('All');
                            setPropertyTypeFilter('All');
                            setBhkFilter('All');
                            setMinRent('');
                            setMaxRent('');
                            setSearchQuery('');
                          }}
                          className="text-xs text-stone-500 hover:text-stone-900 font-medium underline cursor-pointer"
                        >
                          Reset All
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsSearchFilterOpen(false)}
                        className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Monthly rental price range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4 border border-stone-100">
                    <label className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider">Minimum monthly rent</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">₹</span>
                        <input type="number" min="0" step="500" value={minRent} onChange={e => setMinRent(e.target.value)} placeholder="No minimum" className="min-h-11 w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none" />
                      </div>
                    </label>
                    <label className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider">Maximum monthly rent</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">₹</span>
                        <input type="number" min="0" step="500" value={maxRent} onChange={e => setMaxRent(e.target.value)} placeholder="No maximum" className="min-h-11 w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 text-sm text-stone-900 focus:border-emerald-700 focus:outline-none" />
                      </div>
                    </label>
                  </div>

                  {/* 1. LOCATION FILTER */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-500" />
                      Location
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableLocations.map(loc => {
                        const isSelected = locationFilter === loc;
                        return (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setLocationFilter(loc)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            {loc}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. PROPERTY TYPE FILTER */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                      <Building className="w-3 h-3 text-stone-500" />
                      Property Type
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availablePropertyTypes.map(type => {
                        const isSelected = propertyTypeFilter === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setPropertyTypeFilter(type)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. BHK & SEARCH CRITERIA */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider flex items-center gap-1">
                      <Bed className="w-3 h-3 text-stone-500" />
                      Configuration (BHK)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableBhks.map(bhk => {
                        const isSelected = bhkFilter === bhk;
                        return (
                          <button
                            key={bhk}
                            type="button"
                            onClick={() => setBhkFilter(bhk)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-stone-900 text-white shadow-xs'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            {bhk}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. POPULAR SEARCH AMENITIES CHIPS */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
                      Popular Search Criteria / Amenities
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Infinity Pool', 'Power Backup', 'Covered Car Parking', '24x7 Security', 'Italian Marble', 'EV Charging'].map(tag => {
                        const isContained = searchQuery.toLowerCase().includes(tag.toLowerCase());
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isContained) {
                                setSearchQuery(searchQuery.replace(new RegExp(tag, 'gi'), '').trim());
                              } else {
                                setSearchQuery(searchQuery ? `${searchQuery} ${tag}` : tag);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] transition-all cursor-pointer border ${
                              isContained
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                            }`}
                          >
                            {isContained ? `✓ ${tag}` : `+ ${tag}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Apply Action */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-500">
                      Found <strong className="text-stone-900">{listings.length}</strong> matching homes
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsSearchFilterOpen(false)}
                      className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-full transition-colors shadow-xs cursor-pointer"
                    >
                      Apply &amp; Show Results
                    </button>
                  </div>
                </div>
              )}
            </div>

            {savedSearchNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{savedSearchNotice}</div>}

            {listings.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200/90 text-center space-y-4 max-w-2xl mx-auto my-6 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center mx-auto border border-stone-200 shadow-2xs">
                  {activeCategory === 'commercial' ? (
                    <Building2 className="w-7 h-7 text-stone-800" />
                  ) : (
                    <Home className="w-7 h-7 text-emerald-800" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-editorial text-2xl font-bold text-stone-900">
                    {activeCategory === 'commercial'
                      ? 'Commercial Properties Coming Soon'
                      : selectedHousingCategory === 'PG'
                      ? 'No Verified PG Accommodations Found'
                      : selectedHousingCategory === 'HOSTEL'
                      ? 'No Verified Hostels Found'
                      : selectedHousingCategory === 'SHARED_ROOM'
                      ? 'No Shared Rooms Available Currently'
                      : 'No Properties Match Your Search Criteria'}
                  </h3>
                  <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
                    {activeCategory === 'commercial'
                      ? 'NivasPay Commercial is currently onboarding verified office suites, retail showrooms, godowns, and industrial premises across Itanagar, Naharlagun, and Pasighat. In compliance with marketplace standards, residential properties are never mismapped as commercial.'
                      : selectedHousingCategory === 'PG'
                      ? 'NivasPay is currently onboarding verified PG listings with individual room and bed availability tracking in Itanagar and Naharlagun. We never misrepresent ordinary apartments as PG accommodation.'
                      : selectedHousingCategory === 'HOSTEL'
                      ? 'Verified hostel listings across Arunachal Pradesh are currently undergoing physical verification. Check back soon or explore verified apartments and houses.'
                      : selectedHousingCategory === 'SHARED_ROOM'
                      ? 'Verified shared rooms with occupancy tracking are currently being onboarded across Arunachal Pradesh.'
                      : 'Try resetting your location, BHK, or keyword filters to browse all verified listings.'}
                  </p>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                  {activeCategory === 'commercial' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onCategoryChange?.('housing')}
                        className="px-5 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-white rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                      >
                        <Home className="w-3.5 h-3.5" />
                        <span>Explore Housing Rentals</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => (window.location.hash = '#/owner')}
                        className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-semibold transition-all cursor-pointer"
                      >
                        <span>List a Commercial Space (Owner Portal)</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHousingCategory('ALL');
                        setLocationFilter('All');
                        setPropertyTypeFilter('All');
                        setBhkFilter('All');
                        setSearchQuery('');
                      }}
                      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer"
                    >
                      <span>Reset Filters &amp; View All Housing</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-2xs">
                  <p className="text-sm text-stone-700"><strong className="text-stone-950">{listings.length} rentals</strong> match your search</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700">
                      <span>Sort</span>
                      <select aria-label="Sort rentals" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="min-h-9 bg-transparent font-medium text-stone-900 focus:outline-none">
                        <option value="recommended">Recommended</option>
                        <option value="rent-low">Rent: low to high</option>
                        <option value="rent-high">Rent: high to low</option>
                      </select>
                    </label>
                    <button type="button" onClick={handleSaveSearch} className="min-h-11 rounded-xl bg-emerald-950 px-4 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors">Save search</button>
                  </div>
                </div>

                {/* Verified Address Notice */}
                <div className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-2xs flex items-center gap-3 text-xs text-stone-600">
                  <Lock className="w-4 h-4 text-stone-700 shrink-0" />
                  <div>
                    Exact property address and homeowner contact details are shared after application acceptance.
                  </div>
                </div>

                {/* Listings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedListings.map(item => {
                const isSaved = savedListingIds.has(item.id);
                const availableUnitCount = item.units
                  ? item.units.filter(unit => String(unit.availabilityStatus || unit.status).toLowerCase() === 'available').length
                  : typeof item.totalUnits === 'number'
                    ? Math.max(0, item.totalUnits - (item.occupiedUnits || 0))
                    : null;
                const availabilityLabel = availableUnitCount === null
                  ? (item.status === 'available' || item.status === 'published' ? 'Available now' : 'Check availability')
                  : availableUnitCount > 0 ? availableUnitCount + ' units available' : 'Check availability';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-[24px] overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    {/* Photo Header */}
                    <div className="relative h-52 w-full bg-stone-200 overflow-hidden cursor-pointer" onClick={() => handleOpenInspectListing(item)}>
                      <img
                        src={item.photos[0]}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full">
                        {item.bhk} &bull; {item.propertyType}
                      </div>

                      {item.photos && item.photos.length > 1 && (
                        <div className="absolute top-3 left-28 bg-black/50 backdrop-blur-md text-white text-[10px] font-mono px-2 py-1 rounded-full flex items-center gap-1 shadow-xs">
                          <ImageIcon className="w-3 h-3 text-stone-300" />
                          <span>{item.photos.length} photos</span>
                        </div>
                      )}

                      {/* 360 Virtual Tour Badge on Card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInspectListing(item, 0, 'virtual_tour');
                        }}
                        className="absolute top-3 right-12 bg-black/60 hover:bg-black/85 backdrop-blur-md text-amber-300 border border-amber-400/40 text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs cursor-pointer transition-all hover:scale-105"
                        title="Open 360° Virtual Tour"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                        <span className="hidden sm:inline">360° Tour</span>
                      </button>

                      <button
                        type="button"
                        aria-label={isSaved ? 'Remove from saved rentals' : 'Save rental'}
                        onClick={e => toggleSave(e, item.id)}
                        className="absolute top-3 right-3 min-h-11 min-w-11 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all"
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                      </button>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                        <span className="bg-emerald-950/80 text-emerald-300 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                          Suitable for: {item.suitableFor}
                        </span>
                        <span className="bg-white/95 text-stone-950 px-2.5 py-1 rounded-full font-bold font-mono text-xs shadow-xs">
                          ₹{item.rentMonthly.toLocaleString('en-IN')}/mo
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3
                          onClick={() => handleOpenInspectListing(item)}
                          className="font-editorial text-lg font-normal text-stone-900 hover:text-stone-700 transition-colors cursor-pointer"
                        >
                          {item.title}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{item.locality}, {item.city}</span>
                        </div>

                        <p className="text-[11px] text-stone-400 italic mt-0.5">
                          {item.maskedAddressPreview}
                        </p>
                      </div>

                      {/* Specs Row */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-light">
                        <span>{item.bedrooms || 3} Beds &bull; {item.bathrooms || 2} Baths</span>
                        <span>{item.sqft || 1800} sqft</span>
                        <span className="font-medium text-emerald-800">{availabilityLabel}</span>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenInspectListing(item)}
                          className="flex-1 py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-colors text-center cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-600" />
                          <span>Details</span>
                        </button>

                        <button
                          onClick={() => handleOpenInspectListing(item, 0, 'virtual_tour')}
                          className="py-2.5 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/60 text-xs font-medium transition-colors text-center cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                          title="Open 360° Virtual Tour"
                        >
                          <Compass className="w-3.5 h-3.5 text-amber-600" />
                          <span className="hidden sm:inline">360° Tour</span>
                        </button>

                        <button
                          onClick={() => handleInitiateApply(item)}
                          className="flex-1 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors text-center shadow-xs cursor-pointer"
                        >
                          Apply to Rent
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    )}

        {/* ================= PRE-PAYMENT COMPATIBILITY EVALUATION ================= */}
        {navTab === 'explore' && isApplying && selectedListingForApply && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 border border-stone-200/90 shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Step 2: Tenancy Eligibility Gate</span>
                <h2 className="font-editorial text-xl font-normal text-stone-900 mt-0.5">
                  {selectedListingForApply.title}
                </h2>
              </div>
              <button
                onClick={() => setIsApplying(false)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs rounded-full cursor-pointer"
              >
                Back to Listings
              </button>
            </div>

            {/* Approximate Map Pin Graphic */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-stone-700" />
                  Approximate Locality Perimeter (~{selectedListingForApply.approximateRadiusMeters}m radius)
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {selectedListingForApply.approximateLat.toFixed(4)}, {selectedListingForApply.approximateLng.toFixed(4)}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                The exact building, flat number, and owner phone are protected. Full contact and precise address are unlocked automatically upon application acceptance and deposit payment.
              </p>
            </div>

            {/* Criteria Evaluation */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-stone-800 uppercase tracking-wider">Compatibility Evaluation:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex justify-between">
                  <span className="text-stone-500">Listing "Suitable For":</span>
                  <span className="font-semibold text-stone-900">{selectedListingForApply.suitableFor}</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex justify-between">
                  <span className="text-stone-500">Applicant Gender &amp; Role:</span>
                  <span className="font-semibold text-stone-900">{editProfile.gender} ({editProfile.occupation})</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex justify-between">
                  <span className="text-stone-500">Pets Allowed:</span>
                  <span className="font-semibold text-stone-900">{selectedListingForApply.requirements.petsAllowed ? 'Yes' : 'No'}</span>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex justify-between">
                  <span className="text-stone-500">Your Pet Status:</span>
                  <span className="font-semibold text-stone-900">{editProfile.hasPets ? `Yes (${editProfile.petType})` : 'No Pets'}</span>
                </div>
              </div>

              {applyWarning && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Suitability Advisory: </strong>
                    {applyWarning}
                  </div>
                </div>
              )}

              {applyBlockReason && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Application Intercepted: </strong>
                    {applyBlockReason} You cannot proceed with application submission for this listing.
                  </div>
                </div>
              )}
            </div>

            {/* Fee Breakdown & Financial Transparency (Rule 5) */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/90 space-y-4 text-xs">
              <div className="border-b border-stone-200 pb-2">
                <span className="font-semibold text-stone-900 uppercase tracking-wider text-[11px]">
                  Application Summary &amp; Fee Separation
                </span>
              </div>

              {/* WHAT YOU PAY NOW */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider">
                  What You Pay Now:
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Monthly Rent:</span>
                  <span className="font-mono">₹{selectedListingForApply.rentMonthly.toLocaleString('en-IN')}/mo</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Application Processing Fee:</span>
                  <span className="font-mono">₹20.00</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 pt-1.5 border-t border-stone-200 text-sm">
                  <span>PAY NOW:</span>
                  <span className="font-mono text-emerald-800">₹20.00</span>
                </div>
              </div>

              {/* IF APPLICATION IS ACCEPTED */}
              <div className="space-y-1.5 pt-3 border-t border-stone-200">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                  If Your Application Is Accepted:
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>Brokerage (10% of one month's rent):</span>
                  <span className="font-mono font-semibold">
                    ₹{Math.round(selectedListingForApply.rentMonthly * 0.10).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>Security Deposit (refundable at tenancy end):</span>
                  <span className="font-mono font-semibold">
                    ₹{selectedListingForApply.securityDeposit.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 italic">
                  Flat 10% customer brokerage upon acceptance. No additional platform charges or hidden fees.
                </div>
              </div>

              {/* IMPORTANT STATUTORY NOTICE */}
              <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-950 leading-relaxed">
                <strong>Important Notice: </strong>
                The ₹20 application fee is non-refundable, including if your application is rejected or withdrawn.
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsApplying(false)}
                className="w-1/3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-full text-xs transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                disabled={applyBlockReason !== null}
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-2/3 py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-full text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Pay ₹20 Application Fee &amp; Submit</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 2. MY APPLICATIONS TAB ================= */}
        {navTab === 'applications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-2xl font-normal text-stone-900">
                  Tenancy Applications &amp; Escrow
                </h2>
                <p className="text-xs text-stone-500 font-light">
                  Protected by automated 3-day SLA auto-refunds and deposit balance settlements.
                </p>
              </div>
            </div>

            {myApplications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-stone-200/80 p-8 text-stone-400 text-xs">
                No active applications. Browse residences to apply.
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map(app => {
                  const listing = backendService.getListingById(app.listingId);
                  const isAccepted = app.status === 'accepted';
                  const isRejected = app.status === 'rejected';
                  const isPending = app.status === 'pending';

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-mono text-stone-400">Application #{app.id}</span>
                            <span className="text-stone-300">•</span>
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200/70 px-2 py-0.5 rounded-full transition-colors cursor-default"
                              title={formatAbsoluteDate(app.createdAt)}
                            >
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span>{formatRelativeTime(app.createdAt, 'Applied')}</span>
                            </span>
                          </div>
                          <h3 className="font-editorial text-lg text-stone-900 mt-0.5">{listing?.title}</h3>
                          <div className="text-xs text-stone-500">{listing?.locality}, {listing?.city}</div>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto ${
                          isAccepted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {isAccepted && <CheckCircle className="w-3.5 h-3.5" />}
                          {isRejected && <AlertTriangle className="w-3.5 h-3.5" />}
                          {isPending && <Clock className="w-3.5 h-3.5" />}
                          <span className="capitalize">{app.status}</span>
                        </span>
                      </div>

                      {/* Financial Ledger & Next Action */}
                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 text-xs space-y-2">
                        <div className="flex justify-between text-stone-600">
                          <span>Application Processing Fee Paid:</span>
                          <span className="font-mono font-medium text-stone-900">₹{app.applicationFeeAmount} (Ref: {app.applicationFeePaymentId})</span>
                        </div>

                        {isRejected && (
                          <div className="space-y-3 pt-3 border-t border-stone-200">
                            {/* Notification Delivery & Provider Status Pill */}
                            {(() => {
                              const notif = app.notificationStatus || {
                                inAppStatus: 'RECORDED' as const,
                                emailStatus: 'NOT_CONFIGURED' as const,
                                smsStatus: 'NOT_CONFIGURED' as const,
                                overallStatus: 'NOT_CONFIGURED' as const,
                                emailDelivered: false,
                                smsDelivered: false,
                              };

                              const bothDelivered = notif.emailStatus === 'DELIVERED' && notif.smsStatus === 'DELIVERED' && notif.emailDelivered && notif.smsDelivered;
                              const bothSent = notif.emailStatus === 'SENT' && notif.smsStatus === 'SENT';
                              const isSimulated = notif.emailStatus === 'SIMULATED' || notif.smsStatus === 'SIMULATED' || notif.overallStatus === 'SIMULATED';
                              const isQueued = notif.emailStatus === 'QUEUED' || notif.smsStatus === 'QUEUED';
                              const isFailed = notif.emailStatus === 'FAILED' && notif.smsStatus === 'FAILED';

                              const badgeText = bothDelivered
                                ? 'Alerts Delivered (Email & SMS)'
                                : bothSent
                                ? 'Alerts Sent (Email & SMS)'
                                : isSimulated
                                ? 'Alerts Simulated (Dev Mode)'
                                : isQueued
                                ? 'Alerts Queued (Email & SMS)'
                                : isFailed
                                ? 'Alert Dispatch Failed'
                                : 'Email & SMS Not Configured';

                              const summaryText = bothDelivered
                                ? 'Automated notice with transparency disclosures was delivered to your registered email and mobile number with provider verification.'
                                : bothSent
                                ? 'An automated notification with transparency disclosures was sent to your registered email and mobile number.'
                                : isSimulated
                                ? 'Development simulation: rejection notification was recorded in dev mode; live telecom gateways were not contacted.'
                                : isQueued
                                ? 'Notification is queued for dispatch to your registered contact channels.'
                                : isFailed
                                ? 'Provider dispatch failed; in-app notification recorded successfully.'
                                : 'Email and SMS alerts are not yet configured.';

                              const renderChannelStatus = (label: string, status: string, confirmed?: boolean) => {
                                let badgeColor = 'bg-stone-100 text-stone-600 border-stone-200';
                                let text = 'Not Configured';

                                if (status === 'RECORDED') {
                                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                  text = 'Recorded';
                                } else if (status === 'DELIVERED') {
                                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                  text = confirmed ? 'Delivered (Verified)' : 'Delivered';
                                } else if (status === 'SENT') {
                                  badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                                  text = 'Sent';
                                } else if (status === 'QUEUED') {
                                  badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
                                  text = 'Queued';
                                } else if (status === 'SIMULATED') {
                                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                                  text = 'Simulated';
                                } else if (status === 'FAILED') {
                                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                                  text = 'Failed';
                                }

                                return (
                                  <span key={label} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-mono ${badgeColor}`}>
                                    <span className="font-sans font-medium text-stone-500">{label}:</span> {text}
                                  </span>
                                );
                              };

                              return (
                                <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3 space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-semibold text-rose-900">
                                    <span className="flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                      Application Declined
                                    </span>
                                    <span className={`flex items-center gap-1 text-[10px] bg-white px-2 py-0.5 rounded-full border ${
                                      bothDelivered
                                        ? 'border-emerald-300 text-emerald-800'
                                        : bothSent
                                        ? 'border-blue-300 text-blue-800'
                                        : isSimulated
                                        ? 'border-amber-300 text-amber-800'
                                        : isFailed
                                        ? 'border-rose-300 text-rose-800'
                                        : 'border-stone-300 text-stone-700'
                                    } font-medium`}>
                                      <Mail className="w-3 h-3 text-stone-500" />
                                      <Phone className="w-3 h-3 text-stone-500" />
                                      {badgeText}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                                    {summaryText}
                                  </p>

                                  {/* Detailed Channel Statuses */}
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rose-200/60">
                                    {renderChannelStatus('In-App', notif.inAppStatus || 'RECORDED')}
                                    {renderChannelStatus('Email', notif.emailStatus, notif.emailDelivered)}
                                    {renderChannelStatus('SMS', notif.smsStatus, notif.smsDelivered)}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-stone-700">
                                <span>Stated Objective Reason:</span>
                                <span className="font-semibold capitalize text-stone-900">
                                  {app.rejectedReasonCode?.replace(/_/g, ' ') || 'Objective Property Constraint'}
                                </span>
                              </div>
                              {app.rejectedReasonExplanation && (
                                <div className="p-2.5 bg-white rounded-lg border border-stone-200 text-[11px] text-stone-600 italic">
                                  "{app.rejectedReasonExplanation}"
                                </div>
                              )}
                            </div>

                            {/* Transparent Fee Disclosure */}
                            <div className="bg-stone-100 p-2.5 rounded-xl border border-stone-200 text-[11px] space-y-1 text-stone-600">
                              <div className="flex justify-between font-medium">
                                <span>Application Processing Fee:</span>
                                <span className="text-stone-900">₹20 (Non-refundable screening charge)</span>
                              </div>
                              <div className="flex justify-between font-medium text-emerald-800">
                                <span>Brokerage Charged:</span>
                                <span>₹0 (Zero brokerage on unaccepted applications)</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setReportAppId(app.id);
                                setIsReportModalOpen(true);
                              }}
                              className="mt-1 w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5 text-rose-600" />
                              <span>Lodge Grievance Inquiry (DPDP Compliance Review)</span>
                            </button>
                          </div>
                        )}

                        {isAccepted && (() => {
                          const depositAmt = listing?.securityDeposit || 0;
                          const brokerageAmt = app.brokerageAmount || Math.round((listing?.rentMonthly || 0) * 0.10);
                          const totalDue = depositAmt + brokerageAmt;

                          return (
                            <div className="space-y-3 pt-2 border-t border-stone-200">
                              <div className="flex justify-between text-emerald-800 font-semibold">
                                <span>Brokerage (10% of monthly rent):</span>
                                <span className="font-mono">₹{brokerageAmt.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between text-stone-700">
                                <span>Security Deposit:</span>
                                <span className="font-mono font-semibold">₹{depositAmt.toLocaleString('en-IN')}</span>
                              </div>

                              {app.depositBalancePaid ? (
                                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                                  <div className="text-emerald-900 font-bold flex items-center gap-1.5 text-xs">
                                    <Check className="w-4 h-4 text-emerald-700" />
                                    Lease Finalized &bull; Full Property Address &amp; Homeowner Contact Unlocked!
                                  </div>
                                  <div className="text-xs text-stone-900 bg-white p-3 rounded-xl border border-emerald-200 font-mono">
                                    {listing?.id === 'lst_3'
                                      ? 'Cottage 3, Riverbank Grove, Near Siang Bridge, Medical Colony, Pasighat, Arunachal Pradesh - 791102'
                                      : listing?.id === 'lst_2'
                                      ? 'Flat B-202, Valley Heights, Model Village Road, Papu Hill, Naharlagun, Arunachal Pradesh - 791110'
                                      : listing?.id === 'lst_4'
                                      ? 'Studio Suite 12, Snow Crest Lodge, Old Market, Tawang, Arunachal Pradesh - 790104'
                                      : listing?.id === 'lst_5'
                                      ? 'House 8, Pine Grove Pathway, Hapoli, Ziro, Arunachal Pradesh - 791120'
                                      : listing?.id === 'lst_6'
                                      ? 'Unit 4, Orchard Valley, Near Circuit House, Roing, Arunachal Pradesh - 792110'
                                      : 'Villa 14, Pine Valley Enclave, Near Ganga Lake, Chandranagar, Itanagar, Arunachal Pradesh - 791113'}
                                  </div>
                                  <div className="text-xs text-stone-700 flex justify-between">
                                    <span>Owner Direct Phone:</span>
                                    <span className="font-mono font-bold text-stone-900">+91 98111 22334</span>
                                  </div>
                                  <div className="text-[10px] text-stone-500 flex justify-between">
                                    <span>Payment Receipt Ref:</span>
                                    <span className="font-mono">{app.gstInvoiceNumber}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs text-stone-700 font-bold pt-1 border-t border-stone-200">
                                    <span>Total Payable to Finalize:</span>
                                    <span className="font-mono text-stone-900 text-sm">
                                      ₹{totalDue.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-stone-500">
                                    Security Deposit (₹{depositAmt.toLocaleString('en-IN')}) + 10% Brokerage (₹{brokerageAmt.toLocaleString('en-IN')}). No platform fee after acceptance.
                                  </p>
                                  <button
                                    onClick={() => {
                                      setTargetDepositApp(app);
                                      setIsDepositPaymentModalOpen(true);
                                    }}
                                    className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Pay Security Deposit &amp; Brokerage (₹{totalDue.toLocaleString('en-IN')})</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

                {/* ================= SAVED RENTALS & SEARCHES TAB ================= */}
        {navTab === 'saved' && (
          <div className="space-y-7">
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3"><div><h2 className="font-editorial text-2xl text-stone-900">Saved searches</h2><p className="mt-1 text-sm text-stone-600">Pick up where you left off with the same rental criteria.</p></div><span className="text-sm text-stone-500">{savedSearches.length} saved</span></div>
              {savedSearches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-600">No saved searches yet. Set your filters, then choose <strong>Save search</strong>.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {savedSearches.map(search => (
                    <article key={search.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
                      <div className="min-w-0"><h3 className="font-semibold text-stone-900">{search.label}</h3><p className="mt-1 text-sm text-stone-600">{search.minRent || search.maxRent ? '₹' + (search.minRent || '0') + ' – ₹' + (search.maxRent || 'Any') + ' / month' : 'Any monthly rent'}{search.query ? ' · ' + search.query : ''}</p></div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => { setLocationFilter(search.location); setPropertyTypeFilter(search.propertyType); setBhkFilter(search.bhk); setMinRent(search.minRent); setMaxRent(search.maxRent); setSearchQuery(search.query); setNavTab('explore'); }} className="min-h-11 rounded-xl bg-emerald-950 px-3.5 text-sm font-semibold text-white hover:bg-emerald-900">Use search</button>
                        <button type="button" aria-label="Remove saved search" onClick={() => setSavedSearches(previous => previous.filter(item => item.id !== search.id))} className="min-h-11 rounded-xl border border-stone-200 px-3 text-sm font-medium text-stone-600 hover:bg-stone-50">Remove</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3"><div><h2 className="font-editorial text-2xl text-stone-900">Saved rentals</h2><p className="mt-1 text-sm text-stone-600">Compare homes you have bookmarked.</p></div><span className="text-sm text-stone-500">{savedListings.length} saved</span></div>
              {savedListings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center"><Heart className="mx-auto h-7 w-7 text-stone-400" /><p className="mt-2 text-sm text-stone-600">No saved rentals yet.</p><button type="button" onClick={() => setNavTab('explore')} className="mt-3 min-h-11 rounded-xl bg-emerald-950 px-4 text-sm font-semibold text-white hover:bg-emerald-900">Browse rentals</button></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {savedListings.map(item => (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs">
                      <button type="button" onClick={() => handleOpenInspectListing(item)} className="block w-full text-left"><img src={item.photos[0]} alt={item.title} loading="lazy" className="h-48 w-full object-cover" /></button>
                      <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-stone-900">{item.title}</h3><p className="mt-1 text-sm text-stone-600">{item.locality}, {item.city}</p></div><strong className="shrink-0 text-sm text-stone-950">₹{item.rentMonthly.toLocaleString('en-IN')}<span className="font-normal text-stone-500">/mo</span></strong></div>
                        <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-sm text-stone-600"><span>{item.bedrooms || 0} beds · {item.bathrooms || 0} baths</span><button type="button" onClick={e => toggleSave(e, item.id)} className="min-h-11 rounded-xl px-3 text-sm font-medium text-rose-700 hover:bg-rose-50">Remove</button></div></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================= 2b. MY RENTALS & REVIEWS TAB ================= */}
        {navTab === 'rentals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-editorial text-2xl font-normal text-stone-900">
                  My Rentals &amp; Verified Reviews
                </h2>
                <p className="text-xs text-stone-500 font-light mt-0.5">
                  Manage active leases and leave verified 1-5 star ratings for properties and owners after tenancy concludes.
                </p>
              </div>
            </div>

            {concludeSuccessNotice && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{concludeSuccessNotice}</span>
              </div>
            )}

            {(() => {
              const userAgreements = backendService.getAgreementsForUser(currentUserId);
              const concludedAgreements = userAgreements.filter(
                (a) => a.status === 'concluded' || a.status === 'terminated'
              );
              const activeAgreements = userAgreements.filter(
                (a) => a.status === 'active' || a.status === 'pending_signatures'
              );

              if (userAgreements.length === 0) {
                return (
                  <div className="text-center py-16 bg-white rounded-3xl border border-stone-200/80 p-8 space-y-3">
                    <Building className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-stone-500 text-xs">
                      No active or past tenancy agreements found.
                    </p>
                    <button
                      onClick={() => setNavTab('explore')}
                      className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-full shadow-xs cursor-pointer"
                    >
                      Browse Available Residences
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Concluded Tenancies (Eligible for Review) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Concluded Tenancies ({concludedAgreements.length})
                      </h3>
                      <span className="text-[11px] text-stone-400 font-light">
                        Eligible for verified rating &amp; review
                      </span>
                    </div>

                    {concludedAgreements.length === 0 ? (
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70 text-xs text-stone-500 text-center">
                        No concluded tenancies yet. Reviews become available once a tenancy period ends or is concluded.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {concludedAgreements.map((agr) => {
                          const review = backendService.getReviewByAgreementId(agr.id);

                          return (
                            <div
                              key={agr.id}
                              className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs space-y-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-stone-100 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                                      Concluded Lease
                                    </span>
                                    <span className="text-[10px] text-stone-400 font-mono">
                                      ID: {agr.id}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-stone-900 text-base mt-1">
                                    {agr.propertyTitle}
                                  </h4>
                                  <p className="text-xs text-stone-500 mt-0.5">{agr.propertyAddress}</p>
                                </div>

                                <div className="text-right sm:shrink-0">
                                  <span className="text-[10px] text-stone-400 block uppercase">Monthly Rent</span>
                                  <span className="font-mono font-bold text-stone-900 text-sm">
                                    ₹{agr.monthlyRent.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
                                <span>Owner / Landlord: <strong className="text-stone-900">{agr.ownerName}</strong></span>
                                <span>Duration: <strong className="text-stone-900">{agr.tenancyPeriodMonths} Months</strong></span>
                                <span>Deposit: <strong className="text-stone-900 font-mono">₹{agr.securityDeposit.toLocaleString('en-IN')}</strong></span>
                              </div>

                              {/* Review Section */}
                              {!review ? (
                                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                                      <span>Rate Your Experience</span>
                                    </div>
                                    <p className="text-[11px] text-amber-800">
                                      Leave star ratings (1-5★) for the property condition and owner cooperation.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setReviewModalAgreement(agr)}
                                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-medium shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span>Leave Review &amp; Rating</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-stone-900">Your Submitted Review</span>
                                      {review.moderationStatus === 'approved' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          Published &amp; Verified
                                        </span>
                                      )}
                                      {review.moderationStatus === 'flagged' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                                          Pending Moderation
                                        </span>
                                      )}
                                      {review.moderationStatus === 'rejected' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-medium border border-rose-200">
                                          <X className="w-3 h-3 text-rose-600" />
                                          Rejected by Moderation
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-stone-400 font-mono">
                                      Overall: {review.overallRating.toFixed(1)} ★
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <h5 className="text-xs font-semibold text-stone-900">"{review.title}"</h5>
                                    <p className="text-xs text-stone-600 italic">"{review.reviewText}"</p>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-stone-200/60 text-[11px] text-stone-600">
                                    <div>Property: <strong className="text-stone-900">{review.propertyRating}★</strong></div>
                                    <div>Landlord: <strong className="text-stone-900">{review.ownerRating}★</strong></div>
                                    {review.cleanlinessRating && (
                                      <div>Cleanliness: <strong className="text-stone-900">{review.cleanlinessRating}★</strong></div>
                                    )}
                                    {review.depositReturnRating && (
                                      <div>Deposit Return: <strong className="text-stone-900">{review.depositReturnRating}★</strong></div>
                                    )}
                                  </div>

                                  {review.ownerResponse && (
                                    <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs space-y-1 mt-2">
                                      <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5 text-stone-600" />
                                        Owner Response ({review.ownerName}):
                                      </span>
                                      <p className="text-stone-600 text-[11px] italic">"{review.ownerResponse}"</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Active Tenancies */}
                  <div className="space-y-3 pt-4 border-t border-stone-200">
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      Active Tenancies ({activeAgreements.length})
                    </h3>

                    {activeAgreements.length === 0 ? (
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70 text-xs text-stone-500 text-center">
                        No active leases currently underway.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {activeAgreements.map((agr) => (
                          <div
                            key={agr.id}
                            className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ● Active Tenancy Lease
                                </span>
                                <h4 className="font-semibold text-stone-900 text-base mt-1">
                                  {agr.propertyTitle}
                                </h4>
                                <p className="text-xs text-stone-500">{agr.propertyAddress}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-stone-400 block uppercase">Rent</span>
                                <span className="font-mono font-bold text-stone-900 text-sm">
                                  ₹{agr.monthlyRent.toLocaleString('en-IN')}/mo
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                              <span className="text-stone-600">Landlord: <strong className="text-stone-900">{agr.ownerName}</strong></span>
                              <button
                                onClick={() => handleConcludeAgreement(agr)}
                                className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full text-xs font-medium border border-stone-300 transition-colors cursor-pointer"
                              >
                                Complete Move-Out &amp; Conclude Tenancy
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= 3. PROFILE & ACCOUNT TAB ================= */}
        {navTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Profile Sub-tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-2xl">
              <button
                type="button"
                onClick={() => setProfileSubTab('dashboard')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  profileSubTab === 'dashboard'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Account Dashboard &amp; Settings
              </button>
              <button
                type="button"
                onClick={() => setProfileSubTab('demographics')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  profileSubTab === 'demographics'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Demographics &amp; Privacy
              </button>
            </div>

            {profileSubTab === 'dashboard' ? (
              <AccountDashboard
                currentUserId={currentUserId}
                userRole="customer"
                onNavigateToApplications={() => setNavTab('applications')}
                onNavigateToProperties={() => setNavTab('explore')}
              />
            ) : (
              <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm space-y-6">
                <div className="border-b border-stone-200 pb-4">
                  <h2 className="font-editorial text-2xl font-normal text-stone-900">
                    Tenant Demographic Profile
                  </h2>
                  <p className="text-xs text-stone-500 font-light mt-0.5">
                    Manage your profile details and preferences. You have complete control over voluntary demographic disclosures.
                  </p>
                </div>

            {profileSavedMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{profileSavedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={editProfile.name}
                  onChange={e => setEditProfile({ ...editProfile, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Age (Minimum 18 years)</label>
                <input
                  type="number"
                  min="18"
                  max="120"
                  required
                  value={editProfile.age}
                  onChange={e => setEditProfile({ ...editProfile, age: parseInt(e.target.value) || 18 })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Gender Identity</label>
                <select
                  value={editProfile.gender}
                  onChange={e => setEditProfile({ ...editProfile, gender: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Occupation &amp; Firm</label>
                <input
                  type="text"
                  required
                  value={editProfile.occupation}
                  onChange={e => setEditProfile({ ...editProfile, occupation: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Marital Status</label>
                <select
                  value={editProfile.maritalStatus}
                  onChange={e => setEditProfile({ ...editProfile, maritalStatus: e.target.value as any })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Household Members</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  required
                  value={editProfile.familySize}
                  onChange={e => setEditProfile({ ...editProfile, familySize: parseInt(e.target.value) || 1 })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>
            </div>

            {/* Pets Box */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editProfile.hasPets}
                  onChange={e => setEditProfile({ ...editProfile, hasPets: e.target.checked })}
                  className="w-4 h-4 rounded text-stone-900 focus:ring-0"
                />
                <span className="font-semibold text-stone-900">I have pets</span>
              </label>

              {editProfile.hasPets && (
                <div>
                  <label className="block text-stone-500 mb-1">Pet Breed / Species</label>
                  <input
                    type="text"
                    value={editProfile.petType || ''}
                    onChange={e => setEditProfile({ ...editProfile, petType: e.target.value })}
                    placeholder="e.g. Golden Retriever, 2 Cats"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                  />
                </div>
              )}
            </div>

            {/* SENSITIVE HIGH-RISK DATA: RELIGION & TRIBE */}
            <div className="p-5 bg-stone-100 rounded-3xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-stone-700" />
                  Optional Demographic Fields (High-Risk Category)
                </span>
                <span className="text-[10px] bg-stone-200 text-stone-700 font-mono px-2 py-0.5 rounded-full">
                  AES-256-GCM Encrypted
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed font-light">
                These fields are completely voluntary and blank by default. They are never indexed, not searchable, and never used in filtering algorithms.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-600 mb-1">Religion (Optional)</label>
                  <input
                    type="text"
                    value={editProfile.religion || ''}
                    onChange={e => setEditProfile({ ...editProfile, religion: e.target.value })}
                    placeholder="Leave blank or 'Prefer not to say'"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 mb-1">Tribe / Community (Optional)</label>
                  <input
                    type="text"
                    value={editProfile.tribe || ''}
                    onChange={e => setEditProfile({ ...editProfile, tribe: e.target.value })}
                    placeholder="Leave blank or 'Prefer not to say'"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                  />
                </div>
              </div>

              {/* EXPLICIT CONSENT & REVOCATION CONTROLS */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-stone-700" />
                    <span className="text-xs font-semibold text-stone-900">Demographic Data Privacy &amp; Consent</span>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                    editProfile.consentShareReligionTribe
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {editProfile.consentShareReligionTribe ? 'Consent Active' : 'Consent Removed / Withheld'}
                  </span>
                </div>

                {editProfile.consentShareReligionTribe ? (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                    <div>
                      <span className="font-semibold block">Voluntary Consent Granted</span>
                      <span className="text-[11px] text-amber-700">Property owners can view your religion &amp; tribe on applications.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveConsent}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                      <span>Remove Consent</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <span className="font-semibold block">Consent Removed &amp; Protected</span>
                        <span className="text-[11px] text-emerald-700">Your religion and community identity are completely redacted and hidden from property owners.</span>
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={editProfile.consentShareReligionTribe}
                    onChange={e => setEditProfile({ ...editProfile, consentShareReligionTribe: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-stone-900 focus:ring-0"
                  />
                  <div className="text-xs text-stone-700">
                    <span className="font-semibold block text-stone-900">
                      "I agree the owner of a property I apply to can see my religion/tribe."
                    </span>
                    <span className="text-[11px] text-stone-500">
                      (Optional opt-in. Without this consent, these fields are redacted and never sent to owners. You can remove or withdraw anytime.)
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full text-xs transition-colors shadow-sm cursor-pointer"
              >
                Save Profile Preferences
              </button>
              {editProfile.consentShareReligionTribe && (
                <button
                  type="button"
                  onClick={handleRemoveConsent}
                  className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-full text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Remove Consent</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    )}
  </div>

      {/* ================= PROPERTY INSPECT MODAL ================= */}
      {inspectingListing && (() => {
        const photos = inspectingListing.photos && inspectingListing.photos.length > 0
          ? inspectingListing.photos
          : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80'];
        const totalPhotos = photos.length;
        const safeIndex = Math.min(Math.max(0, inspectPhotoIndex), totalPhotos - 1);
        const currentPhoto = photos[safeIndex] || photos[0];

        return (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setInspectingListing(null);
            }}
          >
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col my-auto">
              
              {/* Photo Area Container */}
              <div className="relative bg-stone-950 shrink-0">
                {inspectPhotoViewMode === 'carousel' ? (
                  /* 1. CAROUSEL VIEW */
                  <div>
                    <div
                      className="relative h-64 sm:h-80 w-full overflow-hidden bg-stone-950 flex items-center justify-center group select-none touch-pan-y cursor-grab active:cursor-grabbing"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onWheel={(e) => {
                        if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
                          e.preventDefault();
                          const delta = -Math.sign(e.deltaY) * 0.25;
                          adjustCarouselZoom(delta);
                        }
                      }}
                      onMouseLeave={() => {
                        if (isDraggingRef.current) {
                          isDraggingRef.current = false;
                          setSwipeOffset(0);
                        }
                        if (panStartRef.current) {
                          panStartRef.current = null;
                        }
                      }}
                    >
                      {/* Image Preloading Strategy: Hidden eager frames pre-decoded in browser cache */}
                      <div className="hidden" aria-hidden="true">
                        <img src={photos[(safeIndex + 1) % totalPhotos]} alt="" loading="eager" />
                        <img src={photos[(safeIndex - 1 + totalPhotos) % totalPhotos]} alt="" loading="eager" />
                      </div>

                      {/* Zoomable Image Viewport with Pinch-to-Zoom */}
                      <div
                        className="w-full h-full flex items-center justify-center overflow-hidden"
                        style={{ touchAction: zoomScale > 1 ? 'none' : 'pan-y' }}
                        onDoubleClick={() => {
                          setZoomScale((prev) => (prev > 1.2 ? 1 : 2.5));
                          setZoomPan({ x: 0, y: 0 });
                        }}
                      >
                        <img
                          key={safeIndex}
                          src={currentPhoto}
                          alt={`${inspectingListing.title} - photo ${safeIndex + 1}`}
                          className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-100 ease-out"
                          style={{
                            transform: `translate(${zoomPan.x + (zoomScale === 1 ? swipeOffset : 0)}px, ${zoomPan.y}px) scale(${zoomScale})`,
                            transformOrigin: 'center center',
                            cursor: zoomScale > 1 ? 'grab' : 'default',
                          }}
                          draggable={false}
                        />
                      </div>

                      {/* Gradient Overlays for header & caption contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/50 pointer-events-none" />

                      {/* Top Bar: Photo count, Grid toggle, Virtual Tour toggle & Close */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                        <div className="flex items-center gap-2">
                          <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1 rounded-full font-medium shadow-xs">
                            {safeIndex + 1} / {totalPhotos} {totalPhotos === 1 ? 'Photo' : 'Photos'}
                          </span>

                          {totalPhotos > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectPhotoViewMode('grid');
                              }}
                              className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                              title="View all photos in a grid"
                            >
                              <Grid className="w-3.5 h-3.5 text-stone-300" />
                              <span className="hidden sm:inline">All Photos Grid</span>
                            </button>
                          )}

                          {/* 360 Virtual Tour Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectPhotoViewMode('virtual_tour');
                            }}
                            className="bg-black/60 hover:bg-black/85 backdrop-blur-md text-amber-300 border border-amber-400/40 text-xs px-3.5 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer group"
                            title="Switch to 360° Virtual Tour"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse group-hover:rotate-12 transition-transform" />
                            <span>Virtual Tour</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingListing(null);
                          }}
                          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                          aria-label="Close modal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* On-screen Zoom HUD Controls */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-lg pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustCarouselZoom(0.3);
                          }}
                          disabled={zoomScale >= 4}
                          className="p-1 rounded-full text-stone-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
                          title="Zoom In (Pinch or Double-click)"
                          aria-label="Zoom in"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            adjustCarouselZoom(-0.3);
                          }}
                          disabled={zoomScale <= 1}
                          className="p-1 rounded-full text-stone-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
                          title="Zoom Out"
                          aria-label="Zoom out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>

                        {zoomScale > 1.05 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetZoom();
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-amber-300 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 transition-colors cursor-pointer"
                            title="Reset zoom to 1x"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{zoomScale.toFixed(1)}x</span>
                          </button>
                        )}
                      </div>

                      {/* Previous / Next Arrow Controls */}
                      {totalPhotos > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectPhotoIndex((prev) => (prev > 0 ? prev - 1 : totalPhotos - 1));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer z-20"
                            aria-label="Previous photo"
                          >
                            <ChevronLeft className="w-5 h-5 -ml-0.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectPhotoIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : 0));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer z-20"
                            aria-label="Next photo"
                          >
                            <ChevronRight className="w-5 h-5 -mr-0.5" />
                          </button>
                        </>
                      )}

                      {/* Property Type Badge in bottom left */}
                      <div className="absolute bottom-3 left-4 text-white text-[11px] font-medium z-10 pointer-events-none">
                        <span className="bg-black/65 backdrop-blur-md px-3 py-1 rounded-full shadow-xs">
                          {inspectingListing.bhk} &bull; {inspectingListing.propertyType}
                        </span>
                      </div>

                      {/* Pagination Dots (Mobile Swipe Feedback & Direct Selection) */}
                      {totalPhotos > 1 && (
                        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-20 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs">
                          {photos.map((_, dotIdx) => (
                            <button
                              key={dotIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectPhotoIndex(dotIdx);
                              }}
                              className={`transition-all rounded-full cursor-pointer ${
                                safeIndex === dotIdx
                                  ? 'w-4 h-1.5 bg-amber-400'
                                  : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                              }`}
                              aria-label={`Go to photo ${dotIdx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Strip (Carousel Mode) */}
                    {totalPhotos > 1 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-stone-900 border-t border-stone-800 overflow-x-auto no-scrollbar">
                        {photos.map((photo, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setInspectPhotoIndex(idx)}
                            className={`relative shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                              safeIndex === idx
                                ? 'border-amber-400 ring-2 ring-amber-400/50 scale-102 opacity-100'
                                : 'border-stone-800 opacity-60 hover:opacity-100 hover:border-stone-600'
                            }`}
                            aria-label={`View photo ${idx + 1}`}
                          >
                            <img
                              src={photo}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/75 text-white font-mono px-1 rounded">
                              {idx + 1}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : inspectPhotoViewMode === 'grid' ? (
                  /* 2. ALL PHOTOS GRID VIEW */
                  <div className="h-64 sm:h-80 w-full overflow-y-auto bg-stone-950 p-3 sm:p-4">
                    {/* Grid Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-800 mb-3 sticky top-0 bg-stone-950/95 backdrop-blur-md z-20 pt-0.5">
                      <div className="flex items-center gap-2">
                        <Grid className="w-4 h-4 text-amber-400" />
                        <span className="text-white text-xs font-semibold">
                          All Available Photos ({totalPhotos})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectPhotoViewMode('virtual_tour')}
                          className="bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-xs px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          <span>360° Tour</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectPhotoViewMode('carousel')}
                          className="bg-stone-800 hover:bg-stone-700 text-white text-xs px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-stone-300" />
                          <span>Back to Carousel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectingListing(null)}
                          className="w-7 h-7 rounded-full bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center cursor-pointer"
                          aria-label="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Photo Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-2">
                      {photos.map((photo, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setInspectPhotoIndex(idx);
                            setInspectPhotoViewMode('carousel');
                          }}
                          className={`relative aspect-4/3 rounded-xl overflow-hidden border cursor-pointer group transition-all ${
                            safeIndex === idx
                              ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-md'
                              : 'border-stone-800 hover:border-stone-600'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`${inspectingListing.title} grid photo ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-medium bg-black/75 px-2 py-0.5 rounded-full backdrop-blur-xs transition-opacity flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              <span>View #{idx + 1}</span>
                            </span>
                          </div>
                          <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md">
                            #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* 3. 360° VIRTUAL TOUR PANORAMA */
                  <div className="relative w-full bg-stone-950">
                    <PanoramaViewer
                      photos={photos}
                      initialIndex={safeIndex}
                      propertyTitle={inspectingListing.title}
                      onClose={() => setInspectingListing(null)}
                    />
                  </div>
                )}

                {/* Persistent View Mode Segmented Controls */}
                <div className="px-3.5 py-2 bg-stone-900 border-t border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                    <button
                      type="button"
                      onClick={() => setInspectPhotoViewMode('carousel')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        inspectPhotoViewMode === 'carousel'
                          ? 'bg-stone-800 text-white font-semibold shadow-xs'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-stone-300" />
                      <span>Photos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectPhotoViewMode('grid')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        inspectPhotoViewMode === 'grid'
                          ? 'bg-stone-800 text-white font-semibold shadow-xs'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5 text-stone-300" />
                      <span>Grid ({totalPhotos})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectPhotoViewMode('virtual_tour')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        inspectPhotoViewMode === 'virtual_tour'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 font-semibold shadow-xs'
                          : 'text-amber-400/80 hover:text-amber-300'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>360° Virtual Tour</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                    {inspectPhotoViewMode === 'virtual_tour' ? (
                      <span className="text-amber-300 flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>Interactive 360° Sphere Active</span>
                      </span>
                    ) : inspectPhotoViewMode === 'grid' ? (
                      <span>All Available Photos</span>
                    ) : (
                      <span>Photo {safeIndex + 1} of {totalPhotos}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Body / Property Details */}
              <div className="p-6 overflow-y-auto space-y-4 text-stone-900 flex-1">
                <div>
                  <h3 className="font-editorial text-2xl font-normal text-stone-900 leading-tight">
                    {inspectingListing.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{inspectingListing.locality}, {inspectingListing.city}</span>
                  </div>
                </div>

                {/* 360° Virtual Tour Interactive Banner */}
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                        <span>360° Virtual Property Tour</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-800 text-[9px] font-mono font-bold uppercase">
                          Interactive 3D
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Immersive panoramic walkthrough with 360-degree look-around, room switching, and zoom.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInspectPhotoViewMode(inspectPhotoViewMode === 'virtual_tour' ? 'carousel' : 'virtual_tour');
                    }}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      inspectPhotoViewMode === 'virtual_tour'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white font-semibold'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{inspectPhotoViewMode === 'virtual_tour' ? 'Exit 360° Tour' : 'Start 360° Tour'}</span>
                  </button>
                </div>

                {/* Financial Structure (Rule 7) */}
                <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-3 text-xs">
                  <div className="flex items-baseline justify-between border-b border-stone-200/60 pb-2.5">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">Monthly Rent</span>
                      <span className="font-editorial text-2xl font-bold text-stone-900">
                        ₹{inspectingListing.rentMonthly.toLocaleString('en-IN')}
                        <span className="text-xs text-stone-400 font-sans font-normal ml-1">/ month</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">Security Deposit</span>
                      <span className="font-mono text-sm font-semibold text-stone-800">
                        ₹{inspectingListing.securityDeposit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-stone-700">
                      <span className="font-medium">Application Fee (Pay Now):</span>
                      <span className="font-mono font-semibold text-stone-900">₹20.00 <span className="text-[10px] text-stone-500 font-normal">(Non-refundable)</span></span>
                    </div>

                    <div className="pt-2 border-t border-stone-200/60">
                      <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold block mb-1">
                        If Application Is Accepted:
                      </span>
                      <div className="flex justify-between items-center text-stone-700 text-[11px]">
                        <span>Brokerage (10% of 1 month's rent):</span>
                        <span className="font-mono font-semibold text-stone-900">
                          ₹{Math.round(inspectingListing.rentMonthly * 0.10).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1 italic">
                        Flat 10% customer brokerage upon acceptance. No customer platform fee after acceptance.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-200/70">
                    <Bed className="w-4 h-4 mx-auto text-stone-600 mb-1" />
                    <div className="font-bold">{inspectingListing.bedrooms || 3}</div>
                    <div className="text-[10px] text-stone-400">Bedrooms</div>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-200/70">
                    <Bath className="w-4 h-4 mx-auto text-stone-600 mb-1" />
                    <div className="font-bold">{inspectingListing.bathrooms || 2}</div>
                    <div className="text-[10px] text-stone-400">Bathrooms</div>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-200/70">
                    <Square className="w-4 h-4 mx-auto text-stone-600 mb-1" />
                    <div className="font-bold">{inspectingListing.sqft || 1800}</div>
                    <div className="text-[10px] text-stone-400">Sqft Area</div>
                  </div>
                  <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-200/70">
                    <Car className="w-4 h-4 mx-auto text-stone-600 mb-1" />
                    <div className="font-bold">{inspectingListing.parking || 1}</div>
                    <div className="text-[10px] text-stone-400">Parking</div>
                  </div>
                </div>

                {/* Amenities */}
                {inspectingListing.amenities && inspectingListing.amenities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-stone-700 block">Property Amenities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectingListing.amenities.map((am, aIdx) => (
                        <span key={aIdx} className="px-2.5 py-1 bg-stone-100 rounded-lg text-[11px] text-stone-700">
                          {am}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suitability & Rules */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Tenant Eligibility:</span>
                    <span className="font-semibold text-stone-900">{inspectingListing.suitableFor}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600 text-[11px]">
                    <span>Pet Policy:</span>
                    <span className="font-medium text-stone-800">
                      {inspectingListing.requirements.petsAllowed ? 'Pets Allowed' : 'Strictly No Pets'}
                    </span>
                  </div>
                </div>

                {/* Verified Tenant Reviews Section */}
                {(() => {
                  const propReviewSummary = backendService.getPropertyReviewSummary(inspectingListing.id);
                  return (
                    <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-stone-200/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          <h4 className="font-semibold text-stone-900 text-sm">
                            Verified Tenant Reviews
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-stone-700">
                          {propReviewSummary.total > 0 ? (
                            <span className="flex items-center gap-1 font-bold text-stone-900">
                              <span>{propReviewSummary.averageRating.toFixed(1)}</span>
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                              <span className="text-stone-400 font-normal font-sans text-[11px]">
                                ({propReviewSummary.total} {propReviewSummary.total === 1 ? 'review' : 'reviews'})
                              </span>
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px] font-sans">No reviews yet</span>
                          )}
                        </div>
                      </div>

                      {propReviewSummary.total === 0 ? (
                        <p className="text-[11px] text-stone-500 italic py-1">
                          Reviews can only be submitted by verified tenants after a signed lease agreement concludes.
                        </p>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {propReviewSummary.reviews.map((rev) => (
                            <div key={rev.id} className="bg-white rounded-xl p-3 border border-stone-200/70 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-stone-900 text-xs block">{rev.title}</span>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-400">
                                    <span className="font-medium text-stone-600">{rev.tenantName}</span>
                                    <span>&bull;</span>
                                    <span className="text-emerald-700 font-medium">✓ Verified Tenant</span>
                                    {rev.stayDurationMonths && (
                                      <>
                                        <span>&bull;</span>
                                        <span>{rev.stayDurationMonths} mo. stay</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <StarRating value={rev.propertyRating} readOnly size="sm" />
                              </div>

                              <p className="text-[11px] text-stone-600 leading-relaxed">
                                "{rev.reviewText}"
                              </p>

                              {rev.tags && rev.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {rev.tags.map((t, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-stone-100 rounded-md text-[10px] text-stone-600">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {rev.ownerResponse && (
                                <div className="bg-amber-50/70 border-l-2 border-amber-500 p-2 rounded-r-lg text-[10px] text-amber-900 space-y-0.5 mt-2">
                                  <span className="font-bold flex items-center gap-1 text-amber-950">
                                    Response from Owner ({rev.ownerName}):
                                  </span>
                                  <p className="italic text-stone-700">"{rev.ownerResponse}"</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Masked Address Note */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-1">
                  <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-stone-600" />
                    <span>Exact Property Address Protected</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Exact property address and owner contact details are shared after the appropriate stage of the rental process (application acceptance and deposit settlement).
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setInspectingListing(null)}
                    className="w-1/3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-full text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleInitiateApply(inspectingListing);
                      setInspectingListing(null);
                    }}
                    className="w-2/3 py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Apply to Rent (₹20 Application Fee)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Razorpay Escrow Modal */}
      <RazorpayModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handleFeePaymentSuccess}
        amount={20}
        title="NivasPay Application Processing Fee"
        subtitle="₹20 application fee (Non-refundable). If your application is accepted, brokerage of 10% of monthly rent applies."
      />

      {/* Razorpay Deposit Balance Modal */}
      {targetDepositApp && (
        <RazorpayModal
          isOpen={isDepositPaymentModalOpen}
          onClose={() => {
            setIsDepositPaymentModalOpen(false);
            setTargetDepositApp(null);
          }}
          onSuccess={handleDepositPaymentSuccess}
          amount={targetDepositApp.depositBalanceAmount || 150000}
          title="Security Deposit & Brokerage Settlement"
          subtitle="Direct escrow settlement. Unlocks full property address and owner contact."
        />
      )}

      {/* Report Rejection Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 border border-stone-200 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-600" />
                <h4 className="font-editorial text-lg text-stone-900">Report Discriminatory Rejection</h4>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center text-xs space-y-1">
                <CheckCircle className="w-5 h-5 mx-auto text-emerald-600" />
                <div className="font-bold">Report Filed with Compliance Officer</div>
                <p className="text-stone-600">
                  Our compliance team will review the rejection logs. Violations result in owner strikes and suspension.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-3">
                <p className="text-xs text-stone-600 leading-relaxed font-light">
                  Under NivasPay terms and Article 15 of the Constitution of India, property owners are strictly forbidden from rejecting applicants based on religion, caste, gender, or tribe.
                </p>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">State why you believe this rejection was discriminatory:</label>
                  <textarea
                    rows={4}
                    required
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                    placeholder="Provide details or context regarding the rejection..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-full text-xs font-medium transition-colors shadow-xs"
                  >
                    Submit Report to Admin
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Review & Rating Modal for Concluded Tenancies */}
      {reviewModalAgreement && (
        <LeaveReviewModal
          isOpen={Boolean(reviewModalAgreement)}
          agreement={reviewModalAgreement}
          token={token || backendService.getAuthToken() || undefined}
          onClose={() => setReviewModalAgreement(null)}
          onReviewSubmitted={() => {
            setReviewsRefreshTrigger(p => p + 1);
            setConcludeSuccessNotice('Thank you! Your verified review and rating have been recorded.');
            setTimeout(() => setConcludeSuccessNotice(null), 5000);
          }}
        />
      )}
    </div>
  );
};
