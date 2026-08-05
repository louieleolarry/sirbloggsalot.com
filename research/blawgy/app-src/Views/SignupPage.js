import React, { useState, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ensureUserInDatabase } from '../utils/userUtils';
import { useBranding } from '../contexts/BrandingContext';
import FacebookPixel from '../utils/facebookPixel';
import funnelTracking from '../utils/funnelTracking';
import { captureSignupCompleted, identifyUser } from '../utils/postHogClient';
import apiClient from '../utils/apiClient';
import { friendlyAuthError } from '../utils/firebaseErrors';

function SignupPage() {
  // Partner logo on a white-label host, Blawgy's everywhere else.
  const { logo, name: brandName } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Hidden field to catch bots
  const [error, setError] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = getAuth();
  const { setAuthToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Comp link state. If the URL has ?comp=<slug>, validate it once on mount
  // so we can show a friendly banner above the form. The slug is then
  // passed to the signup endpoint so the backend can stamp it on the
  // user doc for redemption at the end of onboarding.
  const compSlug = searchParams.get('comp');
  const [compInfo, setCompInfo] = useState(null);

  useEffect(() => {
    if (!compSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/comp-links/validate', {
          params: { slug: compSlug },
        });
        if (!cancelled && res.data?.valid) {
          setCompInfo({
            planName: res.data.planName,
            compLinkName: res.data.compLinkName,
          });
        }
      } catch (err) {
        // Silent fail — invalid slug just means no banner and no stamp.
        console.warn('Comp link validation failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [compSlug]);

  const validateEmail = (input) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(input);
  };

  const validatePassword = (input) => {
    return input.length >= 6;
  };

  const handleSignUp = async () => {
    setEmailError("");
    setPasswordError("");
    setError("");

    // Honeypot check - bots fill this hidden field, humans don't see it
    if (honeypot) {
      setError("Something went wrong. Please try again.");
      return;
    }

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
      await ensureUserInDatabase(email, { compSlug: compInfo ? compSlug : undefined });
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      FacebookPixel.trackSignup({ email: email });
      funnelTracking.trackSignupCompleted(email, userCredential.user.uid);
      identifyUser(userCredential.user.uid, email);
      captureSignupCompleted(userCredential.user.uid, email);
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
        // Don't block signup flow if tracking fails
      }

      // Check if coming from AI blog generator with an unassigned site
      const siteName = sessionStorage.getItem('siteName');
      const siteSettings = sessionStorage.getItem('siteSettings');

      if (siteName && siteSettings) {
        try {
          const settings = JSON.parse(siteSettings);
          // Connect the unassigned site to this user's account
          await apiClient.post('/connect-site', {
            domain: siteName,
            email: email,
            settings: {
              product: settings.product,
              competitors: settings.competitors || [],
            }
          });

          // Clear generator session storage
          sessionStorage.removeItem('siteName');
          sessionStorage.removeItem('siteSettings');
          sessionStorage.removeItem('unassignedSiteId');
          sessionStorage.removeItem('productDescription');
          sessionStorage.removeItem('generatedArticle');

          // Go straight to dashboard
          navigate('/onboarding');
          return;
        } catch (connectError) {
          console.error('Failed to connect site:', connectError);
          // Fall through to normal flow if connection fails
        }
      }

      if (location.state?.redirect) {
        navigate(location.state.redirect);
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(friendlyAuthError(error));
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      FacebookPixel.trackSignup({ email: user.email });
      funnelTracking.trackSignupCompleted(user.email, user.uid);
      identifyUser(user.uid, user.email);
      captureSignupCompleted(user.uid, user.email);
      await ensureUserInDatabase(user.email, { compSlug: compInfo ? compSlug : undefined });
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
        // Don't block signup flow if tracking fails
      }

      // Check if coming from AI blog generator with an unassigned site
      const siteName = sessionStorage.getItem('siteName');
      const siteSettings = sessionStorage.getItem('siteSettings');

      if (siteName && siteSettings) {
        try {
          const settings = JSON.parse(siteSettings);
          // Connect the unassigned site to this user's account
          await apiClient.post('/connect-site', {
            domain: siteName,
            email: user.email,
            settings: {
              product: settings.product,
              competitors: settings.competitors || [],
            }
          });

          // Clear generator session storage
          sessionStorage.removeItem('siteName');
          sessionStorage.removeItem('siteSettings');
          sessionStorage.removeItem('unassignedSiteId');
          sessionStorage.removeItem('productDescription');
          sessionStorage.removeItem('generatedArticle');

          // Go straight to dashboard
          navigate('/onboarding');
          return;
        } catch (connectError) {
          console.error('Failed to connect site:', connectError);
          // Fall through to normal flow if connection fails
        }
      }

      navigate('/onboarding');
    } catch (error) {
      console.error('Google signup error:', error);
      setError(friendlyAuthError(error));
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await handleSignUp();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-2 md:mx-auto space-y-8">
        <img src={logo} alt={`${brandName} logo`} className="h-12 mx-auto" />
        {compInfo && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center">
            <p className="text-sm font-medium text-green-900">
              You've been comped to {compInfo.planName}, welcome
            </p>
            <p className="text-xs text-green-800 mt-1">
              Sign up and finish onboarding, no card needed.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot field - hidden from humans, bots fill it */}
          <input
            type="text"
            name="company"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
            tabIndex={-1}
            autoComplete="off"
          />
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
            {isSubmitting ? 'Signing up...' : 'Sign up'}
          </button>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isSubmitting}
            className="w-full p-4 rounded-lg text-lg font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-3"
          >
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div className="text-center text-gray-600 text-lg">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 font-medium hover:text-gray-700">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupPage;