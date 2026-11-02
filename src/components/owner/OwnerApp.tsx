import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  FileText,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Eye,
  Check,
  X,
  Shield,
  ShieldCheck,
  Lock,
  ArrowUpRight,
  Filter,
  Search,
  ChevronRight,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  RefreshCw,
  Home,
  CheckSquare,
  AlertTriangle,
  PieChart,
  BarChart3,
  Bell,
  Settings,
  Sliders,
  Wrench,
  HelpCircle,
  Phone,
  Mail,
  CreditCard,
  UserCheck,
  ChevronDown,
  Info,
  CheckCheck,
  ExternalLink,
  TrendingDown,
  Wallet,
  Receipt,
  Download,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  MessageSquareQuote,
  CornerDownRight,
  ThumbsUp,
  Flag
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Listing,
  Application,
  RejectionReasonCode,
  SuitableForType,
  OwnerOperationalMetrics,
  AppNotification,
  PropertyOccupancyDataPoint,
  PaymentRecord,
  PropertyReview,
  OwnerReviewSummary
} from '../../types';
import { backendService, encryptField, ownerAggregationService } from '../../services/backendService';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime, formatAbsoluteDate } from '../../utils/dateUtils';
import { AccountDashboard } from '../profile/AccountDashboard';
import { StarRating } from '../common/StarRating';
import apiClient from '../../services/apiClient';
import { motion, AnimatePresence } from 'motion/react';

interface OwnerAppProps {
  currentOwnerId?: string;
  onSwitchOwner?: (ownerId: string) => void;
}

type OwnerSection =
  | 'dashboard'
  | 'properties'
  | 'applications'
  | 'tenants'
  | 'rent_collection'
  | 'reviews'
  | 'analytics'
  | 'notifications'
  | 'create_listing'
  | 'account_kyc'
  | 'settings'
  | 'help_support';

// =========================================================================
// SVG DONUT CHART (Occupancy Overview)
// =========================================================================
const OccupancyDonutChart: React.FC<{
  percentage: number;
  occupied: number;
  vacant: number;
  total: number;
}> = ({ percentage, occupied, vacant, total }) => {
  const size = 150;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const occupiedStroke = total > 0 ? (occupied / total) * circumference : 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background Track (Vacant Units Arc) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={strokeWidth}
        />
        {/* Occupied Units Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#059669"
          strokeWidth={strokeWidth}
          strokeDasharray={`${occupiedStroke} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span className="text-2xl font-bold tracking-tight text-stone-900 font-mono tabular-nums">
          {percentage}%
        </span>
        <span className="text-[10px] uppercase font-semibold text-stone-500 tracking-wider">
          Occupancy
        </span>
      </div>
    </div>
  );
};

// =========================================================================
// PROPERTY OCCUPANCY DELTA & COLOR-CODED CHANGE INDICATOR (MoM Shifts)
// =========================================================================
export interface PropertyOccupancyDelta {
  currentRate: number;
  previousRate: number;
  deltaRate: number; // percentage point difference (e.g. +16, -9)
  deltaUnits: number; // units difference (e.g. +1, -1)
  currentOccupied: number;
  previousOccupied: number;
  totalUnits: number;
  currentMonth: string;
  previousMonth: string;
  isSignificant: boolean; // change >= 5% or >= 1 unit
  trend: 'growth' | 'decline' | 'stable';
}

export function computePropertyOccupancyDelta(property: Listing): PropertyOccupancyDelta {
  const history = backendService.getPropertyOccupancyHistory(property);
  const dynamicUnits = property.units || backendService.getPropertyUnits(property);
  const total = Math.max(1, dynamicUnits.length || property.totalUnits || 1);
  const currentOccupied = dynamicUnits.length > 0
    ? dynamicUnits.filter(u => u.status === 'occupied').length
    : (property.occupiedUnits !== undefined
        ? property.occupiedUnits
        : (property.status === 'rented' ? total : Math.max(0, total - 1)));
  const currentRate = Math.round((currentOccupied / total) * 100);

  if (!history || history.length < 2) {
    return {
      currentRate,
      previousRate: currentRate,
      deltaRate: 0,
      deltaUnits: 0,
      currentOccupied,
      previousOccupied: currentOccupied,
      totalUnits: total,
      currentMonth: 'Oct 2026',
      previousMonth: 'Sep 2026',
      isSignificant: false,
      trend: 'stable',
    };
  }

  const currentPt = history[history.length - 1];
  const previousPt = history[history.length - 2];

  const deltaRate = currentPt.occupancyRate - previousPt.occupancyRate;
  const deltaUnits = currentPt.occupiedUnits - previousPt.occupiedUnits;
  const isSignificant = Math.abs(deltaRate) >= 5 || Math.abs(deltaUnits) >= 1;
  const trend = deltaRate > 0 ? 'growth' : deltaRate < 0 ? 'decline' : 'stable';

  return {
    currentRate: currentPt.occupancyRate,
    previousRate: previousPt.occupancyRate,
    deltaRate,
    deltaUnits,
    currentOccupied: currentPt.occupiedUnits,
    previousOccupied: previousPt.occupiedUnits,
    totalUnits: currentPt.totalUnits || total,
    currentMonth: currentPt.shortMonth || 'Oct',
    previousMonth: previousPt.shortMonth || 'Sep',
    isSignificant,
    trend,
  };
}

export const PropertyOccupancyChangeIndicator: React.FC<{
  property: Listing;
  showComparisonLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
  highlightSignificant?: boolean;
}> = ({
  property,
  showComparisonLabel = true,
  size = 'sm',
  highlightSignificant = true,
}) => {
  const delta = useMemo(() => computePropertyOccupancyDelta(property), [property]);

  if (delta.trend === 'growth') {
    return (
      <div
        className={`inline-flex items-center gap-1 font-bold rounded-full border transition-all ${
          size === 'xs'
            ? 'px-1.5 py-0.5 text-[9px]'
            : size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : 'px-2.5 py-1 text-xs'
        } ${
          delta.isSignificant && highlightSignificant
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/40 shadow-2xs'
            : 'bg-emerald-50/70 text-emerald-700 border-emerald-200'
        }`}
        title={`${property.title}: Occupancy grew by ${delta.deltaRate}% (+${delta.deltaUnits} unit${Math.abs(delta.deltaUnits) === 1 ? '' : 's'}) compared to ${delta.previousMonth} (${delta.previousRate}% → ${delta.currentRate}%)`}
      >
        <ArrowUp
          className={`${
            size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } text-emerald-600 stroke-[2.75]`}
        />
        <span>+{delta.deltaRate}%</span>
        {showComparisonLabel && (
          <span className="text-[9px] font-normal text-emerald-700/80">vs {delta.previousMonth}</span>
        )}
        {delta.isSignificant && highlightSignificant && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}
      </div>
    );
  }

  if (delta.trend === 'decline') {
    return (
      <div
        className={`inline-flex items-center gap-1 font-bold rounded-full border transition-all ${
          size === 'xs'
            ? 'px-1.5 py-0.5 text-[9px]'
            : size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : 'px-2.5 py-1 text-xs'
        } ${
          delta.isSignificant && highlightSignificant
            ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/40 shadow-2xs'
            : 'bg-rose-50/70 text-rose-700 border-rose-200'
        }`}
        title={`${property.title}: Occupancy declined by ${Math.abs(delta.deltaRate)}% (${delta.deltaUnits} unit${Math.abs(delta.deltaUnits) === 1 ? '' : 's'}) compared to ${delta.previousMonth} (${delta.previousRate}% → ${delta.currentRate}%)`}
      >
        <ArrowDown
          className={`${
            size === 'xs' ? 'w-2.5 h-2.5' : size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } text-rose-600 stroke-[2.75]`}
        />
        <span>{delta.deltaRate}%</span>
        {showComparisonLabel && (
          <span className="text-[9px] font-normal text-rose-700/80">vs {delta.previousMonth}</span>
        )}
        {delta.isSignificant && highlightSignificant && (
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 font-medium rounded-full border bg-stone-100 text-stone-600 border-stone-200 ${
        size === 'xs'
          ? 'px-1.5 py-0.5 text-[9px]'
          : size === 'sm'
          ? 'px-2 py-0.5 text-[10px]'
          : 'px-2.5 py-1 text-xs'
      }`}
      title={`${property.title}: Occupancy unchanged (${delta.currentRate}%) compared to ${delta.previousMonth}`}
    >
      <span className="text-stone-400 font-mono text-[9px]">—</span>
      <span>0%</span>
      {showComparisonLabel && (
        <span className="text-[9px] text-stone-400 font-normal">vs {delta.previousMonth}</span>
      )}
    </div>
  );
};

// =========================================================================
// HISTORICAL RENTAL INCOME BAR CHART (Collected vs Pending)
// =========================================================================
const RentalIncomeBarChart: React.FC<{
  data: Array<{ month: string; collected: number; pending: number }>;
}> = ({ data }) => {
  const maxVal = Math.max(
    ...data.map(d => (d.collected + d.pending) || 1),
    35000
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
            <span className="text-stone-700 font-medium text-[11px]">Collected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" />
            <span className="text-stone-700 font-medium text-[11px]">Pending</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-stone-400">Past 3 Billing Cycles</span>
      </div>

      <div className="h-36 flex items-end justify-between gap-3 pt-4 pb-2 px-1 border-b border-stone-200">
        {data.map(item => {
          const collectedHeight = Math.round((item.collected / maxVal) * 96);
          const pendingHeight = Math.round((item.pending / maxVal) * 96);
          const total = item.collected + item.pending;

          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5 group">
              <span className="text-[10px] font-mono font-semibold text-stone-700 opacity-0 group-hover:opacity-100 transition-opacity">
                ₹{total.toLocaleString('en-IN')}
              </span>
              <div className="w-full max-w-[48px] flex items-end gap-1 justify-center h-[96px]">
                {/* Collected Bar */}
                <div
                  style={{ height: `${Math.max(collectedHeight, 8)}px` }}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 rounded-t-sm transition-all relative cursor-pointer"
                  title={`${item.month} Collected: ₹${item.collected.toLocaleString('en-IN')}`}
                />
                {/* Pending Bar */}
                <div
                  style={{ height: `${Math.max(pendingHeight, item.pending > 0 ? 8 : 0)}px` }}
                  className={`w-1/2 rounded-t-sm transition-all relative ${
                    item.pending > 0 ? 'bg-amber-400 hover:bg-amber-300 cursor-pointer' : 'bg-transparent'
                  }`}
                  title={`${item.month} Pending: ₹${item.pending.toLocaleString('en-IN')}`}
                />
              </div>
              <span className="text-[11px] font-medium text-stone-600">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// 6-MONTH RENTAL INCOME TRENDS LINE CHART (Recharts)
// =========================================================================
interface RentalIncomeTrendsLineChartProps {
  data: Array<{
    month: string;
    shortMonth?: string;
    collected: number;
    pending: number;
    expectedRent?: number;
    collectionRate?: number;
  }>;
  propertiesCount: number;
  occupiedUnitsCount: number;
  totalUnitsCount: number;
}

const RentalIncomeTrendsLineChart: React.FC<RentalIncomeTrendsLineChartProps> = ({
  data,
  propertiesCount,
  occupiedUnitsCount,
  totalUnitsCount,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'collected' | 'expected'>('both');
  const [showAverageLine, setShowAverageLine] = useState<boolean>(true);

  // Normalize data ensuring 6 months are cleanly formatted
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { month: 'May 2026', shortMonth: 'May', collected: 24000, expectedRent: 24000, pending: 0, collectionRate: 100 },
        { month: 'Jun 2026', shortMonth: 'Jun', collected: 25000, expectedRent: 25000, pending: 0, collectionRate: 100 },
        { month: 'Jul 2026', shortMonth: 'Jul', collected: 26500, expectedRent: 26500, pending: 0, collectionRate: 100 },
        { month: 'Aug 2026', shortMonth: 'Aug', collected: 26500, expectedRent: 26500, pending: 0, collectionRate: 100 },
        { month: 'Sep 2026', shortMonth: 'Sep', collected: 26500, expectedRent: 26500, pending: 0, collectionRate: 100 },
        { month: 'Oct 2026', shortMonth: 'Oct', collected: 26500, expectedRent: 26500, pending: 0, collectionRate: 100 },
      ];
    }
    return data.map(item => {
      const shortMonth = item.shortMonth || item.month.split(' ')[0] || item.month;
      const collected = Number(item.collected) || 0;
      const expectedRent = item.expectedRent !== undefined
        ? Number(item.expectedRent)
        : (collected + (Number(item.pending) || 0));
      const pending = Number(item.pending) || 0;
      const collectionRate = item.collectionRate !== undefined
        ? Number(item.collectionRate)
        : (expectedRent > 0 ? Math.round((collected / expectedRent) * 100) : 100);

      return {
        month: item.month,
        shortMonth,
        collected,
        expectedRent,
        pending,
        collectionRate,
      };
    });
  }, [data]);

  // Aggregate financial metrics over the 6 months
  const totalCollected = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.collected, 0);
  }, [chartData]);

  const totalExpected = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.expectedRent, 0);
  }, [chartData]);

  const avgMonthlyCollected = useMemo(() => {
    return chartData.length > 0 ? Math.round(totalCollected / chartData.length) : 0;
  }, [totalCollected, chartData.length]);

  const overallCollectionRate = useMemo(() => {
    return totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 100;
  }, [totalCollected, totalExpected]);

  const firstMonth = chartData[0];
  const lastMonth = chartData[chartData.length - 1];
  const growthRate = useMemo(() => {
    if (!firstMonth || !lastMonth || firstMonth.collected === 0) return 0;
    return Math.round(((lastMonth.collected - firstMonth.collected) / firstMonth.collected) * 100);
  }, [firstMonth, lastMonth]);

  const peakMonth = useMemo(() => {
    return [...chartData].sort((a, b) => b.collected - a.collected)[0] || { month: 'Oct 2026', collected: 0 };
  }, [chartData]);

  const maxVal = useMemo(() => {
    const highest = Math.max(
      ...chartData.map(d => Math.max(d.collected, d.expectedRent)),
      20000
    );
    return Math.ceil((highest * 1.15) / 5000) * 5000;
  }, [chartData]);

  // Custom Recharts Tooltip
  const CustomRentalTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const current = payload[0].payload;
      return (
        <div className="bg-stone-900/95 backdrop-blur-md text-white border border-stone-800 rounded-xl p-3.5 shadow-2xl text-xs space-y-2.5 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <span className="font-semibold text-stone-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              {current.month}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-400">
              {current.collectionRate}% Realized
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5 font-sans">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Realized Income:
              </span>
              <span className="font-bold text-emerald-400 tabular-nums">
                ₹{current.collected.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5 font-sans">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                Contracted Due:
              </span>
              <span className="text-stone-300 tabular-nums">
                ₹{current.expectedRent.toLocaleString('en-IN')}
              </span>
            </div>

            {current.pending > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-amber-400">
                <span className="font-sans flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Cycle Pending:
                </span>
                <span className="font-bold tabular-nums">
                  ₹{current.pending.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-stone-400 pt-1.5 border-t border-stone-800/80 flex items-center justify-between">
            <span>Owner Brokerage:</span>
            <span className="text-emerald-400 font-semibold font-mono">₹0 (None)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden space-y-6 p-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-900">Rental Income Trends (Last 6 Months)</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              Verified Cash Flow
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Historical monthly rental realization, collection consistency, and net owner payout trajectory
          </p>
        </div>

        {/* View Mode & Reference Line Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => setViewMode('collected')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'collected'
                  ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Realized
            </button>
            <button
              type="button"
              onClick={() => setViewMode('expected')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'expected'
                  ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Contracted
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAverageLine(!showAverageLine)}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showAverageLine
                ? 'bg-stone-50 border-stone-300 text-stone-800'
                : 'bg-white border-stone-200 text-stone-400 hover:text-stone-700'
            }`}
          >
            {showAverageLine ? 'Avg Line: On' : 'Avg Line: Off'}
          </button>
        </div>
      </div>

      {/* 2. Key Financial Insight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-[11px] text-stone-500 font-medium block">6-Month Total Realized</span>
          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>{growthRate >= 0 ? `+${growthRate}%` : `${growthRate}%`} vs 6-mo start</span>
          </div>
        </div>

        <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-[11px] text-stone-500 font-medium block">Monthly Average Realized</span>
          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
            ₹{avgMonthlyCollected.toLocaleString('en-IN')}/mo
          </div>
          <span className="text-[10px] text-stone-400 block font-mono">
            Across {chartData.length} billing cycles
          </span>
        </div>

        <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-[11px] text-stone-500 font-medium block">Realization Efficiency</span>
          <div className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
            {overallCollectionRate}%
          </div>
          <span className="text-[10px] text-emerald-600 font-medium block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Zero tenancy defaults
          </span>
        </div>

        <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/80 space-y-1">
          <span className="text-[11px] text-stone-500 font-medium block">Owner Brokerage Paid</span>
          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
            ₹0 (0%)
          </div>
          <span className="text-[10px] text-stone-500 block">
            100% rental realization kept
          </span>
        </div>
      </div>

      {/* 3. Recharts Line Chart */}
      <div className="pt-2">
        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="shortMonth"
                stroke="#64748b"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                dy={6}
              />
              <YAxis
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(val: number) => `₹${val >= 1000 ? Math.round(val / 1000) + 'k' : val}`}
                domain={[0, maxVal]}
              />
              <Tooltip content={<CustomRentalTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px' }}
                iconType="circle"
              />

              {showAverageLine && avgMonthlyCollected > 0 && (
                <ReferenceLine
                  y={avgMonthlyCollected}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: `6-Mo Avg: ₹${avgMonthlyCollected.toLocaleString('en-IN')}`,
                    fill: '#64748b',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                />
              )}

              {(viewMode === 'both' || viewMode === 'expected') && (
                <Line
                  type="monotone"
                  dataKey="expectedRent"
                  name="Contracted Expected Rent"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#e0e7ff', strokeWidth: 2 }}
                />
              )}

              {(viewMode === 'both' || viewMode === 'collected') && (
                <Line
                  type="monotone"
                  dataKey="collected"
                  name="Realized Rental Income (Collected)"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#059669', stroke: '#ecfdf5', strokeWidth: 3 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Month-by-Month Trajectory Grid */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
          <span>Month-by-Month Performance Breakdown</span>
          <span className="text-[11px] text-stone-500 font-normal">Past 6 Calendar Cycles</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {chartData.map((m, idx) => {
            const isLatest = idx === chartData.length - 1;
            return (
              <div
                key={m.month}
                className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                  isLatest
                    ? 'bg-emerald-50/50 border-emerald-300/80 shadow-2xs'
                    : 'bg-stone-50/50 border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800 text-[11px]">{m.shortMonth}</span>
                  {isLatest && (
                    <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-emerald-600 text-white">
                      Current
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="text-sm font-bold font-mono text-stone-900 tabular-nums">
                    ₹{m.collected.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Target: ₹{m.expectedRent.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(m.collectionRate, 100)}%` }}
                    className="h-full bg-emerald-600 rounded-full transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-stone-500">
                  <span>Realized</span>
                  <span className="font-mono font-semibold text-emerald-700">{m.collectionRate}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Actionable Financial Insights & Advisory */}
      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/90 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Financial Insights &amp; Realization Highlights</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-stone-600">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-900 block">Cash Flow Predictability</span>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Consistent {overallCollectionRate}% realization rate over the last 6 months shows high tenant payment reliability.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-900 block">Zero Brokerage Guarantee</span>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                NivasPay never deducts brokerage from property owners, saving you 8-10% of annual rental yields.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ArrowUpRight className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-900 block">Yield Optimization</span>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                {totalUnitsCount > occupiedUnitsCount
                  ? `Filling ${totalUnitsCount - occupiedUnitsCount} vacant unit(s) can add further upside to monthly income.`
                  : 'Portfolio is currently operating at maximum 100% capacity and peak revenue realization.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// MINI OCCUPANCY TREND LINE CHART (Manage Property Modal - Recharts)
// =========================================================================
interface PropertyMiniOccupancyTrendChartProps {
  property: Listing;
}

const PropertyMiniOccupancyTrendChart: React.FC<PropertyMiniOccupancyTrendChartProps> = ({ property }) => {
  const [metricView, setMetricView] = useState<'rate' | 'units'>('rate');

  // Compute live unit counts dynamically to handle real-time inventory updates
  const dynamicUnits = property.units || backendService.getPropertyUnits(property);
  const effectiveTotalUnits = Math.max(1, dynamicUnits.length || property.totalUnits || 1);
  const effectiveOccupiedUnits = dynamicUnits.length > 0
    ? dynamicUnits.filter(u => u.status === 'occupied').length
    : (property.occupiedUnits !== undefined
        ? property.occupiedUnits
        : (property.status === 'rented' ? effectiveTotalUnits : Math.max(0, effectiveTotalUnits - 1)));
  const effectiveOccupancyRate = Math.round((effectiveOccupiedUnits / effectiveTotalUnits) * 100);
  const rentMonthly = property.rentMonthly || 10000;

  // Derive 6-month historical progression and dynamically synchronize with latest unit updates
  const historyData: PropertyOccupancyDataPoint[] = useMemo(() => {
    const rawHistory = backendService.getPropertyOccupancyHistory(property);
    
    // Default fallback months if raw history is unavailable or partial
    const monthConfigs = [
      { month: 'May 2026', shortMonth: 'May', ratio: 0.65 },
      { month: 'Jun 2026', shortMonth: 'Jun', ratio: 0.72 },
      { month: 'Jul 2026', shortMonth: 'Jul', ratio: 0.80 },
      { month: 'Aug 2026', shortMonth: 'Aug', ratio: 0.85 },
      { month: 'Sep 2026', shortMonth: 'Sep', ratio: 0.92 },
      { month: 'Oct 2026', shortMonth: 'Oct', ratio: 1.0 },
    ];

    if (!rawHistory || rawHistory.length === 0) {
      return monthConfigs.map((cfg, idx) => {
        const occ = idx === 5
          ? effectiveOccupiedUnits
          : Math.min(effectiveTotalUnits, Math.max(0, Math.round(effectiveOccupiedUnits * cfg.ratio)));
        const rate = Math.round((occ / effectiveTotalUnits) * 100);
        return {
          month: cfg.month,
          shortMonth: cfg.shortMonth,
          occupiedUnits: occ,
          totalUnits: effectiveTotalUnits,
          occupancyRate: rate,
          estimatedRevenue: occ * rentMonthly,
        };
      });
    }

    // Align raw history dynamically with the current property units and total units
    return rawHistory.map((pt, idx) => {
      const isLatest = idx === rawHistory.length - 1;
      const occ = isLatest
        ? effectiveOccupiedUnits
        : Math.min(effectiveTotalUnits, Math.max(0, pt.occupiedUnits));
      const rate = Math.round((occ / effectiveTotalUnits) * 100);
      return {
        ...pt,
        totalUnits: effectiveTotalUnits,
        occupiedUnits: occ,
        occupancyRate: rate,
        estimatedRevenue: occ * rentMonthly,
      };
    });
  }, [property, property.units, property.occupiedUnits, property.totalUnits, property.status, property.rentMonthly, effectiveOccupiedUnits, effectiveTotalUnits, rentMonthly]);

  const currentPoint = historyData[historyData.length - 1] || {
    month: 'Oct 2026',
    shortMonth: 'Oct',
    occupiedUnits: effectiveOccupiedUnits,
    totalUnits: effectiveTotalUnits,
    occupancyRate: effectiveOccupancyRate,
    estimatedRevenue: effectiveOccupiedUnits * rentMonthly,
  };

  const initialPoint = historyData[0] || currentPoint;
  const netChangeRate = currentPoint.occupancyRate - initialPoint.occupancyRate;
  const netChangeUnits = currentPoint.occupiedUnits - initialPoint.occupiedUnits;

  // Averages across the 6-month period
  const avgOccupancyRate = useMemo(() => {
    if (!historyData || historyData.length === 0) return currentPoint.occupancyRate;
    const sum = historyData.reduce((acc, curr) => acc + curr.occupancyRate, 0);
    return Math.round(sum / historyData.length);
  }, [historyData, currentPoint.occupancyRate]);

  const avgOccupiedUnits = useMemo(() => {
    if (!historyData || historyData.length === 0) return currentPoint.occupiedUnits;
    const sum = historyData.reduce((acc, curr) => acc + curr.occupiedUnits, 0);
    return (sum / historyData.length).toFixed(1);
  }, [historyData, currentPoint.occupiedUnits]);

  return (
    <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/90 space-y-3">
      {/* 1. Header with Title & Accessible Toggleable Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h5 className="text-xs font-bold text-stone-900 tracking-tight">6-Month Occupancy Trend</h5>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-medium px-2 py-0.5 rounded-full border border-emerald-200/70">
              Live Synced
            </span>
          </div>
          <p className="text-[11px] text-stone-500">
            {metricView === 'rate'
              ? 'Showing monthly occupancy percentage rates over the past 6 months'
              : `Showing monthly occupied unit counts (out of ${effectiveTotalUnits} units)`}
          </p>
        </div>

        {/* Toggleable Switch: Unit Count vs Percentage Rates */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-stone-200/60 p-1 rounded-xl border border-stone-200">
          <button
            type="button"
            onClick={() => setMetricView('rate')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              metricView === 'rate'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Percentage (%)
          </button>

          {/* Interactive Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={metricView === 'units'}
            aria-label="Toggle between Percentage Rate and Unit Count"
            onClick={() => setMetricView(prev => (prev === 'rate' ? 'units' : 'rate'))}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              metricView === 'units' ? 'bg-teal-700' : 'bg-emerald-600'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                metricView === 'units' ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setMetricView('units')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              metricView === 'units'
                ? 'bg-white text-teal-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Unit Count
          </button>
        </div>
      </div>

      {/* 2. Key Micro Stats Row - Dynamically changes based on selected toggle */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-stone-200/70">
          <span className="text-[10px] text-stone-500 block">
            {metricView === 'rate' ? 'Current Occupancy' : 'Occupied Units'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            {metricView === 'rate' ? (
              <>
                <span className="font-bold font-mono text-emerald-700 text-sm">
                  {currentPoint.occupancyRate}%
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  ({currentPoint.occupiedUnits}/{effectiveTotalUnits})
                </span>
              </>
            ) : (
              <>
                <span className="font-bold font-mono text-teal-800 text-sm">
                  {currentPoint.occupiedUnits} <span className="text-xs font-normal text-stone-500">/ {effectiveTotalUnits}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  ({currentPoint.occupancyRate}%)
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-stone-200/70">
          <span className="text-[10px] text-stone-500 block">
            {metricView === 'rate' ? '6-Mo Avg Rate' : '6-Mo Avg Units'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            {metricView === 'rate' ? (
              <>
                <span className="font-bold font-mono text-stone-900 text-sm">
                  {avgOccupancyRate}%
                </span>
                <span className="text-[10px] text-stone-400 font-mono">portfolio</span>
              </>
            ) : (
              <>
                <span className="font-bold font-mono text-stone-900 text-sm">
                  {avgOccupiedUnits} <span className="text-xs font-normal text-stone-500">units</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono">avg</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-stone-200/70">
          <span className="text-[10px] text-stone-500 block">
            {metricView === 'rate' ? 'Rate Delta vs May' : 'Units Delta vs May'}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {metricView === 'rate' ? (
              netChangeRate > 0 ? (
                <span className="font-bold font-mono text-emerald-700 text-sm">+{netChangeRate}%</span>
              ) : netChangeRate < 0 ? (
                <span className="font-bold font-mono text-rose-600 text-sm">{netChangeRate}%</span>
              ) : (
                <span className="font-bold font-mono text-stone-700 text-sm">Stable</span>
              )
            ) : (
              netChangeUnits > 0 ? (
                <span className="font-bold font-mono text-teal-700 text-sm">+{netChangeUnits} {netChangeUnits === 1 ? 'unit' : 'units'}</span>
              ) : netChangeUnits < 0 ? (
                <span className="font-bold font-mono text-rose-600 text-sm">{netChangeUnits} {Math.abs(netChangeUnits) === 1 ? 'unit' : 'units'}</span>
              ) : (
                <span className="font-bold font-mono text-stone-700 text-sm">Stable</span>
              )
            )}
            <span className="text-[10px] text-stone-400">trend</span>
          </div>
        </div>
      </div>

      {/* 3. Recharts Mini Line Chart with Dynamic Scales */}
      <div className="h-36 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historyData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="shortMonth"
              tick={{ fill: '#78716c', fontSize: 10, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#e7e5e4' }}
            />
            <YAxis
              domain={metricView === 'rate' ? [0, 100] : [0, Math.max(1, effectiveTotalUnits)]}
              ticks={metricView === 'rate' ? [0, 25, 50, 75, 100] : undefined}
              allowDecimals={false}
              tickFormatter={v => (metricView === 'rate' ? `${v}%` : `${v}`)}
              tick={{ fill: '#78716c', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as PropertyOccupancyDataPoint;
                const vacant = Math.max(0, d.totalUnits - d.occupiedUnits);
                const revenue = d.estimatedRevenue || d.occupiedUnits * rentMonthly;
                const maxRevenue = d.totalUnits * rentMonthly;

                return (
                  <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-stone-200 shadow-xl text-xs space-y-2 z-50 min-w-[220px] pointer-events-none">
                    <div className="font-bold text-stone-900 border-b border-stone-100 pb-1.5 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {d.month}
                      </span>
                      {metricView === 'rate' ? (
                        <span className="text-emerald-700 font-mono font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {d.occupancyRate}% Rate
                        </span>
                      ) : (
                        <span className="text-teal-800 font-mono font-bold text-[11px] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          {d.occupiedUnits} / {d.totalUnits} Units
                        </span>
                      )}
                    </div>

                    {/* Dedicated Units Breakdown */}
                    <div className="p-2 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-600 font-medium flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${vacant > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          Vacant Units:
                        </span>
                        <span className="font-mono font-bold text-stone-900 tabular-nums">
                          {vacant} {vacant === 1 ? 'unit' : 'units'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>Occupied Units:</span>
                        <span className="font-mono font-medium text-stone-800">
                          {d.occupiedUnits} of {d.totalUnits} units ({d.occupancyRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Estimated Rent */}
                    <div className="flex items-center justify-between text-[11px] pt-0.5 text-stone-600">
                      <span className="text-stone-500">Estimated Rent:</span>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        ₹{revenue.toLocaleString('en-IN')}
                        <span className="text-[10px] text-stone-400 font-normal font-sans ml-1">
                          / ₹{maxRevenue.toLocaleString('en-IN')}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            {metricView === 'rate' ? (
              <ReferenceLine
                y={100}
                stroke="#cbd5e1"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: '100%', position: 'right', fill: '#94a3b8', fontSize: 9 }}
              />
            ) : (
              <ReferenceLine
                y={effectiveTotalUnits}
                stroke="#cbd5e1"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{ value: `Max: ${effectiveTotalUnits}`, position: 'right', fill: '#94a3b8', fontSize: 9 }}
              />
            )}
            <Line
              type="monotone"
              dataKey={metricView === 'rate' ? 'occupancyRate' : 'occupiedUnits'}
              name={metricView === 'rate' ? 'Occupancy Rate' : 'Occupied Units'}
              stroke={metricView === 'rate' ? '#059669' : '#0d9488'}
              strokeWidth={2.5}
              dot={{
                r: 3.5,
                fill: '#ffffff',
                stroke: metricView === 'rate' ? '#059669' : '#0d9488',
                strokeWidth: 2
              }}
              activeDot={{
                r: 5.5,
                fill: metricView === 'rate' ? '#059669' : '#0d9488',
                stroke: '#ffffff',
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Month-by-Month Mini Summary Strip */}
      <div className="grid grid-cols-6 gap-1 pt-1 border-t border-stone-200/70">
        {historyData.map((pt, idx) => {
          const isLatest = idx === historyData.length - 1;
          return (
            <div
              key={pt.month}
              className={`p-1.5 rounded-lg text-center transition-colors ${
                isLatest
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                  : 'bg-white/70 border border-stone-100 text-stone-600'
              }`}
            >
              <div className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold">{pt.shortMonth}</div>
              <div className="text-xs font-bold font-mono tabular-nums text-stone-900">
                {metricView === 'rate' ? `${pt.occupancyRate}%` : `${pt.occupiedUnits} u`}
              </div>
              <div className="text-[9px] text-stone-400 font-mono">
                {metricView === 'rate' ? `${pt.occupiedUnits}/${pt.totalUnits}` : `${pt.occupancyRate}%`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const OwnerApp: React.FC<OwnerAppProps> = ({ currentOwnerId: propOwnerId, onSwitchOwner }) => {
  const { user, token } = useAuth();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
    user && user.role === 'owner' ? user.id : propOwnerId || 'user_owner_201'
  );

  const currentOwnerId = user && user.role === 'owner' ? user.id : selectedOwnerId;

  // Navigation state
  const [activeSection, setActiveSection] = useState<OwnerSection>('dashboard');
  const [accountSubTab, setAccountSubTab] = useState<'dashboard' | 'kyc'>('dashboard');
  const [rentSubTab, setRentSubTab] = useState<'overview' | 'ledger'>('overview');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('');
  const [activeDatePreset, setActiveDatePreset] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'custom'>('all');
  const [ledgerSortField, setLedgerSortField] = useState<'date' | 'property' | 'amount'>('date');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRemittanceForDetail, setSelectedRemittanceForDetail] = useState<PaymentRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    backendService.syncWithDatabase().then(() => {
      setRefreshTrigger(prev => prev + 1);
    });
  }, [currentOwnerId]);

  // Reviews & Ratings State
  const [reviewsPropertyFilter, setReviewsPropertyFilter] = useState<string>('all');
  const [reviewsStarFilter, setReviewsStarFilter] = useState<number | 'all'>('all');
  const [respondingReviewId, setRespondingReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [flaggingReviewId, setFlaggingReviewId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState<string>('');
  const [recentlyUpdatedReviewId, setRecentlyUpdatedReviewId] = useState<{ id: string; action: 'responded' | 'flagged' } | null>(null);
  const [isSubmittingReviewAction, setIsSubmittingReviewAction] = useState<boolean>(false);

  // Filters & Search
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all');
  const [propertySearch, setPropertySearch] = useState<string>('');
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [dashboardOccupancyFilter, setDashboardOccupancyFilter] = useState<'all' | 'significant' | 'growth' | 'decline'>('all');

  // Application Review & Rejection Modals
  const [inspectingAppId, setInspectingAppId] = useState<string | null>(null);
  const [reviewPayload, setReviewPayload] = useState<any>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [selectedReasonCode, setSelectedReasonCode] = useState<RejectionReasonCode>('pets');
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Manage Property Modal state
  const [managingProperty, setManagingProperty] = useState<Listing | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [unitBulkActionMessage, setUnitBulkActionMessage] = useState<string | null>(null);
  const [showClearSelectionConfirm, setShowClearSelectionConfirm] = useState<boolean>(false);

  const handleRequestCloseManageModal = () => {
    if (selectedUnitIds.size > 0) {
      setShowClearSelectionConfirm(true);
    } else {
      setManagingProperty(null);
    }
  };

  // Notifications read set
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  // Create Listing Form state
  const [newListing, setNewListing] = useState({
    title: 'Hill View Residency, Sector B',
    bhk: '2 BHK' as const,
    propertyType: 'Apartment' as const,
    locality: 'Ganga Lake Road, Chandranagar',
    city: 'Itanagar' as const,
    fullAddressEncrypted: 'Flat 402, High View Apartments, Ganga Lake Road, Chandranagar, Itanagar, Arunachal Pradesh - 791113',
    maskedAddressPreview: 'Near Ganga Lake viewpoint corridor, Chandranagar, Itanagar',
    rentMonthly: 13500,
    securityDeposit: 30000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1150,
    parking: 1,
    totalUnits: 6,
    occupiedUnits: 4,
    unitNumber: 'Flat 402',
    suitableFor: 'Working professionals' as SuitableForType,
    amenities: 'Mountain Vista, Solar Water Heater, Dedicated Parking, 24x7 Water Supply',
    photos: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    requirements: {
      petsAllowed: true,
      maxOccupants: 3,
      vegOnly: false,
      smokingAllowed: false,
      minStayMonths: 11,
      preferredOccupation: 'Government / Bank / Corporate Executives',
    },
  });

  // Fetch trusted server-side operational metrics via memoized aggregation service
  const operationalData: OwnerOperationalMetrics = useMemo(() => {
    return ownerAggregationService.getAggregatedDashboardMetrics(
      currentOwnerId,
      undefined,
      refreshTrigger > 0
    );
  }, [currentOwnerId, refreshTrigger]);

  const ownerProfile = useMemo(() => {
    return (
      backendService.getOwnerProfiles().find(o => o.userId === currentOwnerId) || {
        id: 'op_temp',
        userId: currentOwnerId,
        fullName: 'Rameshwar Kulkarni',
        phoneMasked: '+91 98*** **334',
        phoneEncrypted: 'ENC',
        panMasked: 'ABCDE****K',
        panEncrypted: 'ENC',
        panVerified: true,
        aadhaarMasked: '**** **** 8912',
        aadhaarEncrypted: 'ENC',
        aadhaarVerified: true,
        razorpayAccountId: 'acc_route_kulkarni_987',
        bankAccountMasked: 'HDFC Bank ending in **4821',
        agreedAntiDiscriminationTermsAt: new Date().toISOString(),
        strikesCount: 0,
        isSuspended: false,
      }
    );
  }, [currentOwnerId]);

  const myListings = operationalData.properties;
  const myApplications = useMemo(() => {
    return backendService.getApplicationsForOwner(currentOwnerId);
  }, [currentOwnerId, refreshTrigger]);

  // Active tenants list
  const activeTenants = useMemo(() => {
    const acceptedApps = myApplications.filter(
      a => a.status === 'accepted' || a.status === 'active_tenancy'
    );
    return acceptedApps.map(app => {
      const listing = backendService.getListingById(app.listingId);
      const customer = backendService.getCustomerProfile(app.customerId);
      return {
        applicationId: app.id,
        tenantId: app.customerId,
        tenantName: customer?.name || `Tenant #${app.customerId.slice(-4)}`,
        propertyTitle: listing?.title || 'Residential Property',
        unitNumber: listing?.unitNumber || 'Unit 1',
        bhk: listing?.bhk || '2 BHK',
        monthlyRent: listing?.rentMonthly || 12000,
        leaseStart: app.createdAt,
        paymentStatus: 'Up to Date' as const,
      };
    });
  }, [myApplications]);

  // Historical rental remittances for owner ledger
  const historicalRemittances = useMemo(() => {
    const list = backendService.getOwnerRentRemittances(currentOwnerId);
    // Sort reverse-chronologically so newest remittances appear first in the ledger
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentOwnerId, refreshTrigger]);

  // Filter remittances by date range (billing periods)
  const dateFilteredRemittances = useMemo(() => {
    return historicalRemittances.filter((pay) => {
      const payDate = pay.createdAt ? pay.createdAt.slice(0, 10) : '';
      if (!payDate) return true;
      if (ledgerStartDate && payDate < ledgerStartDate) return false;
      if (ledgerEndDate && payDate > ledgerEndDate) return false;
      return true;
    });
  }, [historicalRemittances, ledgerStartDate, ledgerEndDate]);

  const filteredRemittances = useMemo(() => {
    const list = dateFilteredRemittances.filter((pay) => {
      const q = ledgerSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (pay.propertyName || '').toLowerCase().includes(q) ||
        (pay.id || '').toLowerCase().includes(q) ||
        (pay.razorpayPaymentId || '').toLowerCase().includes(q) ||
        (pay.description || '').toLowerCase().includes(q);

      const matchesStatus =
        ledgerStatusFilter === 'all' ||
        pay.status.toLowerCase() === ledgerStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });

    return [...list].sort((a, b) => {
      if (ledgerSortField === 'date') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return ledgerSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (ledgerSortField === 'property') {
        const propA = (a.propertyName || '').toLowerCase();
        const propB = (b.propertyName || '').toLowerCase();
        const comp = propA.localeCompare(propB);
        return ledgerSortOrder === 'asc' ? comp : -comp;
      }
      if (ledgerSortField === 'amount') {
        const amtA = a.amount || 0;
        const amtB = b.amount || 0;
        return ledgerSortOrder === 'asc' ? amtA - amtB : amtB - amtA;
      }
      return 0;
    });
  }, [dateFilteredRemittances, ledgerSearch, ledgerStatusFilter, ledgerSortField, ledgerSortOrder]);

  const totalRemittedCapital = useMemo(() => {
    return dateFilteredRemittances.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [dateFilteredRemittances]);

  // Monthly rental payout trend data for Recharts visualization in the Ledger tab
  const monthlyPayoutTrendData = useMemo(() => {
    let monthKeys: string[] = [];

    if (ledgerStartDate || ledgerEndDate) {
      let startKey = ledgerStartDate ? ledgerStartDate.slice(0, 7) : '2026-05';
      let endKey = ledgerEndDate ? ledgerEndDate.slice(0, 7) : '2026-10';

      if (startKey > endKey) {
        const tmp = startKey;
        startKey = endKey;
        endKey = tmp;
      }

      const [sYear, sMonth] = startKey.split('-').map(Number);
      const [eYear, eMonth] = endKey.split('-').map(Number);
      let curY = sYear;
      let curM = sMonth;

      while (curY < eYear || (curY === eYear && curM <= eMonth)) {
        monthKeys.push(`${curY}-${String(curM).padStart(2, '0')}`);
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
        if (monthKeys.length > 36) break;
      }
    } else {
      monthKeys = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    }

    const monthMap = new Map<string, { month: string; shortMonth: string; payout: number; count: number }>();

    monthKeys.forEach((key) => {
      const parts = key.split('-').map(Number);
      const date = new Date(Date.UTC(parts[0], parts[1] - 1, 15));
      const monthName = !isNaN(date.getTime())
        ? date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })
        : key;
      const shortName = !isNaN(date.getTime())
        ? date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })
        : key;

      monthMap.set(key, { month: monthName, shortMonth: shortName, payout: 0, count: 0 });
    });

    dateFilteredRemittances.forEach((remit) => {
      const isSuccess =
        remit.status.toLowerCase() === 'successful' ||
        remit.status.toLowerCase() === 'settled' ||
        remit.status.toLowerCase() === 'captured' ||
        remit.status.toLowerCase() === 'success';

      if (!isSuccess) return;

      const key = remit.createdAt.substring(0, 7); // 'YYYY-MM'
      const date = new Date(remit.createdAt);
      const monthName = !isNaN(date.getTime())
        ? date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        : key;
      const shortName = !isNaN(date.getTime())
        ? date.toLocaleDateString('en-IN', { month: 'short' })
        : key;

      if (!monthMap.has(key)) {
        monthMap.set(key, { month: monthName, shortMonth: shortName, payout: 0, count: 0 });
      }
      const cur = monthMap.get(key)!;
      cur.payout += remit.amount || 0;
      cur.count += 1;
    });

    const sortedKeys = Array.from(monthMap.keys()).sort();
    return sortedKeys.map((key) => {
      const item = monthMap.get(key)!;
      return {
        monthKey: key,
        month: item.month,
        shortMonth: item.shortMonth,
        payout: item.payout,
        remittanceCount: item.count,
        avgPayout: item.count > 0 ? Math.round(item.payout / item.count) : 0,
      };
    });
  }, [dateFilteredRemittances, ledgerStartDate, ledgerEndDate]);

  const payoutTrendStats = useMemo(() => {
    const activeMonths = monthlyPayoutTrendData.filter((d) => d.payout > 0);
    const totalDisbursed = monthlyPayoutTrendData.reduce((acc, d) => acc + d.payout, 0);
    const avgMonthly = activeMonths.length > 0 ? Math.round(totalDisbursed / activeMonths.length) : 0;
    const peakPoint = monthlyPayoutTrendData.reduce(
      (max, d) => (d.payout > max.payout ? d : max),
      monthlyPayoutTrendData[0] || { month: 'Oct 2026', shortMonth: 'Oct', payout: 0, remittanceCount: 0 }
    );
    const latestMonth = monthlyPayoutTrendData[monthlyPayoutTrendData.length - 1];
    const prevMonth = monthlyPayoutTrendData.length > 1 ? monthlyPayoutTrendData[monthlyPayoutTrendData.length - 2] : null;
    const momDiff = latestMonth && prevMonth ? latestMonth.payout - prevMonth.payout : 0;
    const momPct = prevMonth && prevMonth.payout > 0 ? Math.round((momDiff / prevMonth.payout) * 100) : 0;

    return {
      totalDisbursed,
      avgMonthly,
      peakPoint: peakPoint || { month: 'None', shortMonth: '-', payout: 0, remittanceCount: 0 },
      latestMonth,
      momDiff,
      momPct,
    };
  }, [monthlyPayoutTrendData]);

  // Notifications
  const ownerNotifications: AppNotification[] = useMemo(() => {
    const raw = backendService.getNotifications(currentOwnerId);
    if (raw.length > 0) return raw;
    // Contextual notifications for owner
    return [
      {
        id: 'notif_1',
        userId: currentOwnerId,
        title: 'New Rental Application',
        message: 'Applicant submitted screening dossier for Pine View Villa. Verification required.',
        type: 'application' as const,
        isRead: readNotificationIds.has('notif_1'),
        createdAt: '2026-10-07T14:30:00Z',
      },
      {
        id: 'notif_2',
        userId: currentOwnerId,
        title: 'October Rent Remittance Received',
        message: '₹14,000 rent payment settled directly to your HDFC escrow account for Modern Hilltop Apartment.',
        type: 'payment' as const,
        isRead: readNotificationIds.has('notif_2'),
        createdAt: '2026-10-03T11:45:00Z',
      },
      {
        id: 'notif_3',
        userId: currentOwnerId,
        title: 'KYC & Settlement Routing Active',
        message: 'Owner payout account verified. Direct rent settlements enabled (No brokerage charged to owners).',
        type: 'agreement' as const,
        isRead: true,
        createdAt: '2026-09-15T09:00:00Z',
      },
    ];
  }, [currentOwnerId, readNotificationIds]);

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'unread') {
      return ownerNotifications.filter((n: AppNotification) => !n.isRead && !readNotificationIds.has(n.id));
    }
    return ownerNotifications;
  }, [ownerNotifications, notificationFilter, readNotificationIds]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return myApplications.filter(app => {
      if (appStatusFilter === 'all') return true;
      if (appStatusFilter === 'new') return app.status === 'pending';
      if (appStatusFilter === 'under_review') return app.status === 'under_review';
      if (appStatusFilter === 'accepted') return app.status === 'accepted' || app.status === 'active_tenancy';
      if (appStatusFilter === 'rejected') return app.status === 'rejected';
      return app.status === appStatusFilter;
    });
  }, [myApplications, appStatusFilter]);

  // Filtered listings
  const filteredListings = useMemo(() => {
    return myListings.filter(item => {
      const q = propertySearch.toLowerCase().trim();
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.locality.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.bhk.toLowerCase().includes(q)
      );
    });
  }, [myListings, propertySearch]);

  // Reviews & Ratings Data for Owner
  const ownerReviewsSummary: OwnerReviewSummary = useMemo(() => {
    return backendService.getOwnerReviewSummary(currentOwnerId);
  }, [currentOwnerId, refreshTrigger]);

  const ownerReviews: PropertyReview[] = useMemo(() => {
    return backendService.getReviews({ ownerId: currentOwnerId });
  }, [currentOwnerId, refreshTrigger]);

  const filteredOwnerReviews = useMemo(() => {
    return ownerReviews.filter(r => {
      const propId = r.propertyId || r.listingId;
      if (reviewsPropertyFilter !== 'all' && propId !== reviewsPropertyFilter) return false;
      if (reviewsStarFilter !== 'all' && Math.round(r.overallRating) !== reviewsStarFilter) return false;
      return true;
    });
  }, [ownerReviews, reviewsPropertyFilter, reviewsStarFilter]);

  // Occupancy Rate Changes & MoM Delta Tracking
  const propertiesWithOccupancyDeltas = useMemo(() => {
    return operationalData.properties.map(p => {
      const delta = computePropertyOccupancyDelta(p);
      const total = p.totalUnits || 1;
      const occ =
        p.occupiedUnits !== undefined
          ? p.occupiedUnits
          : p.status === 'rented'
          ? total
          : total - 1;
      const rate = Math.round((occ / total) * 100);
      return { property: p, delta, total, occ, rate };
    });
  }, [operationalData.properties]);

  const occupancyShiftSummary = useMemo(() => {
    const significantGrowth = propertiesWithOccupancyDeltas.filter(
      item => item.delta.trend === 'growth' && item.delta.isSignificant
    );
    const significantDecline = propertiesWithOccupancyDeltas.filter(
      item => item.delta.trend === 'decline' && item.delta.isSignificant
    );
    const allGrowth = propertiesWithOccupancyDeltas.filter(item => item.delta.trend === 'growth');
    const allDecline = propertiesWithOccupancyDeltas.filter(item => item.delta.trend === 'decline');

    return {
      significantCount: significantGrowth.length + significantDecline.length,
      growthCount: allGrowth.length,
      declineCount: allDecline.length,
      significantGrowth,
      significantDecline,
      topGrowth: [...significantGrowth].sort((a, b) => b.delta.deltaRate - a.delta.deltaRate)[0] || allGrowth[0] || null,
      topDecline: [...significantDecline].sort((a, b) => a.delta.deltaRate - b.delta.deltaRate)[0] || allDecline[0] || null,
    };
  }, [propertiesWithOccupancyDeltas]);

  const filteredOccupancyProperties = useMemo(() => {
    if (dashboardOccupancyFilter === 'significant') {
      return propertiesWithOccupancyDeltas.filter(item => item.delta.isSignificant);
    }
    if (dashboardOccupancyFilter === 'growth') {
      return propertiesWithOccupancyDeltas.filter(item => item.delta.trend === 'growth');
    }
    if (dashboardOccupancyFilter === 'decline') {
      return propertiesWithOccupancyDeltas.filter(item => item.delta.trend === 'decline');
    }
    return propertiesWithOccupancyDeltas;
  }, [propertiesWithOccupancyDeltas, dashboardOccupancyFilter]);

  const handleSendOwnerResponse = (reviewId: string) => {
    if (!responseText.trim() || isSubmittingReviewAction) return;
    setIsSubmittingReviewAction(true);
    try {
      backendService.respondToReview(reviewId, responseText.trim(), token || backendService.getAuthToken() || undefined);
      setRespondingReviewId(null);
      setResponseText('');
      setRecentlyUpdatedReviewId({ id: reviewId, action: 'responded' });
      setRefreshTrigger(p => p + 1);
      setActionToast({ type: 'success', message: 'Your landlord response has been published.' });
      setTimeout(() => {
        setRecentlyUpdatedReviewId(curr => (curr?.id === reviewId ? null : curr));
      }, 5000);
    } catch (err: any) {
      setActionToast({ type: 'error', message: err.message || 'Failed to submit response.' });
    } finally {
      setIsSubmittingReviewAction(false);
    }
  };

  const handleFlagReview = (reviewId: string) => {
    if (!flagReason.trim() || isSubmittingReviewAction) return;
    setIsSubmittingReviewAction(true);
    try {
      backendService.flagReview(reviewId, flagReason.trim(), token || backendService.getAuthToken() || undefined);
      setFlaggingReviewId(null);
      setFlagReason('');
      setRecentlyUpdatedReviewId({ id: reviewId, action: 'flagged' });
      setRefreshTrigger(p => p + 1);
      setActionToast({ type: 'info', message: 'Review reported to admin moderation team.' });
      setTimeout(() => {
        setRecentlyUpdatedReviewId(curr => (curr?.id === reviewId ? null : curr));
      }, 5000);
    } catch (err: any) {
      setActionToast({ type: 'error', message: err.message || 'Failed to report review.' });
    } finally {
      setIsSubmittingReviewAction(false);
    }
  };

  // Actions
  const handleOpenReview = (appId: string) => {
    try {
      const data = backendService.getOwnerViewOfApplication(appId, currentOwnerId);
      setReviewPayload(data);
      setInspectingAppId(appId);
    } catch (err: any) {
      alert(`Authorization Notice: ${err.message}`);
    }
  };

  const handleAccept = (appId: string) => {
    if (
      confirm(
        'Accept this applicant? Upon acceptance, tenant is notified to deposit the refundable security deposit and 10% customer brokerage. (No brokerage charged to owners).'
      )
    ) {
      try {
        backendService.acceptApplication(appId, currentOwnerId);
        setRefreshTrigger(prev => prev + 1);
        setInspectingAppId(null);
        alert('Application accepted! Tenant dossier updated.');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingAppId) return;

    try {
      backendService.rejectApplication(
        inspectingAppId,
        currentOwnerId,
        selectedReasonCode,
        rejectionNotes
      );

      // Trigger server-authoritative status update and automated Email/SMS dispatch
      try {
        const response = await apiClient.patch(`/applications/${inspectingAppId}/status`, {
          status: 'rejected',
          reasonCode: selectedReasonCode,
          rejectionExplanation: rejectionNotes,
        });

        if (response.data?.notification) {
          backendService.updateApplicationNotificationStatus(inspectingAppId, {
            inAppStatus: response.data.notification.inAppStatus,
            emailStatus: response.data.notification.emailStatus,
            smsStatus: response.data.notification.smsStatus,
            overallStatus: response.data.notification.status,
            emailDelivered: response.data.notification.emailDelivered,
            smsDelivered: response.data.notification.smsDelivered,
            dispatchedAt: response.data.notification.dispatchedAt,
          });
        }
      } catch (apiErr) {
        console.warn('Backend API status sync notice:', apiErr);
      }

      setRefreshTrigger(prev => prev + 1);
      setIsRejectModalOpen(false);
      setInspectingAppId(null);
      setRejectionNotes('');
      setActionToast({
        type: 'info',
        message: 'Application declined on objective grounds. In-app notice recorded. (Email & SMS alerts are not yet configured in development stage).'
      });
    } catch (err: any) {
      setActionToast({
        type: 'error',
        message: err.message || 'Failed to decline application.'
      });
    }
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      backendService.createListing(currentOwnerId, {
        title: newListing.title,
        bhk: newListing.bhk,
        propertyType: newListing.propertyType,
        category: 'APARTMENT' as const,
        locality: newListing.locality,
        city: newListing.city,
        approximateLat: 27.0844,
        approximateLng: 93.6053,
        approximateRadiusMeters: 600,
        fullAddressEncrypted: newListing.fullAddressEncrypted,
        maskedAddressPreview: newListing.maskedAddressPreview || `Near central avenue, ${newListing.locality}`,
        rentMonthly: Number(newListing.rentMonthly),
        securityDeposit: Number(newListing.securityDeposit),
        bedrooms: Number(newListing.bedrooms),
        bathrooms: Number(newListing.bathrooms),
        sqft: Number(newListing.sqft),
        parking: Number(newListing.parking),
        totalUnits: Number(newListing.totalUnits) || 1,
        occupiedUnits: Number(newListing.occupiedUnits) || 0,
        unitNumber: newListing.unitNumber,
        isFeatured: true,
        amenities: newListing.amenities.split(',').map(s => s.trim()).filter(Boolean),
        photos: [newListing.photos],
        suitableFor: newListing.suitableFor,
        requirements: newListing.requirements,
        status: 'active',
      });
      setRefreshTrigger(prev => prev + 1);
      setActiveSection('properties');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const ownerFirstName = ownerProfile.fullName?.split(' ')[0] || 'Landlord';

  return (
    <div className="flex flex-col lg:flex-row min-h-[860px] bg-stone-100 rounded-3xl overflow-hidden border border-stone-200 shadow-sm text-stone-900 font-sans">
      {/* ========================================================================= */}
      {/* 1. OPERATIONS CENTER SIDEBAR NAVIGATION (Section 16)                      */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-64 bg-stone-900 text-stone-300 flex flex-col shrink-0 border-r border-stone-800">
        {/* Brand & Owner Profile Bar */}
        <div className="p-5 border-b border-stone-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-inner shrink-0">
              {ownerProfile.fullName?.charAt(0) || 'O'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white truncate">{ownerProfile.fullName}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Verified Landlord</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Owner Switcher for Testing Portfolios & Empty States */}
          <div className="mt-3 pt-3 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span>Portfolio Account:</span>
            <select
              value={selectedOwnerId}
              onChange={e => {
                setSelectedOwnerId(e.target.value);
                if (onSwitchOwner) onSwitchOwner(e.target.value);
                setRefreshTrigger(prev => prev + 1);
              }}
              className="bg-stone-800 text-stone-200 text-[10px] rounded px-2 py-1 border border-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="user_owner_201">R. Kulkarni (3 Props)</option>
              <option value="user_owner_202">M. Devi (1 Prop)</option>
              <option value="user_owner_new">New Owner (0 Props)</option>
            </select>
          </div>

          {ownerProfile.strikesCount > 0 && (
            <div className="mt-2.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{ownerProfile.strikesCount} warning strike(s)</span>
            </div>
          )}
        </div>

        {/* Primary Navigation Links */}
        <nav aria-label="Owner workspace" className="p-3 space-y-1 flex-1 overflow-y-auto max-lg:flex max-lg:flex-row max-lg:gap-1 max-lg:space-y-0 max-lg:overflow-x-auto max-lg:overflow-y-hidden">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'dashboard'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Home className="w-4 h-4 text-emerald-400" />
              <span>Dashboard</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono">Overview</span>
          </button>

          <button
            onClick={() => setActiveSection('properties')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'properties'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Properties</span>
            </div>
            <span className="text-[11px] font-mono text-stone-300 bg-stone-800 px-2 py-0.5 rounded-md">
              {operationalData.kpis.propertiesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('applications')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'applications'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Applications</span>
            </div>
            {operationalData.applicationsSummary.new > 0 ? (
              <span className="text-[10px] font-bold text-amber-950 bg-amber-400 px-1.5 py-0.5 rounded-md">
                {operationalData.applicationsSummary.new} new
              </span>
            ) : (
              <span className="text-[11px] font-mono text-stone-400">
                {operationalData.kpis.applicationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('tenants')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'tenants'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Tenants</span>
            </div>
            <span className="text-[11px] font-mono text-stone-400">
              {activeTenants.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('rent_collection')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'rent_collection'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Rent &amp; Payments</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              {operationalData.financials.collectionRate}%
            </span>
          </button>

          <button
            onClick={() => setActiveSection('reviews')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'reviews'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Reviews &amp; Ratings</span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded-md">
              {ownerReviewsSummary.totalReviews > 0 ? `${ownerReviewsSummary.averageOwnerRating.toFixed(1)} ★` : 'New'}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('analytics')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'analytics'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Analytics</span>
            </div>
            <span className="text-[10px] text-stone-500 font-mono">Yield</span>
          </button>

          <button
            onClick={() => setActiveSection('notifications')}
            className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
              activeSection === 'notifications'
                ? 'bg-stone-800 text-white font-semibold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-300" />
              <span>Notifications</span>
            </div>
            {filteredNotifications.filter((n: AppNotification) => !n.isRead).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <div className="pt-3 mt-3 border-t border-stone-800/80 space-y-1">
            <button
              onClick={() => setActiveSection('account_kyc')}
              className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                activeSection === 'account_kyc'
                  ? 'bg-stone-800 text-white font-semibold'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Profile &amp; KYC</span>
              </div>
              <span className="text-[10px] text-emerald-400">Verified</span>
            </button>

            <button
              onClick={() => setActiveSection('settings')}
              className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                activeSection === 'settings'
                  ? 'bg-stone-800 text-white font-semibold'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-stone-400" />
                <span>Settings</span>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('help_support')}
              className={`w-full max-lg:w-auto max-lg:flex-none flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                activeSection === 'help_support'
                  ? 'bg-stone-800 text-white font-semibold'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-sky-400" />
                <span>Help &amp; Support</span>
              </div>
              <span className="text-[10px] text-stone-500">Legal</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-stone-800 text-[11px] text-stone-400 bg-stone-950/40 space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span>Owner Brokerage</span>
            <span className="text-emerald-400 font-mono font-medium">None</span>
          </div>
          <div className="text-[10px] text-stone-400">
            Direct Bank Settlement • 0% Owner Brokerage
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN OPERATIONS CENTER VIEWPORT                                        */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 bg-stone-100/60 overflow-y-auto">
        {/* ======================================================================= */}
        {/* OWNER DASHBOARD HEADER (Section 3)                                      */}
        {/* ======================================================================= */}
        <header className="bg-white border-b border-stone-200/90 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Owner Operations Center
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              {greeting}, {ownerFirstName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Here's what's happening with your properties.
            </p>
          </div>

          {/* Header Action Buttons (Clean & purposeful) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSection('create_listing')}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Property</span>
            </button>

            <button
              onClick={() => setActiveSection('applications')}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-stone-500" />
              <span>View Applications</span>
            </button>

            <button
              onClick={() => setActiveSection('properties')}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <span>View Properties</span>
            </button>
          </div>
        </header>

        {/* Viewport Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* ===================================================================== */}
          {/* A. DASHBOARD VIEW (Operations Center Master View)                    */}
          {/* ===================================================================== */}
          {activeSection === 'dashboard' && (
            <>
              {/* PRIMARY KPI CARDS (Section 4) */}
              <section aria-labelledby="kpi-heading">
                <h2 id="kpi-heading" className="sr-only">Key Performance Indicators</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Properties */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-2 hover:border-stone-300 transition-colors">
                    <div className="flex items-center justify-between text-stone-500 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Properties</span>
                      <Building2 className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="text-3xl font-bold text-stone-900 font-mono tabular-nums">
                      {operationalData.kpis.propertiesCount}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Active residential properties
                    </div>
                  </div>

                  {/* Card 2: Units */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-2 hover:border-stone-300 transition-colors">
                    <div className="flex items-center justify-between text-stone-500 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Units</span>
                      <Layers className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-3xl font-bold text-stone-900 font-mono tabular-nums">
                      {operationalData.kpis.totalUnits}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Total rental capacity across portfolio
                    </div>
                  </div>

                  {/* Card 3: Occupied */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-2 hover:border-stone-300 transition-colors">
                    <div className="flex items-center justify-between text-stone-500 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Occupied</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-bold text-emerald-700 font-mono tabular-nums">
                      {operationalData.kpis.occupiedUnits}
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-1">
                      <span className="font-semibold text-stone-700 font-mono tabular-nums">
                        {operationalData.kpis.vacantUnits}
                      </span>
                      <span>units available</span>
                    </div>
                  </div>

                  {/* Card 4: Applications */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-2 hover:border-stone-300 transition-colors">
                    <div className="flex items-center justify-between text-stone-500 text-xs">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Applications</span>
                      <Users className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-3xl font-bold text-stone-900 font-mono tabular-nums">
                      {operationalData.kpis.applicationsCount}
                    </div>
                    <div className="text-[11px] text-amber-800 font-medium">
                      {operationalData.applicationsSummary.new} new awaiting review
                    </div>
                  </div>
                </div>
              </section>

              {/* ACTION REQUIRED (Section 8 - Prominent Operational Decisions) */}
              <section className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Action Required</h3>
                    <p className="text-xs text-stone-500">
                      Operations requiring your immediate decision or property attention
                    </p>
                  </div>
                  {operationalData.actionRequired.length === 0 ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      All caught up
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full font-mono">
                      {operationalData.actionRequired.length} pending
                    </span>
                  )}
                </div>

                {operationalData.actionRequired.length === 0 ? (
                  <div className="text-center py-8 text-stone-500 text-xs border border-dashed border-stone-200 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-stone-800">You're all caught up.</p>
                    <p className="text-stone-400 mt-0.5">
                      No applications, rent collections, or vacancy escalations currently require attention.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {operationalData.actionRequired.map(act => (
                      <div
                        key={act.id}
                        className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/70 hover:bg-stone-50 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                act.urgency === 'high' ? 'bg-amber-500' : 'bg-sky-500'
                              }`}
                            />
                            <h4 className="text-xs font-bold text-stone-900 truncate">{act.title}</h4>
                          </div>
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            {act.description}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (act.actionTarget === 'applications') setActiveSection('applications');
                            else if (act.actionTarget === 'listings' || act.actionTarget === 'properties') setActiveSection('properties');
                            else if (act.actionTarget === 'rent_payments') setActiveSection('rent_collection');
                          }}
                          className="shrink-0 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                        >
                          {act.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* TWO COLUMN GRID: OCCUPANCY OVERVIEW & RENTAL INCOME (Sections 5, 6 & 7) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 5. OCCUPANCY OVERVIEW */}
                <section className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-stone-900">Occupancy</h3>
                      <p className="text-xs text-stone-500">
                        {operationalData.occupancy.occupiedUnits} occupied · {operationalData.occupancy.vacantUnits} available
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                        {operationalData.occupancy.percentage}%
                      </span>
                      <div className="text-[11px] text-stone-400">Portfolio Rate</div>
                    </div>
                  </div>

                  {/* Clean Visual Representation: Donut Chart + Occupancy Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                    <OccupancyDonutChart
                      percentage={operationalData.occupancy.percentage}
                      occupied={operationalData.occupancy.occupiedUnits}
                      vacant={operationalData.occupancy.vacantUnits}
                      total={operationalData.occupancy.totalUnits}
                    />

                    <div className="space-y-3 text-xs w-full sm:w-48">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                            Occupied Units
                          </span>
                          <span className="font-bold font-mono text-stone-900">
                            {operationalData.occupancy.occupiedUnits}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-2.5 h-2.5 rounded-xs bg-stone-300 inline-block" />
                            Available / Vacant
                          </span>
                          <span className="font-bold font-mono text-stone-900">
                            {operationalData.occupancy.vacantUnits}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-stone-200/70 flex items-center justify-between text-stone-900 font-semibold">
                          <span>Total Units</span>
                          <span className="font-mono">{operationalData.occupancy.totalUnits}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Property-by-Property Breakdown with MoM Occupancy Rate Indicators */}
                  <div className="pt-3 border-t border-stone-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                          <span>Breakdown &amp; MoM Shift Indicators</span>
                          {occupancyShiftSummary.significantCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                              {occupancyShiftSummary.significantCount} MoM Shift{occupancyShiftSummary.significantCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400">
                          Color-coded indicators highlight growth (green) vs decline (red) compared to previous month
                        </p>
                      </div>

                      {/* Interactive Filter Pills */}
                      <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-[10px] self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setDashboardOccupancyFilter('all')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            dashboardOccupancyFilter === 'all'
                              ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          All ({operationalData.properties.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDashboardOccupancyFilter('significant')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                            dashboardOccupancyFilter === 'significant'
                              ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <span>Significant ({occupancyShiftSummary.significantCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDashboardOccupancyFilter('growth')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                            dashboardOccupancyFilter === 'growth'
                              ? 'bg-white text-emerald-800 font-semibold shadow-2xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <ArrowUp className="w-2.5 h-2.5 text-emerald-600 stroke-[2.5]" />
                          <span>Growth ({occupancyShiftSummary.growthCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDashboardOccupancyFilter('decline')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                            dashboardOccupancyFilter === 'decline'
                              ? 'bg-white text-rose-800 font-semibold shadow-2xs'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <ArrowDown className="w-2.5 h-2.5 text-rose-600 stroke-[2.5]" />
                          <span>Decline ({occupancyShiftSummary.declineCount})</span>
                        </button>
                      </div>
                    </div>

                    {/* Prominent Significant Shifts Spotlight Banner */}
                    {occupancyShiftSummary.significantCount > 0 && dashboardOccupancyFilter === 'all' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 pb-1">
                        {occupancyShiftSummary.topGrowth && (
                          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                  Occupancy Growth Surge
                                </div>
                                <div className="text-xs font-semibold text-stone-900 truncate">
                                  {occupancyShiftSummary.topGrowth.property.title}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                                <ArrowUp className="w-3 h-3 stroke-[3]" />
                                +{occupancyShiftSummary.topGrowth.delta.deltaRate}%
                              </span>
                              <div className="text-[10px] text-emerald-800 font-mono mt-0.5">
                                {occupancyShiftSummary.topGrowth.delta.previousRate}% → {occupancyShiftSummary.topGrowth.delta.currentRate}%
                              </div>
                            </div>
                          </div>
                        )}

                        {occupancyShiftSummary.topDecline && (
                          <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                                <TrendingDown className="w-4 h-4 text-rose-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                                  Occupancy Decline Alert
                                </div>
                                <div className="text-xs font-semibold text-stone-900 truncate">
                                  {occupancyShiftSummary.topDecline.property.title}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-2xs">
                                <ArrowDown className="w-3 h-3 stroke-[3]" />
                                {occupancyShiftSummary.topDecline.delta.deltaRate}%
                              </span>
                              <div className="text-[10px] text-rose-800 font-mono mt-0.5">
                                {occupancyShiftSummary.topDecline.delta.previousRate}% → {occupancyShiftSummary.topDecline.delta.currentRate}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Filtered Property List */}
                    {filteredOccupancyProperties.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-3 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                        No properties match &apos;{dashboardOccupancyFilter}&apos; filter.
                      </p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {filteredOccupancyProperties.map(({ property: p, delta, total, occ, rate }) => (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                              delta.isSignificant
                                ? delta.trend === 'growth'
                                  ? 'bg-emerald-50/30 border-emerald-200/80 hover:bg-emerald-50/50'
                                  : 'bg-rose-50/30 border-rose-200/80 hover:bg-rose-50/50'
                                : 'bg-stone-50/40 border-stone-100 hover:bg-stone-50'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-stone-900 truncate">{p.title}</span>
                                {delta.isSignificant && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                      delta.trend === 'growth'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {delta.trend === 'growth' ? 'Significant Surge' : 'Vacancy Alert'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                                <span>{p.locality}, {p.city}</span>
                                <span>•</span>
                                <span className="font-mono text-stone-700 font-medium">
                                  {occ}/{total} units ({rate}%)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <PropertyOccupancyChangeIndicator property={p} showComparisonLabel={true} size="sm" />
                              <button
                                type="button"
                                onClick={() => setManagingProperty(p)}
                                className="text-[10px] text-stone-600 hover:text-stone-900 px-2 py-1 rounded-md border border-stone-200 hover:border-stone-300 bg-white cursor-pointer shadow-2xs font-medium"
                                title="Inspect unit allocation and 6-month progression"
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* 6 & 7. RENTAL INCOME & STRICT OWNER FINANCIAL SEPARATION */}
                <section className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-stone-900">Rental Income</h3>
                      <p className="text-xs text-stone-500">
                        October 2026 remittance ledger (Strictly owner rent)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-500 block">Collection Rate</span>
                      <span className="text-xl font-bold text-emerald-700 font-mono tabular-nums">
                        {operationalData.financials.collectionRate}%
                      </span>
                    </div>
                  </div>

                  {/* Monthly Rent KPI Cards */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                      <span className="text-[11px] text-stone-500 block">This Month</span>
                      <span className="text-base sm:text-lg font-bold text-stone-900 font-mono tabular-nums">
                        ₹{operationalData.financials.thisMonthDue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/70">
                      <span className="text-[11px] text-emerald-800 block font-medium">Collected</span>
                      <span className="text-base sm:text-lg font-bold text-emerald-800 font-mono tabular-nums">
                        ₹{operationalData.financials.thisMonthCollected.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/70">
                      <span className="text-[11px] text-amber-800 block font-medium">Pending</span>
                      <span className="text-base sm:text-lg font-bold text-amber-800 font-mono tabular-nums">
                        ₹{operationalData.financials.thisMonthPending.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Historical Income Chart */}
                  <RentalIncomeBarChart data={operationalData.financials.historicalMonthly} />

                  {/* Section 7: Strict Financial Separation Statement */}
                  <div className="bg-stone-50/90 p-4 rounded-xl border border-stone-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-semibold text-stone-900">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        Owner Settlement Statement
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-mono font-medium">
                        Owner Brokerage: None
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-stone-600">
                      <div className="flex items-center justify-between">
                        <span>Gross Contracted Rent</span>
                        <span className="font-mono font-medium text-stone-900">
                          ₹{operationalData.financials.thisMonthDue.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-stone-500">
                        <span>Owner Brokerage</span>
                        <span className="font-mono text-emerald-700 font-medium">None</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-500">
                        <span>Owner Charges</span>
                        <span className="font-mono text-stone-700">₹{operationalData.financials.ownerCharges.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-500">
                        <span>Taxes / Withholding</span>
                        <span className="font-mono text-stone-700">₹{operationalData.financials.taxesWithholding.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-stone-200 text-stone-900 font-bold text-xs">
                        <span>Net Owner Settlement</span>
                        <span className="font-mono text-emerald-700">
                          ₹{operationalData.financials.netOwnerSettlement.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-stone-500">
                      <span>Settlement Status:</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {operationalData.financials.settlementStatus}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 italic pt-1">
                      No brokerage charged to owners. Customer brokerage (10% of one month&apos;s rent) and ₹20 application fees are NivasPay platform revenue and never deducted from owner rental income.
                    </p>
                  </div>
                </section>
              </div>

              {/* PROMINENT 6-MONTH REVENUE & OCCUPANCY PERFORMANCE GRAPH */}
              <RentalIncomeTrendsLineChart
                data={operationalData.financials.historicalMonthly}
                propertiesCount={operationalData.kpis.propertiesCount}
                occupiedUnitsCount={operationalData.occupancy.occupiedUnits}
                totalUnitsCount={operationalData.occupancy.totalUnits}
              />

              {/* APPLICATIONS SUMMARY & RECENT LIST (Sections 9 & 10) */}
              <section className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Applications</h3>
                    <p className="text-xs text-stone-500">
                      Screening submissions &amp; DPDP compliance dossiers
                    </p>
                  </div>

                  {/* Summary counts pill strip (Section 9) */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-medium border border-amber-200">
                      New: <strong className="font-mono">{operationalData.applicationsSummary.new}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-900 font-medium border border-sky-200">
                      Under Review: <strong className="font-mono">{operationalData.applicationsSummary.underReview}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-medium border border-emerald-200">
                      Accepted: <strong className="font-mono">{operationalData.applicationsSummary.accepted}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 font-medium border border-rose-200">
                      Rejected: <strong className="font-mono">{operationalData.applicationsSummary.rejected}</strong>
                    </span>
                    {operationalData.applicationsSummary.withdrawn > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-medium border border-stone-200">
                        Withdrawn: <strong className="font-mono">{operationalData.applicationsSummary.withdrawn}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Recent Applications Table (Section 10) */}
                {myApplications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200 space-y-1">
                    <Users className="w-8 h-8 text-stone-400 mx-auto mb-1" />
                    <p className="font-medium text-stone-700">No new applications require your attention.</p>
                    <p className="text-stone-400">Applications will appear here once submitted by prospective tenants.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Applicant</th>
                          <th className="py-2.5 px-3">Property</th>
                          <th className="py-2.5 px-3">Applied</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {myApplications.slice(0, 5).map(app => {
                          const listing = backendService.getListingById(app.listingId);
                          const customer = backendService.getCustomerProfile(app.customerId);
                          const isAccepted = app.status === 'accepted' || app.status === 'active_tenancy';
                          const isRejected = app.status === 'rejected';
                          const isNew = app.status === 'pending';

                          return (
                            <tr key={app.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3 px-3 font-medium text-stone-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center font-bold text-xs shrink-0">
                                    {customer?.name?.charAt(0) || 'A'}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-stone-900">
                                      {customer?.name || `Applicant #${app.customerId.slice(-4)}`}
                                    </div>
                                    <div className="text-[10px] text-stone-400 font-mono">
                                      {customer?.occupation || 'Private Professional'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-stone-700 font-medium">
                                <div className="truncate max-w-[200px]">{listing?.title || 'Property'}</div>
                                <div className="text-[10px] text-stone-400">{listing?.locality}</div>
                              </td>
                              <td className="py-3 px-3 text-stone-500">
                                <span title={formatAbsoluteDate(app.createdAt)}>
                                  {formatRelativeTime(app.createdAt, 'Applied')}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    isAccepted
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isRejected
                                      ? 'bg-rose-100 text-rose-800'
                                      : isNew
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-sky-100 text-sky-900'
                                  }`}
                                >
                                  {isNew ? 'NEW' : app.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handleOpenReview(app.id)}
                                  className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Review</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* VACANCY SECTION (Section 13) */}
              <section className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Vacant Units</h3>
                    <p className="text-xs text-stone-500">
                      Unoccupied units ready for marketing and application onboarding
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md">
                    {operationalData.vacantUnits.length} available
                  </span>
                </div>

                {operationalData.vacantUnits.length === 0 ? (
                  <div className="py-8 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                    <p className="font-semibold text-stone-800">All units are currently occupied.</p>
                    <p className="text-stone-400">Zero rental revenue loss across your portfolio.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {operationalData.vacantUnits.map((u, i) => (
                      <div
                        key={`${u.propertyId}_${i}`}
                        className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-semibold text-stone-900 truncate">{u.propertyTitle}</div>
                          <div className="text-[11px] text-stone-500">
                            Unit: <strong className="text-stone-700 font-mono">{u.unitNumber}</strong> · {u.bhk}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Available since ~{u.availableSinceDays} days
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <span className="font-bold text-stone-900 font-mono block tabular-nums">
                            ₹{u.monthlyRent.toLocaleString('en-IN')}/mo
                          </span>
                          <button
                            onClick={() => {
                              const prop = operationalData.properties.find(p => p.id === u.propertyId);
                              if (prop) setManagingProperty(prop);
                              else setActiveSection('properties');
                            }}
                            className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Manage Unit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* YOUR PROPERTIES SUMMARY (Section 11 preview) */}
              <section className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Your Properties</h3>
                    <p className="text-xs text-stone-500">
                      Portfolio overview across residential complexes
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSection('properties')}
                    className="text-xs text-stone-700 hover:text-stone-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {operationalData.properties.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200 space-y-2">
                    <Building2 className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="font-semibold text-stone-800">No properties yet.</p>
                    <p className="text-stone-400">Add your first property to start receiving rental applications.</p>
                    <button
                      onClick={() => setActiveSection('create_listing')}
                      className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold"
                    >
                      + Add Property
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {operationalData.properties.map(p => {
                      const total = p.totalUnits || 1;
                      const occ =
                        p.occupiedUnits !== undefined
                          ? p.occupiedUnits
                          : p.status === 'rented'
                          ? total
                          : total - 1;
                      const vacant = Math.max(0, total - occ);

                      return (
                        <div
                          key={p.id}
                          className="p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded">
                                {p.bhk} · {p.propertyType}
                              </span>
                              <PropertyOccupancyChangeIndicator property={p} showComparisonLabel={false} size="xs" />
                            </div>
                            <h4 className="text-sm font-bold text-stone-900 mt-1 truncate">{p.title}</h4>
                            <p className="text-[11px] text-stone-500 truncate">{p.locality}, {p.city}</p>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                            <div>
                              <span className="font-mono font-bold text-stone-900">
                                {total} Units
                              </span>
                              <div className="text-[10px] text-stone-500">
                                {occ} Occupied · {vacant} Available
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-stone-900">
                                ₹{p.rentMonthly.toLocaleString('en-IN')}
                              </span>
                              <div className="text-[10px] text-stone-500">monthly</div>
                            </div>
                          </div>

                          <button
                            onClick={() => setManagingProperty(p)}
                            className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Manage Property
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* ===================================================================== */}
          {/* B. PROPERTIES TAB (Sections 11 & 12)                                  */}
          {/* ===================================================================== */}
          {activeSection === 'properties' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Your Properties</h2>
                  <p className="text-xs text-stone-500">
                    Comprehensive overview of residential assets, unit configurations, and occupancy status
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search properties..."
                      value={propertySearch}
                      onChange={e => setPropertySearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-stone-900 w-48"
                    />
                  </div>

                  <button
                    onClick={() => setActiveSection('create_listing')}
                    className="px-3.5 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add Property</span>
                  </button>
                </div>
              </div>

              {filteredListings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-6 space-y-3">
                  <Building2 className="w-10 h-10 text-stone-400 mx-auto" />
                  <h3 className="text-sm font-bold text-stone-800">No properties found</h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Add your first property to start receiving verified rental applications.
                  </p>
                  <button
                    onClick={() => setActiveSection('create_listing')}
                    className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    + Add Property
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredListings.map(l => {
                    const total = l.totalUnits || 1;
                    const occ =
                      l.occupiedUnits !== undefined
                        ? l.occupiedUnits
                        : l.status === 'rented'
                        ? total
                        : total - 1;
                    const vacant = Math.max(0, total - occ);

                    return (
                      <div
                        key={l.id}
                        className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4 hover:border-stone-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[10px] text-stone-500 font-mono bg-stone-100 px-2 py-0.5 rounded-md">
                              {l.bhk} · {l.propertyType}
                            </span>
                            <h3 className="text-base font-bold text-stone-900">{l.title}</h3>
                            <div className="flex items-center gap-1 text-xs text-stone-500">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span>{l.locality}, {l.city}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-base font-bold text-stone-900 font-mono tabular-nums">
                              ₹{l.rentMonthly.toLocaleString('en-IN')}<span className="text-xs font-normal text-stone-500">/mo</span>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block mt-1 ${
                                vacant === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {vacant === 0 ? 'Fully Occupied' : `${vacant} Available`}
                            </span>
                          </div>
                        </div>

                        {/* Units meter */}
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs flex items-center justify-between">
                          <span className="text-stone-600">
                            Units: <strong className="text-stone-900 font-mono tabular-nums">{total}</strong> Total
                          </span>
                          <span className="text-emerald-700 font-medium">
                            <strong className="font-mono tabular-nums">{occ}</strong> Occupied
                          </span>
                          <span className="text-stone-500">
                            <strong className="font-mono tabular-nums">{vacant}</strong> Available
                          </span>
                          <PropertyOccupancyChangeIndicator property={l} showComparisonLabel={true} size="xs" />
                        </div>

                        {/* Encrypted Physical Address Indicator */}
                        <div className="bg-stone-50/60 p-3 rounded-xl border border-stone-200/60 text-xs space-y-1">
                          <div className="flex items-center justify-between text-stone-600">
                            <span className="flex items-center gap-1 font-medium text-[11px]">
                              <Lock className="w-3 h-3 text-stone-500" />
                              AES-256-GCM Encrypted Address:
                            </span>
                            <span className="text-[9px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-mono">
                              Encrypted
                            </span>
                          </div>
                          <div className="font-mono text-stone-600 text-[11px] truncate">
                            {l.fullAddressEncrypted}
                          </div>
                          <div className="text-[10px] text-stone-400 italic">
                            Public preview: "{l.maskedAddressPreview}"
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
                          <span>
                            Deposit: <strong className="text-stone-900 font-mono tabular-nums">₹{l.securityDeposit.toLocaleString('en-IN')}</strong>
                          </span>
                          <button
                            onClick={() => setManagingProperty(l)}
                            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Manage Property
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* C. APPLICATIONS TAB (Sections 9 & 10)                                */}
          {/* ===================================================================== */}
          {activeSection === 'applications' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Rental Applications</h2>
                  <p className="text-xs text-stone-500">
                    Review and verify applicants with strict DPDP compliance and non-discrimination safeguards.
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl text-xs">
                  {['all', 'new', 'under_review', 'accepted', 'rejected'].map(st => (
                    <button
                      key={st}
                      onClick={() => setAppStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer capitalize ${
                        appStatusFilter === st
                          ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                  <FileText className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-sm font-semibold text-stone-800">No applications match this filter</p>
                  <p className="text-xs text-stone-400">All submissions are up to date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredApplications.map(app => {
                    const listing = backendService.getListingById(app.listingId);
                    const customer = backendService.getCustomerProfile(app.customerId);
                    const isAccepted = app.status === 'accepted' || app.status === 'active_tenancy';
                    const isRejected = app.status === 'rejected';
                    const isNew = app.status === 'pending';

                    return (
                      <div
                        key={app.id}
                        className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-stone-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-stone-400">#{app.id}</span>
                            <span aria-hidden="true" className="text-stone-300">·</span>
                            <span
                              className="text-xs text-stone-500"
                              title={formatAbsoluteDate(app.createdAt)}
                            >
                              {formatRelativeTime(app.createdAt, 'Received')}
                            </span>
                            <span aria-hidden="true" className="text-stone-300">·</span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                isAccepted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-800'
                                  : isNew
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-sky-100 text-sky-900'
                              }`}
                            >
                              {isNew ? 'NEW' : app.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {isRejected && (
                              <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                                {app.notificationStatus?.emailStatus === 'SENT' && app.notificationStatus?.smsStatus === 'SENT'
                                  ? 'Alerts: Sent'
                                  : app.notificationStatus?.emailDelivered && app.notificationStatus?.smsDelivered
                                  ? 'Alerts: Delivered'
                                  : app.notificationStatus?.emailStatus === 'SIMULATED'
                                  ? 'Alerts: Simulated'
                                  : app.notificationStatus?.emailStatus === 'QUEUED'
                                  ? 'Alerts: Queued'
                                  : app.notificationStatus?.emailStatus === 'FAILED'
                                  ? 'Alerts: Failed'
                                  : 'Alerts: Not Configured'}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-stone-900">{listing?.title}</h3>
                          <div className="text-xs text-stone-500">
                            Applicant: <strong className="text-stone-800">{customer?.name || app.customerId}</strong>
                            <span className="mx-2 text-stone-300">·</span>
                            Occupation: {customer?.occupation || 'Corporate Executive'}
                            <span className="mx-2 text-stone-300">·</span>
                            App Fee: ₹20 (Non-refundable)
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenReview(app.id)}
                            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review Applicant</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* D. TENANTS TAB (Section 16 - Active Leases)                          */}
          {/* ===================================================================== */}
          {activeSection === 'tenants' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Active Tenants &amp; Leases</h2>
                <p className="text-xs text-stone-500">
                  Current residents occupying units across your properties
                </p>
              </div>

              {activeTenants.length === 0 ? (
                <div className="py-16 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                  <UserCheck className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="font-semibold text-stone-800">No active leases yet</p>
                  <p className="text-stone-400">Accepted tenants will appear here once tenancy commences.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Tenant</th>
                          <th className="py-2.5 px-3">Property &amp; Unit</th>
                          <th className="py-2.5 px-3">Monthly Rent</th>
                          <th className="py-2.5 px-3">Lease Start</th>
                          <th className="py-2.5 px-3">Rent Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {activeTenants.map(t => (
                          <tr key={t.applicationId} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-stone-900">{t.tenantName}</div>
                              <div className="text-[10px] text-stone-400 font-mono">ID: {t.tenantId}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-stone-900">{t.propertyTitle}</div>
                              <div className="text-[10px] text-stone-500">Unit: {t.unitNumber} ({t.bhk})</div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-stone-900 tabular-nums">
                              ₹{t.monthlyRent.toLocaleString('en-IN')}/mo
                            </td>
                            <td className="py-3 px-3 text-stone-500">
                              {new Date(t.leaseStart).toLocaleDateString('en-IN', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                {t.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  setActiveSection('rent_collection');
                                  setRentSubTab('ledger');
                                }}
                                className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                View Ledger
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* E. RENT COLLECTION TAB (Section 14)                                   */}
          {/* ===================================================================== */}
          {activeSection === 'rent_collection' && (
            <div className="space-y-6">
              {/* Header and Sub-Tab Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Rent &amp; Payments</h2>
                  <p className="text-xs text-stone-500">
                    Track monthly collections, payouts, and detailed historical remittance ledgers
                  </p>
                </div>

                {/* Sub-Tabs: Overview vs Ledger */}
                <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-2xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setRentSubTab('overview')}
                    className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      rentSubTab === 'overview'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Collection Overview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentSubTab('ledger')}
                    className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      rentSubTab === 'ledger'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-stone-700" />
                    <span>Ledger</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-700 font-mono">
                      {historicalRemittances.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: OVERVIEW & MONTHLY TRACKING */}
              {rentSubTab === 'overview' && (
                <div className="space-y-5">
                  {/* Status summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                      <span className="text-[11px] text-stone-500 uppercase tracking-wider block">Due This Month</span>
                      <span className="text-xl font-bold text-stone-900 font-mono tabular-nums">
                        ₹{operationalData.financials.thisMonthDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                      <span className="text-[11px] text-emerald-800 uppercase tracking-wider block font-medium">Collected</span>
                      <span className="text-xl font-bold text-emerald-800 font-mono tabular-nums">
                        ₹{operationalData.financials.thisMonthCollected.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                      <span className="text-[11px] text-amber-800 uppercase tracking-wider block font-medium">Pending</span>
                      <span className="text-xl font-bold text-amber-800 font-mono tabular-nums">
                        ₹{operationalData.financials.thisMonthPending.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-stone-200">
                      <span className="text-[11px] text-stone-500 uppercase tracking-wider block">Collection Rate</span>
                      <span className="text-xl font-bold text-stone-900 font-mono tabular-nums">
                        {operationalData.financials.collectionRate}%
                      </span>
                    </div>
                  </div>

                  {/* Summary preview with button to Ledger */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">Recent Rent Remittances</h3>
                        <p className="text-xs text-stone-500">Latest funds settled into your verified bank account</p>
                      </div>
                      <button
                        onClick={() => setRentSubTab('ledger')}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View Full Ledger</span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] tracking-wider font-semibold">
                            <th className="py-2.5 px-3">Transaction ID</th>
                            <th className="py-2.5 px-3">Property</th>
                            <th className="py-2.5 px-3">Net Settlement</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {historicalRemittances.slice(0, 5).map(pay => (
                            <tr key={pay.id} className="hover:bg-stone-50/80">
                              <td className="py-3 px-3 font-mono text-stone-700">{pay.id}</td>
                              <td className="py-3 px-3 text-stone-900 font-medium">{pay.propertyName}</td>
                              <td className="py-3 px-3 font-mono font-bold text-emerald-800 tabular-nums">
                                ₹{pay.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-3 text-stone-500">
                                {new Date(pay.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  {pay.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {historicalRemittances.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-stone-400">
                                No rent remittances recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: HISTORICAL REMITTANCE LEDGER */}
              {rentSubTab === 'ledger' && (
                <div className="space-y-5">
                  {/* Ledger Key Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4.5 rounded-2xl border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between text-stone-500 text-xs">
                        <span>{ledgerStartDate || ledgerEndDate ? 'Remittances in Period' : 'Total Historical Remittances'}</span>
                        <Receipt className="w-4 h-4 text-stone-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-stone-900">
                        {dateFilteredRemittances.length}
                        {(ledgerStartDate || ledgerEndDate) && (
                          <span className="text-xs text-stone-400 font-normal font-sans ml-1.5">
                            / {historicalRemittances.length} all-time
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>100% verified ledger entries</span>
                      </div>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between text-stone-500 text-xs">
                        <span>{ledgerStartDate || ledgerEndDate ? 'Period Net Disbursed' : 'Cumulative Net Disbursed'}</span>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
                        ₹{totalRemittedCapital.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        {ledgerStartDate || ledgerEndDate
                          ? `Total rental payout for selected billing range`
                          : 'Pure rental income credited to owner'}
                      </div>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between text-stone-500 text-xs">
                        <span>Owner Brokerage Deduction</span>
                        <ShieldCheck className="w-4 h-4 text-stone-400" />
                      </div>
                      <div className="text-2xl font-bold font-mono text-stone-900">
                        ₹0.00
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Guaranteed ₹0 owner brokerage policy
                      </div>
                    </div>
                  </div>

                  {/* Date Range Picker Component for Billing Periods */}
                  <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-2xs space-y-3.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                              Billing Period &amp; Date Range Filter
                            </h4>
                            {(ledgerStartDate || ledgerEndDate) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Active Filter
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500">
                            {ledgerStartDate || ledgerEndDate ? (
                              <span>
                                Showing billing period from{' '}
                                <strong className="text-stone-800 font-mono">
                                  {ledgerStartDate || 'Earliest'}
                                </strong>{' '}
                                to{' '}
                                <strong className="text-stone-800 font-mono">
                                  {ledgerEndDate || 'Present'}
                                </strong>{' '}
                                · {dateFilteredRemittances.length} matching transactions
                              </span>
                            ) : (
                              'Filter both the payout trend chart and the historical remittance ledger by billing period'
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center flex-wrap gap-1.5 self-start lg:self-auto">
                        <span className="text-[10px] uppercase font-semibold text-stone-400 mr-1">Presets:</span>
                        {[
                          { id: 'all', label: 'All Time', start: '', end: '' },
                          { id: 'this_month', label: 'This Month', start: '2026-10-01', end: '2026-10-31' },
                          { id: 'last_month', label: 'Last Month', start: '2026-09-01', end: '2026-09-30' },
                          { id: 'last_3_months', label: 'Last 3 Mo', start: '2026-08-01', end: '2026-10-31' },
                          { id: 'last_6_months', label: 'Last 6 Mo', start: '2026-05-01', end: '2026-10-31' },
                        ].map((preset) => {
                          const isActive = activeDatePreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setLedgerStartDate(preset.start);
                                setLedgerEndDate(preset.end);
                                setActiveDatePreset(preset.id as any);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Start Date and End Date Inputs */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                        {/* Start Date Input */}
                        <div className="flex items-center gap-2 flex-1 max-w-xs">
                          <label className="text-xs font-semibold text-stone-600 whitespace-nowrap">
                            Start Date:
                          </label>
                          <input
                            type="date"
                            value={ledgerStartDate}
                            onChange={(e) => {
                              setLedgerStartDate(e.target.value);
                              setActiveDatePreset('custom');
                            }}
                            className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                          />
                        </div>

                        <span className="hidden sm:inline text-stone-400 font-bold">→</span>

                        {/* End Date Input */}
                        <div className="flex items-center gap-2 flex-1 max-w-xs">
                          <label className="text-xs font-semibold text-stone-600 whitespace-nowrap">
                            End Date:
                          </label>
                          <input
                            type="date"
                            value={ledgerEndDate}
                            onChange={(e) => {
                              setLedgerEndDate(e.target.value);
                              setActiveDatePreset('custom');
                            }}
                            className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                          />
                        </div>

                        {/* Reset Button */}
                        {(ledgerStartDate || ledgerEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setLedgerStartDate('');
                              setLedgerEndDate('');
                              setActiveDatePreset('all');
                            }}
                            className="py-1.5 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors self-start sm:self-center shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                            <span>Reset Range</span>
                          </button>
                        )}
                      </div>

                      <div className="text-xs text-stone-500 font-mono self-end sm:self-center">
                        <span className="font-bold text-stone-800">{dateFilteredRemittances.length}</span> remittances in range
                      </div>
                    </div>

                    {/* Date validation message */}
                    {ledgerStartDate && ledgerEndDate && ledgerStartDate > ledgerEndDate && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Start Date cannot be later than End Date. Please choose a valid billing range.</span>
                      </div>
                    )}
                  </div>

                  {/* Recharts Monthly Rental Payout Trend Line Chart */}
                  <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-sm font-bold text-stone-900">Monthly Rental Payout Trend</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {ledgerStartDate || ledgerEndDate
                              ? `${monthlyPayoutTrendData.length} Billing Month${monthlyPayoutTrendData.length === 1 ? '' : 's'}`
                              : '6-Month Timeline'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {ledgerStartDate || ledgerEndDate
                            ? `Visual summary of net rental earnings for selected period (${monthlyPayoutTrendData[0]?.month || ''} – ${monthlyPayoutTrendData[monthlyPayoutTrendData.length - 1]?.month || ''})`
                            : 'Visual summary of net rental earnings remitted to owner escrow over time'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono self-start sm:self-auto">
                        <div className="text-right">
                          <div className="text-[10px] text-stone-400 font-sans uppercase">Avg Monthly</div>
                          <div className="font-bold text-stone-900">
                            ₹{payoutTrendStats.avgMonthly.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="w-px h-7 bg-stone-200" />
                        <div className="text-right">
                          <div className="text-[10px] text-stone-400 font-sans uppercase">Peak Month</div>
                          <div className="font-bold text-emerald-700">
                            ₹{payoutTrendStats.peakPoint.payout.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="w-px h-7 bg-stone-200" />
                        <div className="text-right">
                          <div className="text-[10px] text-stone-400 font-sans uppercase">Retained Yield</div>
                          <div className="font-bold text-emerald-700">100%</div>
                        </div>
                      </div>
                    </div>

                    {/* Small Line Chart Container */}
                    <div className="h-44 w-full pt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyPayoutTrendData} margin={{ top: 8, right: 15, left: -5, bottom: 0 }}>
                          <CartesianGrid stroke="#f5f5f4" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="shortMonth"
                            tick={{ fill: '#78716c', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={{ stroke: '#e7e5e4' }}
                          />
                          <YAxis
                            tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                            tick={{ fill: '#78716c', fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null;
                              const d = payload[0].payload as {
                                monthKey: string;
                                month: string;
                                shortMonth: string;
                                payout: number;
                                remittanceCount: number;
                                avgPayout: number;
                              };
                              return (
                                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-lg text-xs space-y-1.5 z-50 min-w-44">
                                  <div className="font-bold text-stone-900 border-b border-stone-100 pb-1 flex items-center justify-between">
                                    <span>{d.month}</span>
                                    <span className="text-emerald-700 font-mono font-bold">
                                      ₹{d.payout.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-stone-600 space-y-1">
                                    <div className="flex justify-between gap-3">
                                      <span className="text-stone-500">Disbursements:</span>
                                      <span className="font-mono font-medium text-stone-900">
                                        {d.remittanceCount} {d.remittanceCount === 1 ? 'remittance' : 'remittances'}
                                      </span>
                                    </div>
                                    {d.remittanceCount > 0 && (
                                      <div className="flex justify-between gap-3">
                                        <span className="text-stone-500">Avg per remittance:</span>
                                        <span className="font-mono text-stone-700">
                                          ₹{d.avgPayout.toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                    )}
                                    <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[10px] text-emerald-700 font-medium">
                                      <span>Owner Deductions:</span>
                                      <span>₹0.00 (Pure Rent)</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="payout"
                            name="Rental Payout"
                            stroke="#059669"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#ffffff', stroke: '#059669', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Month-by-Month Mini Summary Strip */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-stone-100">
                      {monthlyPayoutTrendData.map((pt) => {
                        return (
                          <div
                            key={pt.monthKey}
                            className="p-2 rounded-xl bg-stone-50 border border-stone-100 hover:border-emerald-200 transition-colors text-center"
                          >
                            <div className="text-[10px] font-semibold text-stone-500">{pt.shortMonth}</div>
                            <div className="text-xs font-bold font-mono text-stone-900 mt-0.5">
                              ₹{pt.payout >= 1000 ? `${(pt.payout / 1000).toFixed(1)}k` : pt.payout}
                            </div>
                            <div className="text-[9px] text-emerald-700 font-medium mt-0.5">
                              {pt.remittanceCount} {pt.remittanceCount === 1 ? 'remit' : 'remits'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="bg-white rounded-2xl p-4 border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search property, transaction ID, or note..."
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-400"
                        />
                        {ledgerSearch && (
                          <button
                            onClick={() => setLedgerSearch('')}
                            className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <select
                          value={ledgerStatusFilter}
                          onChange={(e) => setLedgerStatusFilter(e.target.value)}
                          className="bg-stone-50 border border-stone-200 rounded-xl text-xs py-1.5 px-2.5 text-stone-700 focus:outline-hidden cursor-pointer"
                        >
                          <option value="all">All Statuses</option>
                          <option value="successful">Successful</option>
                          <option value="settled">Settled</option>
                          <option value="captured">Captured</option>
                        </select>
                      </div>

                      {/* Active Date Range Tag */}
                      {(ledgerStartDate || ledgerEndDate) && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-medium">
                          <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            {ledgerStartDate || 'Start'} → {ledgerEndDate || 'End'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setLedgerStartDate('');
                              setLedgerEndDate('');
                              setActiveDatePreset('all');
                            }}
                            className="text-emerald-700 hover:text-emerald-950 cursor-pointer ml-0.5"
                            title="Clear date filter"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 font-mono shrink-0">
                      Showing <span className="font-bold text-stone-900">{filteredRemittances.length}</span> of {historicalRemittances.length} records
                    </div>
                  </div>

                  {/* Detailed Historical Remittances Table */}
                  <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-stone-700" />
                        <h3 className="text-sm font-bold text-stone-900">Historical Rental Remittance Ledger</h3>
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono">
                        Authoritative Transaction Records
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider font-semibold select-none">
                            {/* Sortable: Date & Time */}
                            <th className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => {
                                  if (ledgerSortField === 'date') {
                                    setLedgerSortOrder(ledgerSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setLedgerSortField('date');
                                    setLedgerSortOrder('desc');
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer group hover:text-stone-900 ${
                                  ledgerSortField === 'date' ? 'text-emerald-700 font-bold' : 'text-stone-600'
                                }`}
                                title="Click to sort by date"
                              >
                                <span>Date &amp; Time</span>
                                <span className={`p-0.5 rounded ${ledgerSortField === 'date' ? 'bg-emerald-100 text-emerald-800' : 'text-stone-400 group-hover:text-stone-600'}`}>
                                  {ledgerSortField === 'date' ? (
                                    ledgerSortOrder === 'asc' ? (
                                      <ArrowUp className="w-3 h-3" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                                  )}
                                </span>
                              </button>
                            </th>

                            {/* Sortable: Property Name */}
                            <th className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => {
                                  if (ledgerSortField === 'property') {
                                    setLedgerSortOrder(ledgerSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setLedgerSortField('property');
                                    setLedgerSortOrder('asc');
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 transition-colors cursor-pointer group hover:text-stone-900 ${
                                  ledgerSortField === 'property' ? 'text-emerald-700 font-bold' : 'text-stone-600'
                                }`}
                                title="Click to sort by property name"
                              >
                                <span>Property Name</span>
                                <span className={`p-0.5 rounded ${ledgerSortField === 'property' ? 'bg-emerald-100 text-emerald-800' : 'text-stone-400 group-hover:text-stone-600'}`}>
                                  {ledgerSortField === 'property' ? (
                                    ledgerSortOrder === 'asc' ? (
                                      <ArrowUp className="w-3 h-3" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                                  )}
                                </span>
                              </button>
                            </th>

                            <th className="py-3 px-4">Remittance Reference</th>
                            <th className="py-3 px-4">Channel / Payout</th>

                            {/* Sortable: Net Settlement Amount */}
                            <th className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (ledgerSortField === 'amount') {
                                    setLedgerSortOrder(ledgerSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setLedgerSortField('amount');
                                    setLedgerSortOrder('desc');
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 justify-end ml-auto transition-colors cursor-pointer group hover:text-stone-900 ${
                                  ledgerSortField === 'amount' ? 'text-emerald-700 font-bold' : 'text-stone-600'
                                }`}
                                title="Click to sort by settlement amount"
                              >
                                <span>Net Settlement Amount</span>
                                <span className={`p-0.5 rounded ${ledgerSortField === 'amount' ? 'bg-emerald-100 text-emerald-800' : 'text-stone-400 group-hover:text-stone-600'}`}>
                                  {ledgerSortField === 'amount' ? (
                                    ledgerSortOrder === 'asc' ? (
                                      <ArrowUp className="w-3 h-3" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                                  )}
                                </span>
                              </button>
                            </th>

                            <th className="py-3 px-4 text-center">Payment Status</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {filteredRemittances.map((pay) => {
                            const isSuccessful = pay.status.toLowerCase() === 'successful' || pay.status.toLowerCase() === 'settled' || pay.status.toLowerCase() === 'captured';
                            const dateObj = new Date(pay.createdAt);
                            const formattedDate = dateObj.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            });
                            const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <tr
                                key={pay.id}
                                className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                                onClick={() => setSelectedRemittanceForDetail(pay)}
                              >
                                {/* Date Column */}
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700" />
                                    <div>
                                      <div className="font-semibold text-stone-900">{formattedDate}</div>
                                      <div className="text-[10px] text-stone-400 font-mono">{formattedTime}</div>
                                    </div>
                                  </div>
                                </td>

                                {/* Property Name Column */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                    <div>
                                      <div className="font-bold text-stone-900">{pay.propertyName || 'Residential Listing'}</div>
                                      <div className="text-[10px] text-stone-500 truncate max-w-xs">
                                        {pay.description || 'Monthly Rental Remittance'}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Remittance Ref Column */}
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="font-mono font-medium text-stone-800">{pay.id}</div>
                                  {pay.razorpayPaymentId && (
                                    <div className="text-[10px] text-stone-400 font-mono">
                                      Ref: {pay.razorpayPaymentId}
                                    </div>
                                  )}
                                </td>

                                {/* Channel / Payout Column */}
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-stone-700">
                                    <CreditCard className="w-3 h-3 text-stone-400" />
                                    <span className="font-medium">
                                      {pay.gateway === 'razorpay_route'
                                        ? 'Razorpay Route (IMPS)'
                                        : (pay.method?.toUpperCase() || 'UPI Direct')}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-stone-400">Direct Escrow Settlement</div>
                                </td>

                                {/* Net Settlement Amount Column */}
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="font-mono font-bold text-emerald-800 text-sm tabular-nums">
                                    ₹{pay.amount.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-medium">Net to Owner</div>
                                </td>

                                {/* Payment Status Column */}
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                      isSuccessful
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200/80'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isSuccessful ? 'bg-emerald-600' : 'bg-amber-600'
                                      }`}
                                    />
                                    {pay.status.toUpperCase()}
                                  </span>
                                </td>

                                {/* Action Column */}
                                <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setSelectedRemittanceForDetail(pay)}
                                    className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                  >
                                    <Eye className="w-3 h-3 text-stone-500" />
                                    <span>Voucher</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {filteredRemittances.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-12 text-center space-y-2">
                                <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                                  <Receipt className="w-5 h-5" />
                                </div>
                                <div className="text-sm font-semibold text-stone-700">No Remittances Found</div>
                                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                                  {ledgerStartDate || ledgerEndDate
                                    ? `No historical remittances found for the selected billing period (${ledgerStartDate || 'earliest'} to ${ledgerEndDate || 'latest'}).`
                                    : ledgerSearch || ledgerStatusFilter !== 'all'
                                    ? 'No historical remittances match your current search or status filter.'
                                    : 'There are currently no historical rent remittances recorded for this owner account.'}
                                </p>
                                {(ledgerSearch || ledgerStatusFilter !== 'all' || ledgerStartDate || ledgerEndDate) && (
                                  <button
                                    onClick={() => {
                                      setLedgerSearch('');
                                      setLedgerStatusFilter('all');
                                      setLedgerStartDate('');
                                      setLedgerEndDate('');
                                      setActiveDatePreset('all');
                                    }}
                                    className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                                  >
                                    Reset all filters and billing range
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* F. REVIEWS & RATINGS TAB                                              */}
          {/* ===================================================================== */}
          {activeSection === 'reviews' && (
            <div className="space-y-6">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <h2 className="text-lg font-bold text-stone-900">Tenant Reviews &amp; Ratings</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Verified Concluded Leases
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Ratings and candid feedback submitted by residents after their rental tenancy concludes.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={reviewsPropertyFilter}
                    onChange={e => setReviewsPropertyFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:border-stone-900 cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Properties ({myListings.length})</option>
                    {myListings.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>

                  <select
                    value={reviewsStarFilter === 'all' ? 'all' : String(reviewsStarFilter)}
                    onChange={e => setReviewsStarFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:border-stone-900 cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars only</option>
                    <option value="4">4 Stars only</option>
                    <option value="3">3 Stars only</option>
                    <option value="2">2 Stars only</option>
                    <option value="1">1 Star only</option>
                  </select>
                </div>
              </div>

              {/* Aggregate Score & Distribution KPI Card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Overall Score */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Overall Landlord Reputation
                    </span>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-4xl font-extrabold text-stone-900 font-mono">
                        {ownerReviewsSummary.totalReviews > 0 ? ownerReviewsSummary.averageOwnerRating.toFixed(1) : '–'}
                      </span>
                      <span className="text-sm text-stone-400 font-medium">/ 5.0</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <StarRating
                        rating={ownerReviewsSummary.averageOwnerRating}
                        size="md"
                        readOnly
                      />
                      <span className="text-xs text-stone-500 font-medium">
                        ({ownerReviewsSummary.totalReviews} verified {ownerReviewsSummary.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span>Property Average</span>
                    <span className="font-semibold text-stone-800 font-mono">
                      {ownerReviewsSummary.totalReviews > 0 ? `${ownerReviewsSummary.averagePropertyRating.toFixed(1)} ★` : '–'}
                    </span>
                  </div>
                </div>

                {/* Rating Distribution */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-2 lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Star Breakdown
                    </h3>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {ownerReviewsSummary.totalReviews} Total Tenant Reviews
                    </span>
                  </div>

                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = ownerReviewsSummary.ratingDistribution[stars as 1|2|3|4|5] || 0;
                    const pct = ownerReviewsSummary.totalReviews > 0
                      ? Math.round((count / ownerReviewsSummary.totalReviews) * 100)
                      : 0;

                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="w-12 text-stone-600 font-medium shrink-0 flex items-center gap-1">
                          <span>{stars}</span>
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        </span>
                        <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-stone-500 tabular-nums shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}

                  {/* Sub-Category Averages */}
                  <div className="pt-4 mt-3 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="text-[10px] text-stone-500">Cleanliness</div>
                      <div className="text-xs font-bold text-stone-800 font-mono mt-0.5">
                        {ownerReviewsSummary.categoryAverages.cleanliness ? `${ownerReviewsSummary.categoryAverages.cleanliness.toFixed(1)} ★` : '–'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="text-[10px] text-stone-500">Maintenance</div>
                      <div className="text-xs font-bold text-stone-800 font-mono mt-0.5">
                        {ownerReviewsSummary.categoryAverages.maintenance ? `${ownerReviewsSummary.categoryAverages.maintenance.toFixed(1)} ★` : '–'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="text-[10px] text-stone-500">Communication</div>
                      <div className="text-xs font-bold text-stone-800 font-mono mt-0.5">
                        {ownerReviewsSummary.categoryAverages.communication ? `${ownerReviewsSummary.categoryAverages.communication.toFixed(1)} ★` : '–'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="text-[10px] text-stone-500">Deposit Return</div>
                      <div className="text-xs font-bold text-stone-800 font-mono mt-0.5">
                        {ownerReviewsSummary.categoryAverages.depositReturn ? `${ownerReviewsSummary.categoryAverages.depositReturn.toFixed(1)} ★` : '–'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Reviews List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">
                    Tenant Reviews ({filteredOwnerReviews.length})
                  </h3>
                  {reviewsPropertyFilter !== 'all' || reviewsStarFilter !== 'all' ? (
                    <button
                      onClick={() => {
                        setReviewsPropertyFilter('all');
                        setReviewsStarFilter('all');
                      }}
                      className="text-xs text-stone-500 hover:text-stone-900 font-semibold cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  ) : null}
                </div>

                {filteredOwnerReviews.length === 0 ? (
                  <div className="py-16 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                    <MessageSquareQuote className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="font-semibold text-stone-800">No reviews found</p>
                    <p className="text-stone-400">
                      {reviewsPropertyFilter !== 'all' || reviewsStarFilter !== 'all'
                        ? 'No reviews match your current property or star filter.'
                        : 'Verified reviews appear here after tenants conclude their agreements and submit feedback.'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredOwnerReviews.map(review => (
                      <motion.div
                        layout
                        layoutId={review.id}
                        key={review.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                          layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                          duration: 0.25
                        }}
                        className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4 hover:border-stone-300 transition-colors"
                      >
                        {/* Recently Actioned Visual Feedback */}
                        <AnimatePresence>
                          {recentlyUpdatedReviewId?.id === review.id && (
                            <motion.div
                              key={`recently-actioned-${review.id}`}
                              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div
                                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                                  recentlyUpdatedReviewId.action === 'responded'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {recentlyUpdatedReviewId.action === 'responded' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  )}
                                  <span>
                                    {recentlyUpdatedReviewId.action === 'responded'
                                      ? 'Official landlord response published to resident.'
                                      : 'Review flagged and reported for compliance review.'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setRecentlyUpdatedReviewId(null)}
                                  className="text-[10px] text-stone-500 hover:text-stone-800 cursor-pointer p-1"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Review Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 text-sm">{review.tenantName}</span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold flex items-center gap-1 border border-emerald-100">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified Tenant</span>
                              </span>
                              {review.unitNumber && (
                                <span className="text-[11px] text-stone-400 font-mono">
                                  Unit {review.unitNumber}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-stone-700">{review.propertyTitle}</span>
                              <span>•</span>
                              <span>
                                Tenancy: {review.tenancyStartDate ? new Date(review.tenancyStartDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : (review.commencementDate ? new Date(review.commencementDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '–')} – {review.tenancyEndDate ? new Date(review.tenancyEndDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : (review.concludedDate ? new Date(review.concludedDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '–')}
                              </span>
                              <span>•</span>
                              <span className="text-stone-400">
                                Reviewed on {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {/* Ratings Overview */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-stone-900 font-mono">
                                {review.overallRating.toFixed(1)} / 5.0
                              </div>
                              <div className="text-[10px] text-stone-400">Overall</div>
                            </div>
                            <StarRating rating={review.overallRating} size="md" readOnly />
                          </div>
                        </div>

                        {/* Sub-ratings & Badges */}
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono">
                            Property: <strong>{review.propertyRating}★</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono">
                            Landlord: <strong>{review.ownerRating}★</strong>
                          </span>
                          {review.categoryRatings?.cleanliness && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 text-stone-600 border border-stone-200">
                              Cleanliness: {review.categoryRatings.cleanliness}★
                            </span>
                          )}
                          {review.categoryRatings?.maintenance && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 text-stone-600 border border-stone-200">
                              Maintenance: {review.categoryRatings.maintenance}★
                            </span>
                          )}
                          {review.categoryRatings?.communication && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 text-stone-600 border border-stone-200">
                              Communication: {review.categoryRatings.communication}★
                            </span>
                          )}
                          {review.categoryRatings?.depositReturn && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-50 text-stone-600 border border-stone-200">
                              Deposit Return: {review.categoryRatings.depositReturn}★
                            </span>
                          )}

                          <AnimatePresence>
                            {review.moderationStatus === 'flagged' && (
                              <motion.span
                                key="flagged-badge"
                                initial={{ opacity: 0, scale: 0.8, x: -4 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Flagged for Moderation</span>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Review Text */}
                        <div className="space-y-1 bg-stone-50/70 p-3.5 rounded-xl border border-stone-100">
                          {review.title && (
                            <h4 className="font-semibold text-xs text-stone-900">
                              &ldquo;{review.title}&rdquo;
                            </h4>
                          )}
                          <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                            {review.reviewText}
                          </p>
                        </div>

                        {/* Tags */}
                        {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {review.tags.map((t, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-100 flex items-center gap-1"
                              >
                                <ThumbsUp className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{t}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Owner Response Section */}
                        <AnimatePresence mode="wait">
                          {review.ownerResponse ? (
                            <motion.div
                              key={`response-bubble-${review.id}`}
                              initial={{ opacity: 0, y: 8, scale: 0.99 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                              className={`p-3.5 rounded-xl border space-y-1.5 transition-colors ${
                                recentlyUpdatedReviewId?.id === review.id && recentlyUpdatedReviewId.action === 'responded'
                                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
                                  : 'bg-amber-50/60 border-amber-200/70'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                                  <CornerDownRight className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Response from Landlord</span>
                                  {recentlyUpdatedReviewId?.id === review.id && recentlyUpdatedReviewId.action === 'responded' && (
                                    <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold tracking-wide uppercase">
                                      Published
                                    </span>
                                  )}
                                </div>
                                {review.ownerResponseAt && (
                                  <span className="text-[10px] text-amber-700/70 font-mono">
                                    {new Date(review.ownerResponseAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-800 leading-relaxed pl-5">
                                {review.ownerResponse}
                              </p>
                            </motion.div>
                          ) : (
                            <motion.div
                              key={`action-buttons-${review.id}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="pt-2 flex items-center justify-between"
                            >
                              {respondingReviewId === review.id ? null : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRespondingReviewId(review.id);
                                    setFlaggingReviewId(null);
                                    setResponseText('');
                                  }}
                                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <CornerDownRight className="w-3.5 h-3.5 text-stone-600" />
                                  <span>Post Landlord Reply</span>
                                </button>
                              )}

                              {/* Flag / Report Button */}
                              {flaggingReviewId === review.id ? null : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFlaggingReviewId(review.id);
                                    setRespondingReviewId(null);
                                    setFlagReason('');
                                  }}
                                  className="px-2.5 py-1 text-stone-400 hover:text-rose-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Report inappropriate content to moderation team"
                                >
                                  <Flag className="w-3 h-3" />
                                  <span>Report Inappropriate</span>
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Inline Owner Response Form */}
                        <AnimatePresence>
                          {respondingReviewId === review.id && (
                            <motion.div
                              key={`reply-form-${review.id}`}
                              initial={{ opacity: 0, height: 0, y: -6 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -6 }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-stone-900">
                                    Write Official Landlord Response
                                  </span>
                                  <span className="text-[10px] text-stone-400">
                                    Visible to prospective applicants
                                  </span>
                                </div>
                                <textarea
                                  rows={3}
                                  value={responseText}
                                  onChange={e => setResponseText(e.target.value)}
                                  placeholder="Thank the resident, acknowledge points raised, or provide context..."
                                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRespondingReviewId(null);
                                      setResponseText('');
                                    }}
                                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendOwnerResponse(review.id)}
                                    disabled={!responseText.trim() || isSubmittingReviewAction}
                                    className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                                  >
                                    {isSubmittingReviewAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                                    <span>Publish Response</span>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Inline Flag Form */}
                        <AnimatePresence>
                          {flaggingReviewId === review.id && (
                            <motion.div
                              key={`flag-form-${review.id}`}
                              initial={{ opacity: 0, height: 0, y: -6 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -6 }}
                              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                                    <Flag className="w-3.5 h-3.5 text-rose-700" />
                                    <span>Report Review for Moderation</span>
                                  </span>
                                  <span className="text-[10px] text-rose-600">
                                    Will be reviewed by Compliance Admin
                                  </span>
                                </div>
                                <textarea
                                  rows={2}
                                  value={flagReason}
                                  onChange={e => setFlagReason(e.target.value)}
                                  placeholder="Describe why this review violates platform terms (e.g. offensive language, privacy violation, defamatory claims)..."
                                  className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs text-stone-900 focus:outline-hidden focus:border-rose-700"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFlaggingReviewId(null);
                                      setFlagReason('');
                                    }}
                                    className="px-3 py-1.5 bg-white text-stone-700 rounded-xl text-xs font-semibold border border-stone-200 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFlagReview(review.id)}
                                    disabled={!flagReason.trim() || isSubmittingReviewAction}
                                    className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                                  >
                                    {isSubmittingReviewAction && <RefreshCw className="w-3 h-3 animate-spin" />}
                                    <span>Submit to Moderation</span>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* F. ANALYTICS TAB (Section 12 - Performance & Yield)                  */}
          {/* ===================================================================== */}
          {activeSection === 'analytics' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Portfolio Analytics</h2>
                <p className="text-xs text-stone-500">
                  Operational performance, occupancy metrics, and rental realization
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
                  <span className="text-xs text-stone-500 font-medium">Average Rental Yield / Unit</span>
                  <div className="text-2xl font-bold font-mono text-stone-900">
                    ₹{operationalData.financials.averageMonthlyRentPerUnit.toLocaleString('en-IN')}/mo
                  </div>
                  <p className="text-[11px] text-stone-400">Based on published rate cards</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
                  <span className="text-xs text-stone-500 font-medium">Occupancy Efficiency</span>
                  <div className="text-2xl font-bold font-mono text-emerald-700">
                    {operationalData.occupancy.percentage}%
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {operationalData.occupancy.occupiedUnits} of {operationalData.occupancy.totalUnits} units earning rent
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-1">
                  <span className="text-xs text-stone-500 font-medium">Application Conversion Rate</span>
                  <div className="text-2xl font-bold font-mono text-stone-900">
                    {operationalData.applicationsSummary.conversionRate !== undefined
                      ? operationalData.applicationsSummary.conversionRate
                      : (operationalData.applicationsSummary.total > 0
                          ? Math.round(
                              (operationalData.applicationsSummary.accepted /
                                operationalData.applicationsSummary.total) *
                                100
                            )
                          : 0)}%
                  </div>
                  <p className="text-[11px] text-stone-400">Screening-to-acceptance ratio</p>
                </div>
              </div>

              {/* 6-Month Rental Income Trends Line Chart (Recharts) */}
              <RentalIncomeTrendsLineChart
                data={operationalData.financials.historicalMonthly}
                propertiesCount={operationalData.kpis.propertiesCount}
                occupiedUnitsCount={operationalData.occupancy.occupiedUnits}
                totalUnitsCount={operationalData.occupancy.totalUnits}
              />

              <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                <h3 className="text-sm font-bold text-stone-900">Property Occupancy Comparison</h3>
                <div className="space-y-3">
                  {operationalData.properties.map(p => {
                    const total = p.totalUnits || 1;
                    const occ =
                      p.occupiedUnits !== undefined
                        ? p.occupiedUnits
                        : p.status === 'rented'
                        ? total
                        : total - 1;
                    const pct = Math.round((occ / total) * 100);

                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-900">{p.title}</span>
                          <span className="font-mono text-stone-600">
                            {occ} / {total} units ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-emerald-600 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* G. NOTIFICATIONS TAB                                                  */}
          {/* ===================================================================== */}
          {activeSection === 'notifications' && (
            <div className="space-y-5 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Operational Alerts</h2>
                  <p className="text-xs text-stone-500">
                    Real-time notifications for tenant applications, remittances, and compliance
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setNotificationFilter('all')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        notificationFilter === 'all'
                          ? 'bg-white text-stone-900 font-semibold'
                          : 'text-stone-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setNotificationFilter('unread')}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        notificationFilter === 'unread'
                          ? 'bg-white text-stone-900 font-semibold'
                          : 'text-stone-600'
                      }`}
                    >
                      Unread
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      const allIds = new Set<string>(ownerNotifications.map(n => n.id));
                      setReadNotificationIds(allIds);
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Mark All Read
                  </button>
                </div>
              </div>

              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-200 p-6 space-y-2">
                  <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-stone-800">You are all caught up.</p>
                  <p className="text-stone-400">No unread notifications at this time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((n: AppNotification) => (
                    <div
                      key={n.id}
                      className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1 hover:border-stone-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{n.title}</span>
                        <span className="text-[10px] text-stone-400">
                          {formatRelativeTime((n as any).createdAt || new Date().toISOString(), '')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* H. CREATE LISTING WIZARD (Add Property)                              */}
          {/* ===================================================================== */}
          {activeSection === 'create_listing' && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-900">+ Post New Property</h2>
                <p className="text-xs text-stone-500">
                  Exact address is encrypted at rest using AES-256-GCM and only unlocked after tenant deposit confirmation.
                </p>
              </div>

              <form onSubmit={handleCreateListing} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-stone-700 font-medium mb-1">Listing Title</label>
                    <input
                      type="text"
                      required
                      value={newListing.title}
                      onChange={e => setNewListing({ ...newListing, title: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Configuration</label>
                    <select
                      value={newListing.bhk}
                      onChange={e => setNewListing({ ...newListing, bhk: e.target.value as any })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                    >
                      <option value="1 RK">1 RK</option>
                      <option value="1 BHK">1 BHK</option>
                      <option value="2 BHK">2 BHK</option>
                      <option value="3 BHK">3 BHK</option>
                      <option value="4+ BHK">4+ BHK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">City</label>
                    <select
                      value={newListing.city}
                      onChange={e => setNewListing({ ...newListing, city: e.target.value as any })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                    >
                      <option value="Itanagar">Itanagar</option>
                      <option value="Naharlagun">Naharlagun</option>
                      <option value="Pasighat">Pasighat</option>
                      <option value="Tawang">Tawang</option>
                      <option value="Ziro">Ziro</option>
                      <option value="Roing">Roing</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between text-stone-900 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" /> Exact Physical Address (AES-256 Encrypted)
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">Encrypted at rest</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={newListing.fullAddressEncrypted}
                      onChange={e => setNewListing({ ...newListing, fullAddressEncrypted: e.target.value })}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-900 font-mono text-xs focus:outline-hidden focus:border-stone-900"
                    />
                    <p className="text-[11px] text-stone-500">
                      Hidden from public exploration. Revealed only to tenants who pay security deposit.
                    </p>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Monthly Rent (₹)</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={newListing.rentMonthly}
                      onChange={e => setNewListing({ ...newListing, rentMonthly: parseInt(e.target.value) || 0 })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Security Deposit (₹)</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={newListing.securityDeposit}
                      onChange={e => setNewListing({ ...newListing, securityDeposit: parseInt(e.target.value) || 0 })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Total Units in Complex</label>
                    <input
                      type="number"
                      min="1"
                      value={newListing.totalUnits}
                      onChange={e => setNewListing({ ...newListing, totalUnits: parseInt(e.target.value) || 1 })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-medium mb-1">Currently Occupied Units</label>
                    <input
                      type="number"
                      min="0"
                      value={newListing.occupiedUnits}
                      onChange={e => setNewListing({ ...newListing, occupiedUnits: parseInt(e.target.value) || 0 })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('dashboard')}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Publish Property to Operations Center
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* I. ACCOUNT & KYC PROFILE TAB                                         */}
          {/* ===================================================================== */}
          {activeSection === 'account_kyc' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-1.5 p-1 bg-stone-200/60 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAccountSubTab('dashboard')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    accountSubTab === 'dashboard'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Owner Account Hub
                </button>
                <button
                  type="button"
                  onClick={() => setAccountSubTab('kyc')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    accountSubTab === 'kyc'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  KYC &amp; Escrow Verification
                </button>
              </div>

              {accountSubTab === 'dashboard' ? (
                <AccountDashboard
                  currentUserId={currentOwnerId}
                  userRole="owner"
                  onNavigateToApplications={() => setActiveSection('applications')}
                  onNavigateToProperties={() => setActiveSection('properties')}
                />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-base font-bold text-stone-900">Verified Homeowner Identity</h3>
                      <p className="text-xs text-stone-500">PMLA and RBI Master Directions Compliant</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                      <span className="text-stone-500">PAN Identity (NSDL Verified)</span>
                      <div className="font-mono text-stone-900 font-bold">{ownerProfile.panMasked}</div>
                    </div>

                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 space-y-1">
                      <span className="text-stone-500">Aadhaar (UIDAI OTP Verified)</span>
                      <div className="font-mono text-stone-900 font-bold">{ownerProfile.aadhaarMasked}</div>
                    </div>

                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 space-y-1 sm:col-span-2">
                      <span className="text-stone-500">Owner Settlement &amp; Payout Account</span>
                      <div className="font-mono text-stone-900 font-bold">{ownerProfile.razorpayAccountId}</div>
                      <div className="text-[11px] text-emerald-700">
                        Direct automated settlement configured for {ownerProfile.bankAccountMasked}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* J. SETTINGS TAB                                                       */}
          {/* ===================================================================== */}
          {activeSection === 'settings' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Owner Preferences &amp; Payouts</h2>
                <p className="text-xs text-stone-500">
                  Manage settlement destination, compliance notifications, and tenancy defaults
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <span className="font-bold text-stone-900 block">Bank Account for Rent Remittance</span>
                  <div className="font-mono text-stone-700">{ownerProfile.bankAccountMasked}</div>
                  <p className="text-[11px] text-stone-500">
                    All tenant remittances are settled directly to your registered bank account with no brokerage charged to owners.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <span className="font-bold text-stone-900 block">Legal &amp; Tenancy Agreement</span>
                  <p className="text-[11px] text-stone-600">
                    Default lease tenure set to 11 months under the Arunachal Pradesh Model Tenancy Framework.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* K. HELP & SUPPORT TAB                                                 */}
          {/* ===================================================================== */}
          {activeSection === 'help_support' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-5">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Landlord Support &amp; Legal Desk</h2>
                <p className="text-xs text-stone-500">
                  Guidance on tenancy regulations, objective rejection criteria, and escrow security
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">Dedicated Property Care Helpline</span>
                  <p className="text-stone-600">+91 360 2212 990 · support@nivaspay.in</p>
                  <p className="text-[11px] text-stone-400">Monday to Saturday, 9:00 AM – 6:00 PM IST</p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-900 block">Anti-Discrimination &amp; DPDP Safeguards</span>
                  <p className="text-stone-600">
                    Under Indian law and NivasPay fair housing policies, rejections must be grounded in objective criteria (pets, occupancy limits, verified income). Religion or community reasons are prohibited.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MANAGE PROPERTY MODAL (Interactive Unit & Property Management)        */}
      {/* ========================================================================= */}
      {managingProperty && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleRequestCloseManageModal();
            }
          }}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-mono text-stone-400">Property #{managingProperty.id}</span>
                <h4 className="text-lg font-bold text-stone-900">{managingProperty.title}</h4>
              </div>
              <button
                onClick={handleRequestCloseManageModal}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer"
                title="Close property management"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Location</span>
                <div className="font-semibold text-stone-900 mt-0.5">{managingProperty.locality}, {managingProperty.city}</div>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Configuration</span>
                <div className="font-semibold text-stone-900 mt-0.5">{managingProperty.bhk} · {managingProperty.propertyType}</div>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Monthly Rent</span>
                <div className="font-bold text-stone-900 mt-0.5 font-mono">₹{managingProperty.rentMonthly.toLocaleString('en-IN')}/mo</div>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Security Deposit</span>
                <div className="font-bold text-stone-900 mt-0.5 font-mono">₹{managingProperty.securityDeposit.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* 6-Month Mini Occupancy Trend Line Chart (Recharts) */}
            <PropertyMiniOccupancyTrendChart property={managingProperty} />

            {/* Units list with Multi-Select Checkboxes & Bulk Actions */}
            {(() => {
              const propertyUnits = backendService.getPropertyUnits(managingProperty);
              const allSelected = propertyUnits.length > 0 && propertyUnits.every(u => selectedUnitIds.has(u.id));
              const selectedCount = selectedUnitIds.size;

              const handleToggleUnitSelection = (unitId: string) => {
                setSelectedUnitIds(prev => {
                  const next = new Set(prev);
                  if (next.has(unitId)) {
                    next.delete(unitId);
                  } else {
                    next.add(unitId);
                  }
                  return next;
                });
              };

              const handleToggleSelectAll = () => {
                if (allSelected) {
                  setSelectedUnitIds(new Set());
                } else {
                  setSelectedUnitIds(new Set(propertyUnits.map(u => u.id)));
                }
              };

              const handleBulkStatusChange = (newStatus: 'available' | 'maintenance' | 'occupied') => {
                if (selectedCount === 0) return;
                try {
                  const res = backendService.updatePropertyUnitsBulk(
                    managingProperty.id,
                    Array.from(selectedUnitIds),
                    newStatus,
                    newStatus === 'maintenance' ? 'Scheduled maintenance via owner portal' : undefined
                  );
                  setManagingProperty({ ...res.listing });
                  setSelectedUnitIds(new Set());
                  setUnitBulkActionMessage(
                    `Successfully marked ${res.updatedCount} ${res.updatedCount === 1 ? 'unit' : 'units'} as ${newStatus.toUpperCase()}`
                  );
                  setTimeout(() => setUnitBulkActionMessage(null), 3000);
                  setRefreshTrigger(prev => prev + 1);
                } catch (err: any) {
                  alert(err.message);
                }
              };

              return (
                <div className="space-y-3 pt-3 border-t border-stone-200">
                  {/* Header & Select All Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">Unit Roster &amp; Inventory</span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {propertyUnits.filter(u => u.status === 'occupied').length} / {propertyUnits.length} Occupied
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        Select multiple units to perform batch status updates
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer text-left sm:text-right"
                    >
                      {allSelected ? 'Deselect All Units' : `Select All (${propertyUnits.length})`}
                    </button>
                  </div>

                  {/* Bulk Actions Floating Toolbar */}
                  {selectedCount > 0 && (
                    <div className="p-3 bg-stone-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-md animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-stone-950 font-bold flex items-center justify-center text-[10px]">
                          {selectedCount}
                        </span>
                        <span className="font-medium">
                          {selectedCount} {selectedCount === 1 ? 'unit selected' : 'units selected'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange('available')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Set as Available</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange('maintenance')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Mark as Maintenance</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange('occupied')}
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-[11px] transition-colors cursor-pointer"
                        >
                          Mark Occupied
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedUnitIds(new Set())}
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 border border-stone-700/80"
                          title="Clear current unit selection"
                        >
                          <RotateCcw className="w-3 h-3 text-stone-400" />
                          <span>Clear Selection</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Success notification */}
                  {unitBulkActionMessage && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{unitBulkActionMessage}</span>
                    </div>
                  )}

                  {/* Units List with individual checkboxes */}
                  <div className="space-y-2">
                    {propertyUnits.map((unit, idx) => {
                      const isSelected = selectedUnitIds.has(unit.id);
                      const isUnitOccupied = unit.status === 'occupied';
                      const isMaintenance = unit.status === 'maintenance';
                      const occupancyHistory = backendService.getPropertyOccupancyHistory(managingProperty);
                      const latestRate = occupancyHistory[occupancyHistory.length - 1]?.occupancyRate || 0;

                      return (
                        <div
                          key={unit.id}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/50'
                              : 'bg-stone-50/70 border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox input */}
                            <label className="flex items-center gap-2 cursor-pointer mt-0.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleUnitSelection(unit.id)}
                                className="w-4 h-4 rounded-md text-emerald-600 border-stone-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                              />
                            </label>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-900">
                                  {unit.unitNumber}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                                    isUnitOccupied
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isMaintenance
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-stone-200 text-stone-700'
                                  }`}
                                >
                                  {unit.status}
                                </span>
                                {unit.floor && (
                                  <span className="text-[10px] text-stone-400 font-mono">Floor {unit.floor}</span>
                                )}
                              </div>
                              <div className="text-[10px] text-stone-500 mt-0.5">
                                {managingProperty.bhk} &bull; {managingProperty.propertyType} &bull; ₹{managingProperty.rentMonthly.toLocaleString('en-IN')}/mo
                              </div>
                              {unit.maintenanceNotes && (
                                <div className="text-[10px] text-amber-700 mt-1 italic">
                                  Notice: {unit.maintenanceNotes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Individual Actions & Mini Sparkline */}
                          <div className="flex items-center gap-2 justify-between sm:justify-end">
                            <div className="flex items-center gap-1">
                              {unit.status !== 'available' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    backendService.updatePropertyUnitsBulk(managingProperty.id, [unit.id], 'available');
                                    setManagingProperty({ ...managingProperty });
                                    setRefreshTrigger(prev => prev + 1);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-[10px] font-medium cursor-pointer"
                                >
                                  Available
                                </button>
                              )}
                              {unit.status !== 'maintenance' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    backendService.updatePropertyUnitsBulk(
                                      managingProperty.id,
                                      [unit.id],
                                      'maintenance',
                                      'Individual maintenance scheduled'
                                    );
                                    setManagingProperty({ ...managingProperty });
                                    setRefreshTrigger(prev => prev + 1);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-medium cursor-pointer"
                                >
                                  Maintenance
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-stone-200 shadow-2xs">
                              <div className="text-right">
                                <div className="text-[9px] text-stone-400 font-medium">Occupancy</div>
                                <div className="text-[10px] font-mono font-bold text-emerald-700">
                                  {latestRate}%
                                </div>
                              </div>
                              <div className="w-16 h-6">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={occupancyHistory} margin={{ top: 2, right: 2, left: -25, bottom: 0 }}>
                                    <YAxis domain={[0, 100]} hide />
                                    <Line
                                      type="monotone"
                                      dataKey="occupancyRate"
                                      stroke="#059669"
                                      strokeWidth={1.5}
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="pt-3">
              <button
                type="button"
                onClick={handleRequestCloseManageModal}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3.1 CLEAR SELECTION CONFIRMATION DIALOG (When closing with units selected)*/}
      {/* ========================================================================= */}
      {showClearSelectionConfirm && managingProperty && (
        <div
          className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-selection-dialog-title"
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-stone-200 text-stone-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200/80 flex items-center justify-center shrink-0 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h4 id="clear-selection-dialog-title" className="text-base font-bold text-stone-900">
                  Clear Unit Selection?
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  You currently have <strong className="text-stone-900 font-semibold">{selectedUnitIds.size} {selectedUnitIds.size === 1 ? 'unit' : 'units'} selected</strong> in the bulk action queue for <span className="font-medium text-stone-800">{managingProperty.title}</span>. Closing this modal will discard your active selection.
                </p>
              </div>
            </div>

            {/* Selected Units Preview Chips */}
            <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
                <span>Selected units to be cleared:</span>
                <span className="font-mono text-[10px] text-stone-400 font-bold">{selectedUnitIds.size} total</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {Array.from(selectedUnitIds).map(id => {
                  const u = backendService.getPropertyUnits(managingProperty).find(unit => unit.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-stone-800 border border-stone-200 rounded-lg text-[10px] font-mono font-medium shadow-2xs"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {u?.unitNumber || id}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowClearSelectionConfirm(false)}
                className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Keep Selection &amp; Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedUnitIds(new Set());
                  setShowClearSelectionConfirm(false);
                  setManagingProperty(null);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Selection &amp; Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. APPLICANT DOSSIER MODAL                                                */}
      {/* ========================================================================= */}
      {inspectingAppId && reviewPayload && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-mono text-stone-400">Application #{reviewPayload.application.id}</span>
                <h4 className="text-lg font-bold text-stone-900">Tenant Applicant Dossier</h4>
              </div>
              <button
                onClick={() => setInspectingAppId(null)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Name</span>
                <div className="font-semibold text-stone-900 mt-0.5">{reviewPayload.customerProfile.name}</div>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Age &amp; Gender</span>
                <div className="font-semibold text-stone-900 mt-0.5">
                  {reviewPayload.customerProfile.age} yrs · {reviewPayload.customerProfile.gender}
                </div>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Occupation</span>
                <div className="font-semibold text-stone-900 mt-0.5">{reviewPayload.customerProfile.occupation}</div>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                <span className="text-stone-500">Family Size</span>
                <div className="font-semibold text-stone-900 mt-0.5">{reviewPayload.customerProfile.familySize} members</div>
              </div>
            </div>

            {/* Sensitive Demographics DPDP Protection Box */}
            <div className="p-4 bg-stone-100 rounded-xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-900 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-stone-600" /> DPDP Protected Demographics
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                    reviewPayload.customerProfile.consentShareReligionTribe
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {reviewPayload.customerProfile.consentShareReligionTribe ? 'Consent Granted' : 'Withheld / Redacted'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">Religion:</span>
                  <span className="font-semibold">{reviewPayload.customerProfile.religion}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[10px]">Community:</span>
                  <span className="font-semibold">{reviewPayload.customerProfile.tribe}</span>
                </div>
              </div>
            </div>

            {/* Decision Actions */}
            {reviewPayload.application.status === 'pending' || reviewPayload.application.status === 'under_review' ? (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="w-1/2 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Decline Application
                </button>
                <button
                  type="button"
                  onClick={() => handleAccept(reviewPayload.application.id)}
                  className="w-1/2 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                >
                  Accept Application
                </button>
              </div>
            ) : reviewPayload.application.status === 'rejected' ? (
              <div className="space-y-3 pt-1">
                {/* Notification Delivery & Provider Status Breakdown */}
                {(() => {
                  const notif = reviewPayload.application.notificationStatus || {
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
                    ? 'Notice was delivered with confirmed provider verification receipts.'
                    : bothSent
                    ? 'Dispatched to applicant registered email and mobile channels.'
                    : isSimulated
                    ? 'Development simulation: recorded in dev mode; live gateways were not contacted.'
                    : isQueued
                    ? 'Queued for provider dispatch.'
                    : isFailed
                    ? 'Provider dispatch failed; in-app record preserved.'
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
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Application Declined
                        </span>
                        <span className="flex items-center gap-1 text-[10px] bg-white px-2 py-0.5 rounded-full border border-rose-200 text-rose-800 font-medium">
                          <Mail className="w-3 h-3 text-stone-500" />
                          <Phone className="w-3 h-3 text-stone-500" />
                          {badgeText}
                        </span>
                      </div>

                      <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                        {summaryText}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-rose-200/60">
                        {renderChannelStatus('In-App', notif.inAppStatus || 'RECORDED')}
                        {renderChannelStatus('Email', notif.emailStatus, notif.emailDelivered)}
                        {renderChannelStatus('SMS', notif.smsStatus, notif.smsDelivered)}
                      </div>

                      <div className="pt-2 border-t border-rose-200/60 text-xs space-y-1">
                        <div className="flex justify-between text-stone-700">
                          <span className="font-medium">Stated Reason:</span>
                          <span className="font-semibold capitalize text-stone-900">
                            {reviewPayload.application.rejectedReasonCode?.replace(/_/g, ' ') || 'Objective Property Constraint'}
                          </span>
                        </div>
                        {reviewPayload.application.rejectedReasonExplanation && (
                          <div className="p-2 bg-white rounded-lg border border-rose-200/60 text-[11px] text-stone-600 italic">
                            "{reviewPayload.application.rejectedReasonExplanation}"
                          </div>
                        )}
                        <div className="text-[10px] text-stone-500 flex justify-between pt-1">
                          <span>App Fee: ₹20 (Applied)</span>
                          <span>Brokerage: ₹0</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center text-xs text-stone-600">
                Application status is <strong className="uppercase font-mono text-stone-900">{reviewPayload.application.status}</strong>.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REJECTION MODAL (Permissible Grounds Enforcement)                      */}
      {/* ========================================================================= */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 border border-stone-200 shadow-2xl text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h4 className="text-base font-bold text-stone-900">Select Permissible Rejection Reason</h4>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              {/* NivasPay Transparency Standards Notice */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-amber-950">
                <div className="font-semibold flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>Notification Architecture & Transparency</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Per NivasPay transparency standards, declining an application records an objective non-discriminatory reason, confirms ₹0 brokerage charged, and provides DPDP Act grievance contacts. In this development stage, <strong>Email and SMS alerts are not yet configured</strong>; the in-app decision record will be logged immediately.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Permitted Objective Reason Code:
                </label>
                <select
                  value={selectedReasonCode}
                  onChange={e => setSelectedReasonCode(e.target.value as RejectionReasonCode)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                >
                  <option value="pets">Pet Policy Restriction (Building rules prohibit pets)</option>
                  <option value="family_size">Occupancy Limit Exceeded (Unit capacity constraint)</option>
                  <option value="occupation">Corporate / Work Profile Alignment</option>
                  <option value="budget_deposit_mismatch">Budget / Security Deposit Timeline Mismatch</option>
                  <option value="incomplete_profile">Incomplete Verification Dossier</option>
                  <option value="other">Other Objective Tenancy Constraint</option>
                </select>
                <p className="text-[10px] text-stone-500 mt-1">
                  Rejections based on religion, caste, community, or demographic identity violate Section 9 DPDP Act and Housing Fairness standards.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Explanation Notes (Included in Tenancy Dossier):
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionNotes}
                  onChange={e => setRejectionNotes(e.target.value)}
                  placeholder="Provide clear objective context (e.g. resident association restricts pets over 15kg; move-in date earlier than required)..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-hidden focus:border-stone-900"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Decline &amp; Record Decision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Remittance Voucher Modal */}
      {selectedRemittanceForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">Rental Remittance Voucher</h3>
                  <p className="text-[11px] text-stone-500 font-mono">Ref: {selectedRemittanceForDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRemittanceForDetail(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Official Settlement Badge */}
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider block">
                  Net Disbursed to Owner
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-900 tabular-nums">
                  ₹{selectedRemittanceForDetail.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-200/70 text-emerald-900 text-xs font-bold font-mono">
                {selectedRemittanceForDetail.status.toUpperCase()}
              </span>
            </div>

            {/* Itemized Breakdown Grid */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Property:</span>
                <span className="font-bold text-stone-900 text-right">{selectedRemittanceForDetail.propertyName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Date &amp; Time:</span>
                <span className="font-mono text-stone-800">
                  {new Date(selectedRemittanceForDetail.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Gross Rent Collected:</span>
                <span className="font-mono font-semibold text-stone-900">
                  ₹{selectedRemittanceForDetail.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Owner Brokerage Fee:</span>
                <span className="font-mono text-emerald-700 font-semibold">₹0.00 (Zero Owner Brokerage)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Platform Technology Deductions:</span>
                <span className="font-mono text-emerald-700 font-semibold">₹0.00</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500">Settlement Route:</span>
                <span className="font-medium text-stone-800">
                  {selectedRemittanceForDetail.gateway === 'razorpay_route'
                    ? 'Razorpay Route (Direct IMPS)'
                    : 'UPI Direct Escrow'}
                </span>
              </div>
              {selectedRemittanceForDetail.razorpayPaymentId && (
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-500">Gateway Transaction ID:</span>
                  <span className="font-mono text-stone-700">{selectedRemittanceForDetail.razorpayPaymentId}</span>
                </div>
              )}
            </div>

            {/* Compliance notice */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] text-stone-500 leading-relaxed">
              <span className="font-semibold text-stone-700 block mb-0.5">NivasPay Sovereign Escrow Guarantee:</span>
              Rental proceeds are collected via authenticated client rails and remitted 100% to the verified owner bank account without broker commissions or deductions.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRemittanceForDetail(null)}
                className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {actionToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-stone-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-stone-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            {actionToast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : actionToast.type === 'info' ? (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="leading-snug">{actionToast.message}</span>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="text-stone-400 hover:text-white cursor-pointer ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
