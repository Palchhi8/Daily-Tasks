import React from 'react';

/**
 * Reusable Component 5: StateView
 * Handles Loading (skeleton shimmer), Empty, and Error state presentations.
 *
 * @param {Object} props
 * @param {'loading'|'empty'|'error'} props.type - State type
 * @param {string} [props.title] - Custom title
 * @param {string} [props.description] - Custom descriptive text
 * @param {Function} [props.onAction] - Action callback (e.g. Retry or Reset filters)
 * @param {string} [props.actionLabel] - Label for action button
 */
export default function StateView({ type, title, description, onAction, actionLabel }) {
  if (type === 'loading') {
    return (
      <div className="state-view loading-state" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '30%', height: '18px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="skeleton-pulse" />
              <div style={{ width: '80px', height: '22px', backgroundColor: '#e2e8f0', borderRadius: '9999px' }} className="skeleton-pulse" />
            </div>
            <div style={{ width: '75%', height: '20px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="skeleton-pulse" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <div style={{ width: '40%', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} className="skeleton-pulse" />
              <div style={{ width: '120px', height: '28px', backgroundColor: '#e2e8f0', borderRadius: '6px' }} className="skeleton-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div
        className="state-view error-state"
        role="alert"
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '32px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span style={{ fontSize: '2.5rem' }}>⚠️</span>
        <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#991b1b', fontWeight: 700 }}>
          {title || 'Failed to Synchronize Support Desk Tickets'}
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#7f1d1d', maxWidth: '480px', lineHeight: 1.5 }}>
          {description || 'A network error or API timeout occurred while fetching real-time tickets from the desk backend. Please retry.'}
        </p>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            style={{
              marginTop: '8px',
              padding: '8px 20px',
              borderRadius: '8px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            {actionLabel || '🔄 Retry Connection'}
          </button>
        )}
      </div>
    );
  }

  // Default: Empty State
  return (
    <div
      className="state-view empty-state"
      style={{
        backgroundColor: '#ffffff',
        border: '2px dashed #cbd5e1',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}
    >
      <span style={{ fontSize: '3rem' }}>🎉</span>
      <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#1e293b', fontWeight: 700 }}>
        {title || 'All Caught Up! Inbox Zero'}
      </h3>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', lineHeight: 1.5 }}>
        {description || 'No support tickets match the current filter criteria or all critical SLA queues are clear.'}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {actionLabel || 'Clear All Filters'}
        </button>
      )}
    </div>
  );
}
