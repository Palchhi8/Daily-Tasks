import React from 'react';
import PriorityBadge from './PriorityBadge';
import SlaTracker from './SlaTracker';
import AgentAssigneeDropdown from './AgentAssigneeDropdown';

/**
 * Reusable Component 4: TicketCard
 * Composes PriorityBadge, SlaTracker, and AgentAssigneeDropdown into a cohesive ticket row.
 *
 * State Ownership Note:
 * Receives all ticket data as props. Any mutations (priority change, assignment, resolution)
 * are delegated via callback props to the parent container that holds the tickets state.
 *
 * @param {Object} props
 * @param {Object} props.ticket - Ticket domain object
 * @param {Function} props.onPriorityChange - (ticketId, newPriority) => void
 * @param {Function} props.onAssignAgent - (ticketId, newAgentId) => void
 * @param {Function} props.onToggleResolve - (ticketId) => void
 */
export default function TicketCard({ ticket, onPriorityChange, onAssignAgent, onToggleResolve }) {
  const isResolved = ticket.status === 'RESOLVED';

  // Customer Tier tag styles
  const tierColors = {
    ENTERPRISE: { bg: '#ede9fe', text: '#5b21b6' },
    PRO:        { bg: '#e0f2fe', text: '#0369a1' },
    FREE:       { bg: '#f1f5f9', text: '#475569' }
  };
  const tierStyle = tierColors[ticket.customer.tier] || tierColors.FREE;

  return (
    <div
      className={`ticket-card ${ticket.priority === 'CRITICAL' && !isResolved ? 'critical-glow' : ''}`}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        opacity: isResolved ? 0.75 : 1
      }}
    >
      {/* Top Header: ID, Customer Tier, Priority, and Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b' }}>
            {ticket.id}
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: tierStyle.bg,
              color: tierStyle.text
            }}
          >
            {ticket.customer.tier}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
            {ticket.customer.name}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {ticket.category}
          </span>
        </div>

        {/* Priority Badge with inline escalation dropdown */}
        <PriorityBadge
          priority={ticket.priority}
          interactive={!isResolved}
          onPriorityChange={(newPriority) => onPriorityChange(ticket.id, newPriority)}
        />
      </div>

      {/* Title */}
      <h3
        style={{
          margin: 0,
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: isResolved ? '#64748b' : '#0f172a',
          textDecoration: isResolved ? 'line-through' : 'none',
          lineHeight: 1.4
        }}
      >
        {ticket.title}
      </h3>

      {/* Bottom Bar: SLA Tracker, Agent Assignee Dropdown, and Resolve Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f5f9'
        }}
      >
        {/* SLA Countdown Tracker */}
        <SlaTracker
          createdAt={ticket.createdAt}
          slaDeadline={ticket.slaDeadline}
          isResolved={isResolved}
        />

        {/* Right side: Assignee & Resolution button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AgentAssigneeDropdown
            assignedAgentId={ticket.assignedAgentId}
            onAssign={(newAgentId) => onAssignAgent(ticket.id, newAgentId)}
          />

          <button
            type="button"
            onClick={() => onToggleResolve(ticket.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: isResolved ? '1px solid #cbd5e1' : '1px solid #10b981',
              backgroundColor: isResolved ? '#f8fafc' : '#10b981',
              color: isResolved ? '#475569' : '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            {isResolved ? 'Re-open' : '✓ Resolve'}
          </button>
        </div>
      </div>
    </div>
  );
}
