import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage'; 
import ElectricityUsageForm from './components/ElectricityUsageForm'; 
import Dashboard from './components/Dashboard';  // Import the home page

const App = () => {
  const username = 'Anne';
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/log-usage" element={<ElectricityUsageForm />} /> 
        <Route path="/home" element={<HomePage username={username} />} />  {/* Home route */}
      </Routes>
    </Router>
  );
};

export default App;
