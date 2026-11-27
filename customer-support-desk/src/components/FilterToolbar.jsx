import React from 'react';
import { AGENTS } from '../constants/supportDeskConstants';

/**
 * FilterToolbar Component
 * Filter by priority, assignee, SLA urgency, and keyword query.
 *
 * @param {Object} props
 * @param {Object} props.filters - Current filter state
 * @param {Function} props.onFilterChange - Callback when any filter changes
 * @param {Function} props.onResetFilters - Callback to clear all filters
 */
export default function FilterToolbar({ filters, onFilterChange, onResetFilters }) {
  const priorities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        marginBottom: '18px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}
    >
      {/* Left: Search input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px' }}>
        <input
          type="text"
          placeholder="Search ticket title, ID, customer..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
          style={{
            width: '100%',
            padding: '7px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8125rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Center: Priority filter pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {priorities.map((p) => {
          const isActive = filters.priority === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onFilterChange('priority', p)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#0f172a' : '#f8fafc',
                color: isActive ? '#ffffff' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Right: Assignee selector & SLA Breach filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <select
          value={filters.assignee}
          onChange={(e) => onFilterChange('assignee', e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.8125rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            cursor: 'pointer'
          }}
        >
          <option value="ALL">All Assignees</option>
          <option value="UNASSIGNED">Unassigned Only</option>
          {AGENTS.filter((a) => a.id !== 'unassigned').map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: '#334155',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <input
            type="checkbox"
            checked={filters.onlyBreachedOrUrgent}
            onChange={(e) => onFilterChange('onlyBreachedOrUrgent', e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>🚨 Breached / Urgent Only</span>
        </label>
      </div>
    </div>
  );
}
