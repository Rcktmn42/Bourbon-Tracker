// Home.jsx
import React from 'react';
import './Home.css';

export default function Home({ status }) {
  return (
    <div className="home-page">
      <div className="home-container">
        <h1>NC Bourbon Tracker</h1>
        <p>Backend health: <strong>{status}</strong></p>
      </div>
    </div>
  );
}
