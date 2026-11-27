import React, { useState } from 'react';
import { AGENTS } from '../constants/supportDeskConstants';

/**
 * Reusable Component 3: AgentAssigneeDropdown
 * Allows rapid ticket assignment or reassignment across support engineers.
 *
 * State Ownership Note:
 * Contains local UI state (`isOpen`) for dropdown visibility.
 * The canonical `assignedAgentId` is lifted to the parent container which owns ticket mutations.
 *
 * @param {Object} props
 * @param {string} props.assignedAgentId - Currently assigned agent ID
 * @param {Function} props.onAssign - Callback when new agent is selected (agentId) => void
 */
export default function AgentAssigneeDropdown({ assignedAgentId, onAssign }) {
  const [isOpen, setIsOpen] = useState(false);

  const currentAgent = AGENTS.find((a) => a.id === assignedAgentId) || AGENTS[0];
  const isUnassigned = currentAgent.id === 'unassigned';

  const handleSelect = (agentId) => {
    setIsOpen(false);
    if (agentId !== assignedAgentId) {
      onAssign(agentId);
    }
  };

  return (
    <div className="agent-assignee-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: isUnassigned ? '1px dashed #cbd5e1' : '1px solid #e2e8f0',
          backgroundColor: isUnassigned ? '#f8fafc' : '#ffffff',
          color: isUnassigned ? '#64748b' : '#0f172a',
          fontSize: '0.8125rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: currentAgent.color,
            color: '#ffffff',
            fontSize: '0.65rem',
            fontWeight: 700
          }}
        >
          {currentAgent.initials}
        </span>
        <span>{currentAgent.name}</span>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>▼</span>
      </button>

      {/* Roster Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 60,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            padding: '6px',
            minWidth: '220px'
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', padding: '4px 8px', textTransform: 'uppercase' }}>
            Assign Support Engineer
          </div>
          {AGENTS.map((agent) => {
            const isSelected = agent.id === assignedAgentId;
            return (
              <button
                key={agent.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(agent.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  border: 'none',
                  backgroundColor: isSelected ? '#f1f5f9' : 'transparent',
                  color: isSelected ? '#0f172a' : '#334155',
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: agent.color,
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700
                  }}
                >
                  {agent.initials}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{agent.name}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{agent.role}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
