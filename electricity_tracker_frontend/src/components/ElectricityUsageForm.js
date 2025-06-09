import React, { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ElectricityUsageForm = () => {
  const [appliance, setAppliance] = useState('');
  const [appliances, setAppliances] = useState([]);
  const [hoursUsed, setHoursUsed] = useState('');
  const [wattage, setWattage] = useState('');
  const [date, setDate] = useState('');
  const [feedback, setFeedback] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
  const fetchAppliances = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/appliances', {
       headers: {
        Authorization: `Bearer ${token}`,
      },
     });

      setAppliances(response.data);
    } catch (error) {
      console.error('Error fetching appliances:', error);
    }
  };
  fetchAppliances();
}, []);


  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem('user_id');

    const usageData = {
      appliance,
      hours_used: parseFloat(hoursUsed),
      wattage: wattage ? parseFloat(wattage) : null,
      date,
    };

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/log-electricity-usage', usageData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
       });

      setFeedback({
        appliance,
        kwh: response.data.kwh,
        message: response.data.message,
      });
    } catch (error) {
      console.error('Error logging electricity usage:', error);
      setFeedback({
        appliance,
        message: 'Error logging electricity usage.',
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Log Electricity Usage</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-3/4">
        <div className="mb-4">
          <label htmlFor="appliance" className="block text-sm font-medium text-gray-700">Appliance Name</label>
         <select
  id="appliance"
  value={appliance}
  onChange={(e) => {
    const selected = e.target.value;
    setAppliance(selected);
    const found = appliances.find(item => item.appliance_name === selected);
    if (found && !wattage) setWattage(found.wattage);  // Only auto-fill if user hasn't entered wattage
  }}
  required
  className="mt-1 p-2 border border-gray-300 rounded-md w-full"
>
  <option value="">Select an appliance</option>
  {appliances.map((item, idx) => (
    <option key={idx} value={item.appliance_name}>
      {item.appliance_name}
    </option>
  ))}
</select>

        </div>

        <div className="mb-4">
          <label htmlFor="hoursUsed" className="block text-sm font-medium text-gray-700">Hours Used</label>
          <input
            type="number"
            id="hoursUsed"
            value={hoursUsed}
            onChange={(e) => setHoursUsed(e.target.value)}
            required
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="wattage" className="block text-sm font-medium text-gray-700">Wattage (optional)</label>
          <input
            type="number"
            id="wattage"
            value={wattage}
            onChange={(e) => setWattage(e.target.value)}
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 p-2 border border-gray-300 rounded-md w-full"
          />
        </div>

        <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">Submit</button>
      </form>

      {feedback && (
        <div className="mt-6 bg-green-100 p-4 rounded-lg shadow-md w-3/4">
          <h2 className="text-xl font-semibold">Feedback for {feedback.appliance}</h2>
          <p>{feedback.message}</p>
          {feedback.kwh && <p>kWh Used: {feedback.kwh.toFixed(2)}</p>}
        </div>
      )}

      <button
        onClick={() => navigate('/home')}
        className="mt-6 bg-gray-500 text-white py-2 px-4 rounded"
      >
        Back to Home
      </button>
    </div>
  );
};

export default ElectricityUsageForm;