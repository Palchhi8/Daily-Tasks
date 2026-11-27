import React, { useState } from 'react';
import { SLA_POLICIES } from '../constants/supportDeskConstants';

/**
 * Reusable Component 1: PriorityBadge
 * Renders an accessible, semantic priority indicator with optional inline escalation selector.
 *
 * @param {Object} props
 * @param {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'} props.priority - Ticket priority level
 * @param {Function} [props.onPriorityChange] - Callback when user changes priority
 * @param {boolean} [props.interactive=false] - Whether dropdown selection is enabled
 */
export default function PriorityBadge({ priority, onPriorityChange, interactive = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = SLA_POLICIES[priority] || SLA_POLICIES.MEDIUM;

  const priorities = Object.keys(SLA_POLICIES);

  const handleSelect = (newPriority) => {
    setIsOpen(false);
    if (newPriority !== priority && onPriorityChange) {
      onPriorityChange(newPriority);
    }
  };

  const getIcon = (level) => {
    switch (level) {
      case 'CRITICAL': return '🚨';
      case 'HIGH':     return '⚡';
      case 'MEDIUM':   return '🔶';
      case 'LOW':      return '🔷';
      default:         return '🏷️';
    }
  };

  return (
    <div className="priority-badge-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        disabled={!interactive}
        onClick={() => interactive && setIsOpen(!isOpen)}
        aria-label={`Priority: ${config.label}. Target SLA: ${config.hours} hours`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          backgroundColor: config.bg,
          color: config.text,
          border: `1px solid ${config.border}`,
          cursor: interactive ? 'pointer' : 'default',
          transition: 'all 0.15s ease-in-out'
        }}
      >
        <span>{getIcon(priority)}</span>
        <span>{config.label}</span>
        {interactive && (
          <span style={{ fontSize: '0.65rem', opacity: 0.7, marginLeft: '2px' }}>▼</span>
        )}
      </button>

      {/* Interactive Priority Selector Dropdown */}
      {interactive && isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 50,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            padding: '6px',
            minWidth: '150px'
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', padding: '4px 8px', textTransform: 'uppercase' }}>
            Escalate Priority
          </div>
          {priorities.map((p) => {
            const pConfig = SLA_POLICIES[p];
            const isSelected = p === priority;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handleSelect(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? '#f1f5f9' : 'transparent',
                  color: pConfig.text,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{getIcon(p)} {pConfig.label}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{pConfig.hours}h SLA</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
