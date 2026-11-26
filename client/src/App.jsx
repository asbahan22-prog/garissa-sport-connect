import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ROLE_HOME, canOpen, useAuth } from './auth';
import { DashboardLayout, PublicLayout } from './layouts';
import { Spinner } from './ui';
import { ForgotPage, LoginPage, RegisterPage, ResetPage } from './pages/AuthPages';
import { ApplicationsPage, AthleteHome, AthleteProfilePage, PerformancePage } from './pages/AthleteDash';
import { AccountPage, AdminHome, NotificationsPage, ScoutHome, ShortlistPage } from './pages/PeopleDash';
import {
  AboutPage, AthleteDetailPage, AthletesPage, ClubDetailPage, ClubsPage, ContactPage, HomePage,
  OpportunitiesPage, OpportunityDetailPage, SportDetailPage, SportsPage, TournamentDetailPage, TournamentsPage,
} from './pages/PublicPages';
import { ClubHome, CoachHome, ManageTournament, OpportunityAdmin, OrganizerHome, ReviewApplications, TeamPage } from './pages/WorkDash';

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner label="Checking your session" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const allowedRole = !roles || roles.includes(user.role);
  if (!allowedRole || !canOpen(user.role, location.pathname)) {
    return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
  }
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={ROLE_HOME[user.role] || '/'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="sports" element={<SportsPage />} />
        <Route path="sports/:slug" element={<SportDetailPage />} />
        <Route path="athletes" element={<AthletesPage />} />
        <Route path="athletes/:id" element={<AthleteDetailPage />} />
        <Route path="clubs" element={<ClubsPage />} />
        <Route path="clubs/:id" element={<ClubDetailPage />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPage />} />
        <Route path="reset-password/:token" element={<ResetPage />} />
      </Route>

      <Route path="app" element={<Protected><DashboardLayout /></Protected>}>
        <Route index element={<RoleHome />} />
        <Route path="athlete" element={<Protected roles={['athlete']}><AthleteHome /></Protected>} />
        <Route path="athlete/profile" element={<Protected roles={['athlete']}><AthleteProfilePage /></Protected>} />
        <Route path="athlete/applications" element={<Protected roles={['athlete']}><ApplicationsPage /></Protected>} />
        <Route path="athlete/performance" element={<Protected roles={['athlete']}><PerformancePage /></Protected>} />
        <Route path="coach" element={<Protected roles={['coach', 'super_admin']}><CoachHome /></Protected>} />
        <Route path="teams/:id" element={<Protected roles={['athlete', 'coach', 'club_admin', 'super_admin']}><TeamPage /></Protected>} />
        <Route path="scout" element={<Protected roles={['scout', 'super_admin']}><ScoutHome /></Protected>} />
        <Route path="scout/shortlist" element={<Protected roles={['scout', 'super_admin']}><ShortlistPage /></Protected>} />
        <Route path="club" element={<Protected roles={['club_admin', 'super_admin']}><ClubHome /></Protected>} />
        <Route path="organizer" element={<Protected roles={['organizer', 'super_admin']}><OrganizerHome /></Protected>} />
        <Route path="organizer/opportunities" element={<Protected roles={['organizer', 'club_admin', 'scout', 'super_admin']}><OpportunityAdmin /></Protected>} />
        <Route path="tournaments/:id" element={<Protected roles={['organizer', 'super_admin']}><ManageTournament /></Protected>} />
        <Route path="opportunities/:id" element={<Protected roles={['organizer', 'club_admin', 'scout', 'super_admin']}><ReviewApplications /></Protected>} />
        <Route path="admin" element={<Protected roles={['super_admin']}><AdminHome /></Protected>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
