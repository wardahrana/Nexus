import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Dashboard Pages
import { EntrepreneurDashboard } from './pages/dashboard/EntrepreneurDashboard';
import { InvestorDashboard } from './pages/dashboard/InvestorDashboard';

// Profile Pages
import { EntrepreneurProfilePage } from './pages/profile/EntrepreneurProfilePage';// ✅ sirf ek baar
import { InvestorProfilePage } from './pages/profile/InvestorProfilePage';
       // ✅ sirf ek baar

// Feature Pages
import { InvestorsPage } from './pages/investors/InvestorsPage';
import { EntrepreneursPage } from './pages/entrepreneurs/EntrepreneursPage'; // ✅ EntrepreneurProfile yahan se mat lo
import { MessagesPage } from './pages/messages/MessagesPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { HelpPage } from './pages/help/HelpPage';
import { DealsPage } from './pages/deals/DealsPage';

// Chat Pages
import { ChatPage } from './pages/chat/ChatPage';
import MeetingPage from './pages/meetings/MeetingPage';
import VideoCallPage from './pages/video/VideoCallPage';

// ✅ Alag component — useAuth yahan chalega AuthProvider ke andar
function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
    <Route path="/dashboard" element={<DashboardLayout />}>
  <Route path="entrepreneur" element={<EntrepreneurDashboard />} />
  <Route path="investor" element={<InvestorDashboard />} />
  <Route path="entrepreneur/profile" element={<EntrepreneurProfilePage />} />  {/* ✅ */}
  <Route path="investor/profile" element={<InvestorProfilePage />} />   
  <Route path="entrepreneur/documents" element={<DocumentsPage />} />
  <Route path="investor/documents" element={<DocumentsPage />} />     
</Route>
      {/* Profile Routes */}
      <Route path="/profile" element={<DashboardLayout />}>
      <Route path="entrepreneur/profile" element={<EntrepreneurProfilePage />} />
        <Route path="investor/:id" element={<InvestorProfilePage/>} />
      </Route>
      
      {/* Feature Routes */}
      <Route path="/investors" element={<DashboardLayout />}>
        <Route index element={<InvestorsPage />} />
      </Route>
      
      <Route path="/entrepreneurs" element={<DashboardLayout />}>
        <Route index element={<EntrepreneursPage />} />
      </Route>
      
      <Route path="/messages" element={<DashboardLayout />}>
        <Route index element={<MessagesPage />} />
      </Route>
      
      <Route path="/notifications" element={<DashboardLayout />}>
        <Route index element={<NotificationsPage />} />
      </Route>
      
     
      
      <Route path="/settings" element={<DashboardLayout />}>
        <Route index element={<SettingsPage />} />
      </Route>
      
      <Route path="/help" element={<DashboardLayout />}>
        <Route index element={<HelpPage />} />
      </Route>
      
      <Route path="/deals" element={<DashboardLayout />}>
        <Route index element={<DealsPage />} />
      </Route>
      
      {/* Chat Routes */}
      <Route path="/chat" element={<DashboardLayout />}>
        <Route index element={<ChatPage />} />
        <Route path=":userId" element={<ChatPage />} />
      </Route>

      {/* Meeting Routes */}
  <Route path="/dashboard/entrepreneur/meetings" element={<MeetingPage />} />
  <Route path="/dashboard/investor/meetings" element={<MeetingPage />} />
  <Route path="/call/:meetingId" element={<VideoCallPage />} />
      
      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />  {/* ✅ AuthProvider ke andar hai — useAuth kaam karega */}
      </Router>
    </AuthProvider>
  );
}

export default App;