import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ScreenplayEditorSimple: React.FC = () => {
  const { projectId, screenplayId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('ScreenplayEditorSimple mounted with params:', { projectId, screenplayId });
    console.log('User:', user);
    
    // Simulate loading
    setTimeout(() => {
      if (!projectId || !screenplayId) {
        setError('Missing project ID or screenplay ID');
      } else if (!user) {
        setError('User not authenticated');
      } else {
        setError(null);
      }
      setLoading(false);
    }, 1000);
  }, [projectId, screenplayId, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86F2C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[#577B92]">Loading screenplay editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F2]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Editor</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate(-1)}
              className="bg-[#577B92] hover:bg-[#4a6b7f] text-white px-4 py-2 rounded-lg transition-colors mr-2"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#E86F2C] hover:bg-[#d85f1c] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F2]">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-[#1E4D3A] mb-4">Screenplay Editor</h1>
          <div className="space-y-4">
            <div>
              <strong>Project ID:</strong> {projectId}
            </div>
            <div>
              <strong>Screenplay ID:</strong> {screenplayId}
            </div>
            <div>
              <strong>User:</strong> {user?.email}
            </div>
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
              <p className="text-sm text-gray-600">
                This is a simplified version of the screenplay editor to test basic functionality.
                If you can see this page, the routing and authentication are working correctly.
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="bg-[#577B92] hover:bg-[#4a6b7f] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenplayEditorSimple;
