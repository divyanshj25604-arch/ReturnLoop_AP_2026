import React, { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../api/client';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/health')
      .then((res) => {
        if (isMounted) {
          setHealth(res.data?.data?.status || 'OK');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(getApiErrorMessage(err));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="page-dashboard">
      <h1>Dashboard</h1>
      <p>Overview of disposition intelligence metrics and return volumes.</p>
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px' }}>
        <strong>API Health Status:</strong> {error ? `Error: ${error}` : health || 'Checking...'}
      </div>
    </div>
  );
}
