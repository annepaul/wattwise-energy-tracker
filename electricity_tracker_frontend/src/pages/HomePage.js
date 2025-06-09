import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const Home = () => {
  const [totalPoints, setTotalPoints] = useState(0);
  const [usageData, setUsageData] = useState([]);
  const [dailyRewards, setDailyRewards] = useState([]);
  const [dailyUsageData, setDailyUsageData] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [pointsRes, usageRes, rewardsRes, dailyUsageRes] = await Promise.all([
          axios.post('http://localhost:5000/api/get-total-rewards', {}, { headers }),
          axios.post('http://localhost:5000/api/usage-by-appliance', {}, { headers }),
          axios.post('http://localhost:5000/api/get-daily-rewards', {}, { headers }),
          axios.post('http://localhost:5000/api/daily-usage', {}, { headers })
        ]);

        setTotalPoints(pointsRes.data.total_points || 0);
        setUsageData(usageRes.data);
        setDailyRewards(rewardsRes.data);
        setDailyUsageData(dailyUsageRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, [token]);

  const pieData = usageData.map(item => ({
    name: item.appliance_name,
    value: item.total_kwh,
  }));

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1', '#a4de6c'];
  const formatKwh = (value) => `${parseFloat(value).toFixed(3)} kWh`;
  const renderCustomizedLabel = ({ value }) => `${value.toFixed(2)} kWh`;

  const motivationalMessage = totalPoints > 0
    ? "Great job! Keep conserving electricity and earning points!"
    : "Start logging your usage to save energy and earn rewards!";

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-4xl font-bold mb-4">Welcome, {username}!</h1>

      <div className="bg-card p-6 rounded-lg shadow-md w-full max-w-6xl">
        <h2 className="text-2xl font-semibold mb-4">Your Electricity Tracker Dashboard</h2>

        <div className="mb-6 flex space-x-4">
          <Link to="/log-usage" className="bg-blue-500 text-white py-2 px-4 rounded">
            Log Electricity Usage
          </Link>
        </div>

        {/* Rewards Summary */}
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">Rewards Summary</h3>
          <p className="text-gray-700">Total Points: {totalPoints}</p>
          <p className="text-green-700 font-semibold mt-2">{motivationalMessage}</p>
        </div>

        {/* Usage Chart */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-medium">Electricity Usage by Appliance</h3>
            <div>
              <button
                className={`py-1 px-3 mr-2 rounded ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setChartType('bar')}
              >
                Bar Chart
              </button>
              <button
                className={`py-1 px-3 rounded ${chartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => setChartType('pie')}
              >
                Pie Chart
              </button>
            </div>
          </div>

          {usageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'bar' ? (
                <BarChart data={usageData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="appliance_name" />
                  <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={formatKwh} />
                  <Bar dataKey="total_kwh" fill="#8884d8" />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={renderCustomizedLabel}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatKwh} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500">No usage data available yet.</p>
          )}
        </div>

        {/* Daily Rewards Table */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-medium mr-2">Daily Rewards History</h3>
            <div className="relative group">
              <span className="text-blue-600 cursor-pointer">ℹ️</span>
              <div className="absolute left-6 bottom-full mb-2 w-64 p-3 text-sm text-white bg-gray-800 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <p><strong>Daily Reward Rules:</strong></p>
                <ul className="list-disc ml-4 mt-1">
                  <li>Threshold = Household Size × 3.3 kWh</li>
                  <li>Usage ≤ Threshold: +10 pts</li>
                  <li>≤ 120% of Threshold: +5 pts</li>
                  <li>Above that: 0 pts</li>
                </ul>
              </div>
            </div>
          </div>

          {dailyRewards.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded">
                <thead>
                  <tr className="bg-gray-200 text-left">
                    <th className="py-2 px-4 border">Date</th>
                    <th className="py-2 px-4 border">Total kWh</th>
                    <th className="py-2 px-4 border">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRewards.map((reward, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-2 px-4 border">{reward.reward_date}</td>
                      <td className="py-2 px-4 border">{reward.total_kwh.toFixed(2)}</td>
                      <td className="py-2 px-4 border">{reward.reward_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No rewards data yet.</p>
          )}
        </div>

        {/* Daily Usage Line Chart */}
        {dailyUsageData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-4">Daily Electricity Usage Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="usage_date" />
                <YAxis label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${parseFloat(value).toFixed(2)} kWh`} />
                <Line type="monotone" dataKey="total_kwh" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Home;
