import React from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EMR System</h1>
            <p className="text-sm text-gray-600">Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, {user.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/patients/new')}
              className="bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 font-semibold"
            >
              + New Patient
            </button>

            <button
              onClick={() => navigate('/patients')}
              className="bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 font-semibold"
            >
              Search Patients
            </button>

            <button
              onClick={() => navigate('/schedule/today')}
              className="bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 font-semibold"
            >
              Today’s Schedule
            </button>

            <button
              onClick={() => navigate('/live')}
              className="bg-orange-600 text-white px-6 py-4 rounded-lg hover:bg-orange-700 font-semibold"
            >
              Live Patients
            </button>

            <button
              onClick={() => navigate('/schedule/new')}
              className="bg-emerald-700 text-white px-6 py-4 rounded-lg hover:bg-emerald-800 font-semibold"
            >
              + Add Appointment
            </button>

            <button
              onClick={() => navigate('/schedule/calendar')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              Calendar View
            </button>

            <button
              onClick={() => navigate('/metrics')}
              className="bg-slate-900 text-white px-6 py-4 rounded-lg hover:bg-black font-semibold"
            >
              Metrics
            </button>

            <button
              onClick={() => navigate('/providers')}
              className="bg-blue-900 text-white px-6 py-4 rounded-lg hover:bg-black font-semibold"
            >
              Providers
            </button>

            <button
              onClick={() => navigate('/patients/recent')}
              className="bg-gray-800 text-white px-6 py-4 rounded-lg hover:bg-black font-semibold"
            >
              Recently Viewed
            </button>          

          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">System Status</h2>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
            <li>Authenticated access required for all pages.</li>
            <li>Clinic-scoped data enforced by backend API.</li>
            <li>Workflow: Schedule → Check In → Live status transitions → Complete (audit logged).</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
