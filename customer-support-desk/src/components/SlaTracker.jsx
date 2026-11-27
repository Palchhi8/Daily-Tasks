import React, { useState, useEffect } from 'react';

/**
 * Reusable Component 2: SlaTracker
 * Displays live SLA countdown, progress bar (% of SLA consumed), and breach warning indicators.
 *
 * State Ownership Note:
 * Contains its own localized `now` state updated on a 1-second interval.
 * This prevents the entire parent ticket list from re-rendering every second just to update ticking clock text!
 *
 * @param {Object} props
 * @param {Date} props.createdAt - Ticket creation timestamp
 * @param {Date} props.slaDeadline - Target resolution deadline timestamp
 * @param {boolean} [props.isResolved=false] - Whether ticket is resolved
 */
export default function SlaTracker({ createdAt, slaDeadline, isResolved = false }) {
  // Localized tick state to isolate 1-second timer re-renders
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isResolved) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [isResolved]);

  const createdTime = new Date(createdAt).getTime();
  const deadlineTime = new Date(slaDeadline).getTime();

  const totalSlaWindowMs = Math.max(1, deadlineTime - createdTime);
  const elapsedMs = now - createdTime;
  const remainingMs = deadlineTime - now;
  const isBreached = remainingMs <= 0;

  // Percentage of SLA window consumed (can exceed 100% when breached)
  const percentConsumed = isResolved
    ? 100
    : Math.min(100, Math.max(0, (elapsedMs / totalSlaWindowMs) * 100));

  // Format remaining or overdue duration into human-readable string
  const formatDuration = (ms) => {
    const totalSecs = Math.abs(Math.floor(ms / 1000));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  // Determine visual styling based on SLA health
  let statusColor = '#10b981'; // Green (Safe < 60%)
  let statusText = `${formatDuration(remainingMs)} left`;
  let badgeLabel = 'ON TRACK';
  let badgeBg = '#ecfdf5';
  let badgeColor = '#065f46';

  if (isResolved) {
    statusColor = '#64748b';
    statusText = 'Resolved';
    badgeLabel = 'MET';
    badgeBg = '#f1f5f9';
    badgeColor = '#334155';
  } else if (isBreached) {
    statusColor = '#ef4444'; // Red
    statusText = `BREACHED (+${formatDuration(remainingMs)} ago)`;
    badgeLabel = 'SLA BREACHED';
    badgeBg = '#fee2e2';
    badgeColor = '#991b1b';
  } else if (remainingMs < 15 * 60 * 1000) {
    statusColor = '#f97316'; // Orange (< 15 mins)
    statusText = `URGENT: ${formatDuration(remainingMs)} left`;
    badgeLabel = 'IMMINENT BREACH';
    badgeBg = '#ffedd5';
    badgeColor = '#9a3412';
  } else if (percentConsumed > 60) {
    statusColor = '#eab308'; // Amber (> 60% consumed)
    badgeLabel = 'WARNING';
    badgeBg = '#fef9c3';
    badgeColor = '#854d0e';
  }

  return (
    <div className="sla-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
        <span
          style={{
            fontWeight: 700,
            color: isBreached ? '#b91c1c' : '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {isBreached && <span className="breach-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />}
          {statusText}
        </span>
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: badgeBg,
            color: badgeColor,
            textTransform: 'uppercase'
          }}
        >
          {badgeLabel}
        </span>
      </div>

      {/* SLA Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#e2e8f0',
          borderRadius: '9999px',
          overflow: 'hidden'
        }}
        role="progressbar"
        aria-valuenow={Math.round(percentConsumed)}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="SLA time consumed"
      >
        <div
          style={{
            width: `${percentConsumed}%`,
            height: '100%',
            backgroundColor: statusColor,
            transition: 'width 0.3s ease, background-color 0.3s ease'
          }}
        />
      </div>
    </div>
  );
}
