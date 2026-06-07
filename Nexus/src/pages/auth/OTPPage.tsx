import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export const OTPPage: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const setUserFromOTP = (auth as unknown as { setUserFromOTP: (user: unknown, token: string) => void }).setUserFromOTP;

  // Email aur role login page se aayega
  const { email, role } = (location.state as { email: string; role: string }) || {};

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }
    // Auto-send OTP on page load
    sendOTP();
    inputRefs.current[0]?.focus();
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer === 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendOTP = async () => {
    try {
      await API.post('/otp/send', { email });
    } catch {
      setError('Failed to send OTP. Please try again.');
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    setResendTimer(30);
    await sendOTP();
    setMessage('OTP resent to your email!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only numbers
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only last digit
    setOtp(newOtp);
    setError('');

    // Auto-move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) return setError('Please enter the complete 6-digit OTP');

    setIsLoading(true);
    setError('');

    try {
      const res = await API.post('/otp/verify', { email, otp: otpString });
      const { token, user } = res.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Update AuthContext
      setUserFromOTP(user, token);

      setMessage('✅ Verified! Redirecting...');
      setTimeout(() => {
        navigate(`/dashboard/${role}`);
      }, 1000);

    } catch (err) {
  const error = err as { response?: { data?: { message?: string } } };
  setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
}
 finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-md flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verify your identity
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We sent a 6-digit code to
        </p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <Mail size={16} className="text-primary-600" />
          <p className="text-center text-sm font-semibold text-primary-600">{email}</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

          {error && (
            <div className="mb-4 bg-red-50 border border-red-500 text-red-700 px-4 py-3 rounded-md flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 bg-green-50 border border-green-500 text-green-700 px-4 py-3 rounded-md text-sm text-center">
              {message}
            </div>
          )}

          {/* OTP Input Boxes */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none transition-colors ${
                  digit
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 text-gray-900'
                } focus:border-primary-500`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={isLoading || otp.join('').length < 6}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </button>

          {/* Resend */}
          <div className="mt-4 text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-500">
                Resend OTP in <span className="font-semibold text-primary-600">{resendTimer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Resend OTP
              </button>
            )}
          </div>

          {/* Back to login */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to login
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};