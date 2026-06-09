import { useEffect, useState } from 'react';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  getBalance,
  getHistory,
  withdrawFunds,
  transferFunds,
  createPaymentIntent,
  depositFunds,
  searchEntrepreneurs,
} from '../services/transactionAPI';
import { useAuth } from '../context/AuthContext';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Transaction {
  _id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  sender: { name: string; email: string };
  recipient?: { name: string; email: string };
  description: string;
  createdAt: string;
}

interface Entrepreneur {
  _id: string;
  name: string;
  email: string;
}

// ─── Stripe Deposit Form ──────────────────────────────────────────────────────
const DepositForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDeposit = async () => {
    if (!stripe || !elements) return;
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return setMessage('Enter a valid amount (min $1)');

    setLoading(true);
    setMessage('');

    try {
      const { data } = await createPaymentIntent(amt);
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) return;

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        setMessage(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
  await import('../services/transactionAPI').then(({ depositFunds }) => 
    depositFunds(amt, 'Wallet deposit via Stripe')
  );       setMessage('✅ Deposit successful! Balance will update shortly.');
        setAmount('');
        setTimeout(onSuccess, 2000);
      }
    } catch {
      setMessage('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="border border-gray-300 rounded-lg px-4 py-3 bg-white">
          <CardElement options={{ style: { base: { fontSize: '16px', color: '#374151' } } }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">Test card: 4242 4242 4242 4242 · Any future date · Any CVC</p>
      </div>
      {message && (
        <p className={`text-sm font-medium ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
      <button
        onClick={handleDeposit}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Deposit Funds'}
      </button>
    </div>
  );
};

// ─── Main Wallet Page ─────────────────────────────────────────────────────────
const WalletPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  console.log('WalletPage:', { user, isAuthenticated, authLoading });
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [loading, setLoading] = useState(true);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDesc, setWithdrawDesc] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Transfer state (investor only)
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Entrepreneur[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Entrepreneur | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferMsg, setTransferMsg] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchData = async (page = 1) => {
    try {
      const [balRes, histRes] = await Promise.all([getBalance(), getHistory(page)]);
      setBalance(balRes.data.walletBalance);
      setTransactions(histRes.data.transactions);
      setPagination(histRes.data.pagination);
    } catch {
      console.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ✅ FIXED: Entrepreneur search — properly reads axios response
  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await searchEntrepreneurs(search);
        console.log('Search result:', res.data); // debug log
        setSearchResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 1) return setWithdrawMsg('Enter a valid amount (min $1)');
    // ✅ Frontend balance check for withdraw
    if (amt > balance) return setWithdrawMsg(`Insufficient balance. Your balance is $${balance.toFixed(2)}`);
    setWithdrawLoading(true);
    setWithdrawMsg('');
    try {
      await withdrawFunds(amt, withdrawDesc);
      setWithdrawMsg('✅ Withdrawal successful!');
      setWithdrawAmount('');
      setWithdrawDesc('');
      setTimeout(() => { setWithdrawMsg(''); fetchData(); }, 1500);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setWithdrawMsg(error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedRecipient) return setTransferMsg('Select a recipient');
    const amt = parseFloat(transferAmount);
    if (!amt || amt < 1) return setTransferMsg('Enter a valid amount (min $1)');
    // ✅ Frontend balance check for transfer
    if (amt > balance) return setTransferMsg(`Insufficient balance. Your balance is $${balance.toFixed(2)}`);
    setTransferLoading(true);
    setTransferMsg('');
    try {
      await transferFunds(selectedRecipient._id, amt, transferDesc);
      setTransferMsg(`✅ $${amt} transferred to ${selectedRecipient.name}!`);
      setTransferAmount('');
      setTransferDesc('');
      setSelectedRecipient(null);
      setSearch('');
      setTimeout(() => { setTransferMsg(''); fetchData(); }, 1500);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setTransferMsg(error.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[status] || ''}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const typeIcon = (type: string) => {
    if (type === 'deposit') return '⬇️';
    if (type === 'withdraw') return '⬆️';
    return '↔️';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
        <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Wallet Balance</p>
        <h1 className="text-5xl font-bold mt-2">${balance.toFixed(2)}</h1>
        <p className="text-blue-200 mt-2 text-sm">{user?.name} · {user?.role}</p>
      </div>

      {/* Action Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['deposit', 'withdraw', ...(user?.role === 'investor' ? ['transfer'] : [])] as ('deposit' | 'withdraw' | 'transfer')[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'deposit' ? '⬇️ Deposit' : tab === 'withdraw' ? '⬆️ Withdraw' : '↔️ Transfer'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <Elements stripe={stripePromise}>
              <DepositForm onSuccess={fetchData} />
            </Elements>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                <input
                  type="number" min="1" value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text" value={withdrawDesc}
                  onChange={(e) => setWithdrawDesc(e.target.value)}
                  placeholder="Reason for withdrawal"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {withdrawMsg && (
                <p className={`text-sm font-medium ${withdrawMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                  {withdrawMsg}
                </p>
              )}
              <button
                onClick={handleWithdraw} disabled={withdrawLoading}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {withdrawLoading ? 'Processing...' : 'Withdraw Funds'}
              </button>
            </div>
          )}

          {/* Transfer Tab — investor only */}
          {activeTab === 'transfer' && user?.role === 'investor' && (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Entrepreneur</label>
                {selectedRecipient ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-blue-700">{selectedRecipient.name}</span>
                    <button
                      onClick={() => { setSelectedRecipient(null); setSearch(''); }}
                      className="text-blue-400 hover:text-blue-600 text-xs"
                    >
                      ✕ Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text" value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setTransferMsg(''); // clear error when typing
                      }}
                      placeholder="Type entrepreneur name..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
                        {searchResults.map((e) => (
                          <button
                            key={e._id}
                            onClick={() => {
                              setSelectedRecipient(e);
                              setSearch('');
                              setSearchResults([]);
                              setTransferMsg(''); // clear "select a recipient" error
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                          >
                            <p className="font-medium text-gray-800">{e.name}</p>
                            <p className="text-gray-400 text-xs">{e.email}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                <input
                  type="number" min="1" value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="Investment amount"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text" value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Investment note"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {transferMsg && (
                <p className={`text-sm font-medium ${transferMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                  {transferMsg}
                </p>
              )}
              <button
                onClick={handleTransfer} disabled={transferLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {transferLoading ? 'Transferring...' : 'Send Investment'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
          <p className="text-sm text-gray-400">{pagination.total} total transactions</p>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">💳</p>
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm">Make your first deposit to get started</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <div key={tx._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{typeIcon(tx.type)}</span>
                    <div>
                      <p className="font-medium text-gray-800 capitalize">{tx.type}</p>
                      <p className="text-xs text-gray-400">
                        {tx.description || '—'} · {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                      {tx.recipient && (
                        <p className="text-xs text-indigo-500">→ {tx.recipient.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className={`font-bold text-lg ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    {statusBadge(tx.status)}
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => fetchData(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >← Prev</button>
                <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
                <button
                  onClick={() => fetchData(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WalletPage;