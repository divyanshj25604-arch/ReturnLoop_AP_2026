import React from 'react';
import { useParams } from 'react-router-dom';

export default function ReturnDetail() {
  const { id } = useParams();
  return (
    <div className="page-return-detail">
      <h1>Return Detail</h1>
      <p>Detailed view and inspection workflow for Return #{id || '1'}.</p>
    </div>
  );
}
