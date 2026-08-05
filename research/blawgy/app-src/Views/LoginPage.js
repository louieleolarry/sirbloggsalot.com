import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ensureUserInDatabase } from '../utils/userUtils';
import { useBranding } from '../contexts/BrandingContext';
import apiClient from '../utils/apiClient';
import { friendlyAuthError } from '../utils/firebaseErrors';

function LoginComponent() {
  // Partner logo on a white-label host, Blawgy's everywhere else.
  const { logo, name: brandName } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = getAuth();
  const { setAuthToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle magic link sign-in on page load
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Please provide your email for confirmation');
      }
      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(async (result) => {
            localStorage.removeItem('emailForSignIn');
            const user = result.user;
            await ensureUserInDatabase(user.email);
            const token = await user.getIdToken();
            localStorage.setItem('authToken', token);
            setAuthToken(token);
            try {
              await apiClient.post('/api/login/track-login', {
                email: user.email,
                method: 'magic_link'
              });
            } catch (trackError) {
              console.error('Failed to track login:', trackError);
            }
            navigate('/dashboard');
          })
          .catch((error) => {
            console.error('Magic link sign-in error:', error);
            setError(friendlyAuthError(error, "We couldn't sign you in with that link. It may have expired. Please request a new one."));
          });
      }
    }
  }, [auth, navigate, setAuthToken]);

  const validateEmail = (input) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(input);
  };

  const validatePassword = (input) => {
    return input.length >= 6;
  };

  const openForgotModal = () => {
    setForgotEmail(email);
    setForgotMessage('');
    setForgotError('');
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotMessage('');
    setForgotError('');
  };

  const handlePasswordReset = async () => {
    if (!validateEmail(forgotEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      // Check if user signed up with Google only
      const methods = await fetchSignInMethodsForEmail(auth, forgotEmail);
      if (methods.length > 0 && !methods.includes('password')) {
        if (methods.includes('google.com')) {
          setForgotError('This account uses Google sign-in. Please use the "Log in with Google" button instead.');
          setForgotLoading(false);
          return;
        }
      }
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMessage('Check your email for a password reset link.');
    } catch (error) {
      console.error('Password reset error:', error);
      setForgotError(friendlyAuthError(error));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!validateEmail(forgotEmail)) {
      setForgotError('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, forgotEmail, actionCodeSettings);
      localStorage.setItem('emailForSignIn', forgotEmail);
      setForgotMessage('Check your email for a sign-in link.');
    } catch (error) {
      console.error('Magic link send error:', error);
      setForgotError(friendlyAuthError(error));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setEmailError("");
    setPasswordError("");
    setError("");
    if (!validateEmail(email)) {
      setEmailError("Invalid email address");
      return;
    }
    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ensureUserInDatabase(email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
      localStorage.setItem('authToken', token);
      setAuthToken(token);

      // Track login for analytics and Slack notifications
      try {
        await apiClient.post('/api/login/track-login', {
          email: email,
          method: 'email'
        });
      } catch (trackError) {
        console.error('Failed to track login:', trackError);
        // Don't block login flow if tracking fails
      }

      if (location.state?.redirect) {
        navigate(location.state.redirect);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(friendlyAuthError(error));
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await ensureUserInDatabase(user.email);
      const token = await user.getIdToken();
      localStorage.setItem('authToken', token);
      setAuthToken(token);

      // Track login for analytics and Slack notifications
      try {
        await apiClient.post('/api/login/track-login', {
          email: user.email,
          method: 'google'
        });
      } catch (trackError) {
        console.error('Failed to track login:', trackError);
        // Don't block login flow if tracking fails
      }

      if (location.state?.redirect) {
        navigate(location.state.redirect);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google login error:', error);
      setError(friendlyAuthError(error));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-2 md:mx-auto space-y-8">
        <img src={logo} alt={`${brandName} logo`} className="h-12 mx-auto" />
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-4 rounded-lg text-lg bg-white border border-gray-200 ${emailError ? 'text-red-500 border-red-300' : 'text-gray-900'
                } placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent`}
            />
            {emailError && <p className="text-red-500 text-sm mt-2">{emailError}</p>}
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-4 rounded-lg text-lg bg-white border border-gray-200 ${passwordError ? 'text-red-500 border-red-300' : 'text-gray-900'
                } placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent`}
            />
            {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-4 rounded-lg text-lg font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full p-4 rounded-lg text-lg font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-3"
          >
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>Log in with Google</span>
          </button>

          <div className="text-center text-gray-600 text-lg">
            Don't have an account?{' '}
            <Link to="/signup" className="text-gray-900 font-medium hover:text-gray-700" state={location.state}>
              Sign up
            </Link>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={openForgotModal}
              className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeForgotModal}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset your password</h2>
            <p className="text-gray-500 text-sm mb-6">
              Enter your email and we'll send you a link to reset your password or sign in directly.
            </p>

            {forgotMessage ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium mb-1">Email sent!</p>
                <p className="text-gray-500 text-sm">{forgotMessage}</p>
                <p className="text-gray-400 text-xs mt-2">Don't see it? Check your spam folder.</p>
                <button
                  onClick={closeForgotModal}
                  className="mt-6 w-full p-3 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Email address"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setForgotError('');
                  }}
                  className="w-full p-4 rounded-lg text-base bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent mb-4"
                />

                {forgotError && (
                  <p className="text-red-500 text-sm mb-4">{forgotError}</p>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={forgotLoading}
                    className="w-full p-3 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {forgotLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                  <button
                    type="button"
                    onClick={handleMagicLink}
                    disabled={forgotLoading}
                    className="w-full p-3 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {forgotLoading ? 'Sending...' : 'Send magic link instead'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginComponent;
