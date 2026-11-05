import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  RotateCcw,
  Eye,
  RefreshCw,
  Printer
} from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserRole, TransactionReversalRequest, ReversalReceiptPayload } from '../../types';
import { AdminReviewReversalModal } from '../modals/AdminReviewReversalModal';
import { ReversalReceiptModal } from '../modals/ReversalReceiptModal';

export const TransactionReversalsView: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TransactionReversalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<TransactionReversalRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [selectedReceiptPayload, setSelectedReceiptPayload] = useState<ReversalReceiptPayload | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const isAdmin = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.HEAD_TEACHER
  ].includes(user?.role as UserRole);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.transactionType = typeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiService.listTransactionReversals(params);
      if (res.success && Array.isArray(res.data)) {
        setRequests(res.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load reversal requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter(
      r =>
        r.requestReference.toLowerCase().includes(q) ||
        r.transactionReference.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.admissionNumber.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'PENDING_ADMIN_APPROVAL').length,
      completed: requests.filter(r => r.status === 'COMPLETED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      failed: requests.filter(r => r.status === 'FAILED').length
    };
  }, [requests]);

  const handleOpenReview = (req: TransactionReversalRequest) => {
    setSelectedRequestForReview(req);
    setIsReviewModalOpen(true);
  };

  const handleOpenReceipt = async (req: TransactionReversalRequest) => {
    if (req.reversalReceiptPayload) {
      setSelectedReceiptPayload(req.reversalReceiptPayload);
      setIsReceiptModalOpen(true);
    } else if (req.reversalReceiptNumber) {
      try {
        const res = await apiService.getReversalReceiptDocument(req.reversalReceiptNumber);
        if (res.success && res.data?.receipt) {
          setSelectedReceiptPayload(res.data.receipt);
          setIsReceiptModalOpen(true);
        }
      } catch (err) {
        console.error('Failed to load reversal receipt:', err);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN_APPROVAL':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            Pending Approval
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            Reversed & Settled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 mr-1 text-red-600" />
            Rejected
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" />
            Execution Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Transaction Reversal Requests</h2>
            <p className="text-xs text-slate-500">
              Admin-approved reversal governance &bull; Bursar submission with complete audit trail
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-semibold opacity-80 block">Total Requests</span>
          <span className="text-2xl font-bold">{counts.all}</span>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING_ADMIN_APPROVAL')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'PENDING_ADMIN_APPROVAL'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className="text-xs font-semibold opacity-80 block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Pending Admin Review
          </span>
          <span className="text-2xl font-bold text-amber-600">{counts.pending}</span>
        </div>

        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-xs font-semibold opacity-80 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed Reversals
          </span>
          <span className="text-2xl font-bold text-emerald-600">{counts.completed}</span>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-white text-slate-800 border-slate-200 hover:border-red-300'
          }`}
        >
          <span className="text-xs font-semibold opacity-80 block flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-400" /> Rejected Requests
          </span>
          <span className="text-2xl font-bold text-red-600">{counts.rejected}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search learner, ref, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white font-medium"
          >
            <option value="ALL">All Types</option>
            <option value="PAYMENT">Original Payment</option>
            <option value="CREDIT_UTILIZATION">Credit Utilization</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
            <span>Loading transaction reversal requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No reversal requests found</p>
            <p className="text-xs text-slate-400 mt-1">
              Eligible transactions can be submitted for reversal from the Learner Fee Position desk.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Request Ref</th>
                  <th className="px-4 py-3">Learner</th>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Bursar Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-900 block">
                        {req.requestReference}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(req.requestedAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-900 block">{req.studentName}</span>
                      <span className="text-[11px] text-slate-500">Adm: {req.admissionNumber}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase mb-0.5">
                        {req.transactionType.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 block">
                        {req.originalReceiptNumber || req.transactionReference}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                      KES {Number(req.originalAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-700 italic">"{req.reason}"</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        By: {req.requestedByName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(req.status)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {req.status === 'PENDING_ADMIN_APPROVAL' ? (
                        isAdmin ? (
                          <button
                            onClick={() => handleOpenReview(req)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition shadow-xs inline-flex items-center space-x-1"
                          >
                            <span>Review & Decide</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReview(req)}
                            className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-xs rounded-lg border border-amber-200 transition"
                          >
                            View Details
                          </button>
                        )
                      ) : req.status === 'COMPLETED' ? (
                        <button
                          onClick={() => handleOpenReceipt(req)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded-lg border border-emerald-200 transition inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reversal Doc</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenReview(req)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs rounded-lg transition"
                        >
                          View Audit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AdminReviewReversalModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedRequestForReview(null);
        }}
        onSuccess={(receipt) => {
          fetchRequests();
          if (receipt) {
            setSelectedReceiptPayload(receipt);
            setIsReceiptModalOpen(true);
          }
        }}
        request={selectedRequestForReview}
      />

      {/* Reversal Receipt Document Modal */}
      <ReversalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceiptPayload(null);
        }}
        receipt={selectedReceiptPayload}
      />
    </div>
  );
};
