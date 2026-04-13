import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

/**
 * Hosted SumUp payment page.
 * URL: /pay/:checkoutId  OR  /pay?checkout_id=xxx
 *
 * Loads SumUp's JS widget so the customer can enter card details.
 * Works on any browser / mobile phone — no SumUp app required.
 */
export default function SumUpPayPage() {
  const { checkoutId: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const checkoutId = paramId || searchParams.get('checkout_id');

  const mountRef = useRef(false);
  const [status, setStatus] = useState('loading'); // loading | ready | paid | failed | error
  const [errorMsg, setErrorMsg] = useState('');

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
              setStatus('paid');
            } else if (type === 'error') {
              setErrorMsg(body?.message || 'Payment failed');
              setStatus('failed');
            }
          },
          onLoad: () => {
            setStatus('ready');
          },
        });
        mountRef.current = true;
      } catch (e) {
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
      document.head.removeChild(script);
    };
  }, [checkoutId]);

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

      {/* Widget container */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden min-h-[200px]">
        {status === 'loading' && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div id="sumup-card-container" className={status === 'loading' ? 'hidden' : ''} />
      </div>

      {/* Paid state */}
      {status === 'paid' && (
        <div className="mt-6 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-3xl">✓</span>
          </div>
          <p className="text-green-400 text-xl font-bold">Payment successful!</p>
          <p className="text-gray-400 text-sm mt-1">You can close this page.</p>
        </div>
      )}

      {/* Error / failed state */}
      {(status === 'failed' || status === 'error') && (
        <div className="mt-6 text-center max-w-sm">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-3xl">✕</span>
          </div>
          <p className="text-red-400 text-xl font-bold">Payment failed</p>
          <p className="text-gray-400 text-sm mt-2">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
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
