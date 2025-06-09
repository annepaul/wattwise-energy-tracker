import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">User Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow-md w-3/4">
        <h2 className="text-xl font-semibold">Welcome back!</h2>
        <p className="mt-2">Total Water Usage: [Insert data]</p>
        <p className="mt-2">Last Recorded Usage: [Insert data]</p>
        
        {/* Log Water Usage Button */}
        <button className="mt-4 bg-blue-500 text-white py-2 px-4 rounded">
          <Link to="/log-usage">Log Water Usage</Link>
        </button>

        {/* Home Button */}
        <button className="mt-4 mx-4 bg-gray-500 text-white py-2 px-4 rounded">
          <Link to="/home">Home</Link>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
