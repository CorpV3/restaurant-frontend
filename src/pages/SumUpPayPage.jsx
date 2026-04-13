import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function SumUpPayPage() {
  const { checkoutId: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const checkoutId = paramId || searchParams.get('checkout_id');

  const mountRef = useRef(false);
  const pollRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | verifying | paid | failed | error
  const [errorMsg, setErrorMsg] = useState('');

  // Poll our payment-service for real status
  const pollStatus = useCallback(() => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/v1/payments/sumup/checkout/${checkoutId}/status`);
        const data = await res.json();
        if (data.paid || data.status === 'PAID') {
          clearInterval(pollRef.current);
          setStatus('paid');
        } else if (data.status === 'FAILED' || attempts >= 10) {
          clearInterval(pollRef.current);
          setErrorMsg('Payment was not completed. Please try again.');
          setStatus('failed');
        }
      } catch {
        // keep polling
      }
    }, 2000);
  }, [checkoutId]);

  useEffect(() => {
    if (!checkoutId || mountRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';
    script.async = true;
    script.onload = () => {
      setStatus('ready');
      try {
        window.SumUpCard.mount({
          id: 'sumup-card-container',
          checkoutId,
          donateSubmitButton: false,
          showInstallments: false,
          onResponse: (type, body) => {
            if (type === 'sent') {
              // Widget submitted — now poll the API for real result
              setStatus('verifying');
              pollStatus();
            } else if (type === 'error') {
              setErrorMsg(body?.message || 'Payment failed');
              setStatus('failed');
            }
          },
          onLoad: () => setStatus('ready'),
        });
        mountRef.current = true;
      } catch {
        setErrorMsg('Could not load payment widget');
        setStatus('error');
      }
    };
    script.onerror = () => {
      setErrorMsg('Could not reach SumUp servers');
      setStatus('error');
    };
    document.head.appendChild(script);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      try { document.head.removeChild(script); } catch {}
    };
  }, [checkoutId, pollStatus]);

  if (!checkoutId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center text-red-400">
          <p className="text-lg font-semibold">Invalid payment link</p>
          <p className="text-sm text-gray-400 mt-1">No checkout ID provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-sm mb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-3">
          <span>🔒</span> Secure Payment
        </div>
        <h1 className="text-white text-xl font-bold">Pay with Card</h1>
        <p className="text-gray-400 text-sm mt-1">Powered by SumUp</p>
      </div>

      {/* Widget — hide when verifying/paid/failed */}
      <div className={`w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden min-h-[200px] ${['paid','failed','error','verifying'].includes(status) ? 'hidden' : ''}`}>
        {status === 'loading' && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div id="sumup-card-container" />
      </div>

      {/* Verifying */}
      {status === 'verifying' && (
        <div className="text-center space-y-3">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white font-medium text-lg">Verifying payment...</p>
          <p className="text-gray-400 text-sm">Please wait</p>
        </div>
      )}

      {/* Paid */}
      {status === 'paid' && (
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-white text-3xl">✓</span>
          </div>
          <p className="text-green-400 text-xl font-bold">Payment successful!</p>
          <p className="text-gray-400 text-sm">You can close this page.</p>
        </div>
      )}

      {/* Failed / Error */}
      {(status === 'failed' || status === 'error') && (
        <div className="text-center max-w-sm space-y-3">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
            <span className="text-white text-3xl">✕</span>
          </div>
          <p className="text-red-400 text-xl font-bold">Payment failed</p>
          <p className="text-gray-400 text-sm">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      )}

      <p className="mt-6 text-gray-600 text-xs text-center max-w-xs">
        Your card details are processed securely by SumUp. We never store your card information.
      </p>
    </div>
  );
}
