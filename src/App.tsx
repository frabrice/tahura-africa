import { lazy, Suspense, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ScrollToTop } from './components/ScrollToTop';
import { LoadingScreen } from './components/LoadingScreen';
import { PageSkeleton } from './components/Skeletons';
import { ErrorBoundary } from './components/ErrorBoundary';

const Gateway = lazy(() => import('./portals/Gateway').then(m => ({ default: m.Gateway })));
const TravelerExperience = lazy(() => import('./portals/TravelerExperience').then(m => ({ default: m.TravelerExperience })));
const HostDashboard = lazy(() => import('./portals/HostDashboard').then(m => ({ default: m.HostDashboard })));
const GuideDashboard = lazy(() => import('./portals/GuideDashboard').then(m => ({ default: m.GuideDashboard })));
const PartnerConsole = lazy(() => import('./portals/PartnerConsole').then(m => ({ default: m.PartnerConsole })));
const InstitutionsPlatform = lazy(() => import('./portals/InstitutionsPlatform').then(m => ({ default: m.InstitutionsPlatform })));
const OperationsControl = lazy(() => import('./portals/OperationsControl').then(m => ({ default: m.OperationsControl })));
const GovernmentPortal = lazy(() => import('./portals/GovernmentPortal').then(m => ({ default: m.GovernmentPortal })));
const DriverPortal = lazy(() => import('./portals/DriverPortal').then(m => ({ default: m.DriverPortal })));
const LoginPage = lazy(() => import('./pages/traveler/LoginPage'));
const SignupPage = lazy(() => import('./pages/traveler/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/traveler/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/traveler/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/traveler/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const PortalLogin = lazy(() => import('./components/PortalLogin'));
const OperationsLoginPage = lazy(() => import('./pages/operations/OperationsLoginPage').then(m => ({ default: m.OperationsLoginPage })));

function App() {
  const [appReady, setAppReady] = useState(false);

  const handleReady = useCallback(() => {
    setAppReady(true);
  }, []);

  return (
    <>
      {!appReady && <LoadingScreen onReady={handleReady} />}
      <ScrollToTop />
      <Suspense fallback={<PageSkeleton />}>
        <ErrorBoundary>
          <Routes>
            <Route path="/gateway" element={<Gateway />} />
            <Route path="/hq/operations-control-room/login" element={<OperationsLoginPage />} />
            <Route path="/operations/*" element={<OperationsControl />} />
            <Route path="/partner/login" element={<PortalLogin portalType="partner" onSuccess={() => window.location.href = '/partner'} />} />
            <Route path="/partner/*" element={<PartnerConsole />} />
            <Route path="/institution/login" element={<PortalLogin portalType="institution" onSuccess={() => window.location.href = '/institution'} />} />
            <Route path="/institution/*" element={<InstitutionsPlatform />} />
            <Route path="/government/login" element={<PortalLogin portalType="government" onSuccess={() => window.location.href = '/government'} />} />
            <Route path="/government/*" element={<GovernmentPortal />} />
            <Route path="/host/*" element={<HostDashboard />} />
            <Route path="/guide/*" element={<GuideDashboard />} />
            <Route path="/driver/*" element={<DriverPortal />} />
            <Route path="/traveler/login" element={<LoginPage />} />
            <Route path="/traveler/signup" element={<SignupPage />} />
            <Route path="/traveler/verify-email" element={<VerifyEmailPage />} />
            <Route path="/traveler/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/traveler/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={<TravelerExperience />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
    </>
  );
}

export default App;
