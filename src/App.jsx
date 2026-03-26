import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import ProjectView from './pages/ProjectView';
import DeveloperDashboard from './pages/DeveloperDashboard';
import DeveloperUpload from './pages/DeveloperUpload';
import DeveloperEarnings from './pages/DeveloperEarnings';
import DeveloperSales from './pages/DeveloperSales';
import DeveloperProjects from './pages/DeveloperProjects';
import DeveloperEditProject from './pages/DeveloperEditProject';
import BuyerDashboard from './pages/BuyerDashboard';
import BuyerPurchases from './pages/BuyerPurchases';
import BuyerProjects from './pages/BuyerProjects';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import AdminQueries from './pages/AdminQueries';
import KYCFlow from './pages/KYCFlow';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Messages from './pages/Messages';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/project/:id" element={<ProjectView />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected Routes */}
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute><Messages /></ProtectedRoute>
          } />

          <Route path="/buyer/dashboard" element={
            <ProtectedRoute allowedRoles={['buyer']}><BuyerDashboard /></ProtectedRoute>
          } />
          <Route path="/buyer/purchases" element={
            <ProtectedRoute allowedRoles={['buyer']}><BuyerPurchases /></ProtectedRoute>
          } />
          <Route path="/buyer/projects" element={
            <ProtectedRoute allowedRoles={['buyer']}><BuyerProjects /></ProtectedRoute>
          } />
          
          <Route path="/dev/dashboard" element={
            <ProtectedRoute allowedRoles={['developer']}><DeveloperDashboard /></ProtectedRoute>
          } />
          <Route path="/dev/upload" element={
            <ProtectedRoute allowedRoles={['developer']}><DeveloperUpload /></ProtectedRoute>
          } />
          <Route path="/dev/earnings" element={
            <ProtectedRoute allowedRoles={['developer']}><DeveloperEarnings /></ProtectedRoute>
          } />
          <Route path="/dev/sales" element={
            <ProtectedRoute allowedRoles={['developer']}><DeveloperSales /></ProtectedRoute>
          } />
          <Route path="/dev/projects" element={
            <ProtectedRoute allowedRoles={['developer']}><DeveloperProjects /></ProtectedRoute>
          } />
          <Route path="/dev/kyc" element={
            <ProtectedRoute allowedRoles={['developer']}><KYCFlow /></ProtectedRoute>
          } />
          <Route path="/dev/edit/:id" element={
            <ProtectedRoute allowedRoles={['developer']}><DeveloperEditProject /></ProtectedRoute>
          } />

          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/queries" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminQueries /></ProtectedRoute>
          } />
        </Routes>
      </main>
      <Chatbot />
    </>
  );
}

export default App;
