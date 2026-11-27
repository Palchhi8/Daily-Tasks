import React from 'react';

/**
 * Reusable KPI Stats Overview component
 * Displays aggregated summary metrics derived from the root tickets state.
 *
 * @param {Object} props
 * @param {Object} props.stats
 * @param {number} props.stats.total
 * @param {number} props.stats.critical
 * @param {number} props.stats.breached
 * @param {number} props.stats.unassigned
 */
export default function StatsOverview({ stats }) {
  const cards = [
    { label: 'Active Tickets', value: stats.total, color: '#3b82f6', icon: '📋' },
    { label: 'Critical Priority', value: stats.critical, color: '#ef4444', icon: '🚨' },
    { label: 'SLA Breached / Imminent', value: stats.breached, color: '#f97316', icon: '⏱️' },
    { label: 'Unassigned Queue', value: stats.unassigned, color: '#8b5cf6', icon: '👤' }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {c.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {c.value}
            </div>
          </div>
          <span style={{ fontSize: '1.75rem' }}>{c.icon}</span>
        </div>
      ))}
    </div>
  );
}
