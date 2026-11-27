import React, { useState, useMemo, useCallback } from 'react';
import TicketCard from './components/TicketCard';
import StateView from './components/StateView';
import StatsOverview from './components/StatsOverview';
import FilterToolbar from './components/FilterToolbar';
import { getInitialTickets, calculateSlaDeadline, SLA_POLICIES } from './constants/supportDeskConstants';

/**
 * SupportDeskView Container Component
 *
 * STATE OWNERSHIP ARCHITECTURE:
 * 1. Root/Canonical State:
 *    - `tickets`: The single source of truth for the tickets collection.
 *    - `viewMode`: Controls async simulation ('success' | 'loading' | 'empty' | 'error').
 *    - `filters`: { priority, assignee, onlyBreachedOrUrgent, searchQuery }.
 *
 * 2. Derived State (Computed via useMemo, NOT duplicated in useState):
 *    - `filteredTickets`: Derived from (tickets + filters). Eliminates out-of-sync cache bugs.
 *    - `stats`: Derived counts for Critical, Breached, and Unassigned tickets.
 *
 * 3. Localized Component State:
 *    - Dropdown toggles (`isOpen`) in PriorityBadge & AgentAssigneeDropdown.
 *    - 1-second interval timer in SlaTracker (avoids re-rendering the whole ticket list!).
 */
export default function SupportDeskView() {
  // 1. Root Data State
  const [tickets, setTickets] = useState(() => getInitialTickets());

  // 2. View Mode State (for demonstrating Loading, Empty, and Error states)
  const [viewMode, setViewMode] = useState('success');

  // 3. Filter State
  const [filters, setFilters] = useState({
    priority: 'ALL',
    assignee: 'ALL',
    onlyBreachedOrUrgent: false,
    searchQuery: ''
  });

  // 4. Edge Case Flag & Explanation Banner
  const [edgeCaseBanner, setEdgeCaseBanner] = useState(null);

  // -------------------------------------------------------------
  // Derived State: Filtered Tickets
  // -------------------------------------------------------------
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // 1. Search Query Filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = ticket.title.toLowerCase().includes(query);
        const matchesId = ticket.id.toLowerCase().includes(query);
        const matchesCustomer = ticket.customer.name.toLowerCase().includes(query);
        if (!matchesTitle && !matchesId && !matchesCustomer) return false;
      }

      // 2. Priority Filter
      if (filters.priority !== 'ALL' && ticket.priority !== filters.priority) {
        return false;
      }

      // 3. Assignee Filter
      if (filters.assignee === 'UNASSIGNED') {
        if (ticket.assignedAgentId !== 'unassigned') return false;
      } else if (filters.assignee !== 'ALL') {
        if (ticket.assignedAgentId !== filters.assignee) return false;
      }

      // 4. Breached or Urgent Filter
      if (filters.onlyBreachedOrUrgent) {
        const isResolved = ticket.status === 'RESOLVED';
        if (isResolved) return false;
        const remainingMs = new Date(ticket.slaDeadline).getTime() - Date.now();
        if (remainingMs > 15 * 60 * 1000) return false; // Not breached and not urgent
      }

      return true;
    });
  }, [tickets, filters]);

  // -------------------------------------------------------------
  // Derived State: Aggregated Stats
  // -------------------------------------------------------------
  const stats = useMemo(() => {
    const now = Date.now();
    return tickets.reduce(
      (acc, t) => {
        const isResolved = t.status === 'RESOLVED';
        if (!isResolved) {
          acc.total += 1;
          if (t.priority === 'CRITICAL') acc.critical += 1;
          if (t.assignedAgentId === 'unassigned') acc.unassigned += 1;
          const remainingMs = new Date(t.slaDeadline).getTime() - now;
          if (remainingMs <= 15 * 60 * 1000) acc.breached += 1;
        }
        return acc;
      },
      { total: 0, critical: 0, breached: 0, unassigned: 0 }
    );
  }, [tickets]);

  // -------------------------------------------------------------
  // Mutation Handlers (Lifting State Up)
  // -------------------------------------------------------------

  // Handler: Change Ticket Priority & Recalculate SLA Deadline
  const handlePriorityChange = useCallback((ticketId, newPriority) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        // Recalculate deadline from original creation time
        const newDeadline = calculateSlaDeadline(new Date(t.createdAt), newPriority);
        return {
          ...t,
          priority: newPriority,
          slaDeadline: newDeadline
        };
      })
    );
  }, []);

  // Handler: Reassign Agent
  const handleAssignAgent = useCallback((ticketId, newAgentId) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, assignedAgentId: newAgentId } : t))
    );
  }, []);

  // Handler: Toggle Resolved State
  const handleToggleResolve = useCallback((ticketId) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const newStatus = t.status === 'RESOLVED' ? 'IN_PROGRESS' : 'RESOLVED';
        return { ...t, status: newStatus };
      })
    );
  }, []);

  // Handler: Filter Changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({ priority: 'ALL', assignee: 'ALL', onlyBreachedOrUrgent: false, searchQuery: '' });
  };

  // -------------------------------------------------------------
  // DEMONSTRATION OF EDGE CASE:
  // "Retroactive SLA Breach on Priority Escalation Mid-Flight"
  // -------------------------------------------------------------
  const handleTriggerEdgeCase = () => {
    const targetTicketId = 'TICK-1085';
    const targetTicket = tickets.find((t) => t.id === targetTicketId);

    if (!targetTicket) return;

    // Escalate LOW (48h SLA) ticket created 5 hours ago to CRITICAL (1h SLA)
    handlePriorityChange(targetTicketId, 'CRITICAL');

    setEdgeCaseBanner({
      ticketId: targetTicketId,
      message: `Edge Case Triggered on ${targetTicketId}: Priority escalated from LOW (48h policy) to CRITICAL (1h policy). Since the ticket was opened 5 hours ago, recalculating the 1h deadline makes it retroactively SLA-breached by 4 hours. Notice how SlaTracker immediately flips to 'SLA BREACHED (+4h ago)' without timer NaN glitches or negative number crashes!`
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Interactive Controls for Demonstrating States */}
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️ Support Desk State Simulator</span>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#334155' }}>
              Day 5 React State & Component Design
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
            Toggle between async states and test the SLA escalation edge case live.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setViewMode('success')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: viewMode === 'success' ? '2px solid #38bdf8' : '1px solid #475569',
              backgroundColor: viewMode === 'success' ? '#1e293b' : '#334155',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ✓ Live Data ({tickets.length})
          </button>

          <button
            type="button"
            onClick={() => setViewMode('loading')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: viewMode === 'loading' ? '2px solid #38bdf8' : '1px solid #475569',
              backgroundColor: viewMode === 'loading' ? '#1e293b' : '#334155',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⏳ Show Loading State
          </button>

          <button
            type="button"
            onClick={() => setViewMode('empty')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: viewMode === 'empty' ? '2px solid #38bdf8' : '1px solid #475569',
              backgroundColor: viewMode === 'empty' ? '#1e293b' : '#334155',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📭 Show Empty State
          </button>

          <button
            type="button"
            onClick={() => setViewMode('error')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: viewMode === 'error' ? '2px solid #ef4444' : '1px solid #475569',
              backgroundColor: viewMode === 'error' ? '#1e293b' : '#334155',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⚠️ Show Error State
          </button>

          <button
            type="button"
            onClick={handleTriggerEdgeCase}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.4)'
            }}
          >
            ⚡ Demonstrate Edge Case
          </button>
        </div>
      </div>

      {/* Edge Case Active Alert Banner */}
      {edgeCaseBanner && (
        <div
          role="region"
          aria-live="polite"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#92400e' }}>
                Edge Case Live Demo: Retroactive SLA Breach
              </div>
              <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '2px', lineHeight: 1.5 }}>
                {edgeCaseBanner.message}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEdgeCaseBanner(null)}
            style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
          Customer Support Desk
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
          Real-time ticket triage, priority escalation, agent load-balancing, and SLA compliance monitoring.
        </p>
      </div>

      {/* Top Aggregated Metric Cards */}
      <StatsOverview stats={stats} />

      {/* Search and Filter Bar */}
      <FilterToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* View States: Loading, Error, Empty, or Live Tickets */}
      {viewMode === 'loading' && (
        <StateView type="loading" />
      )}

      {viewMode === 'error' && (
        <StateView
          type="error"
          title="503 Service Unavailable: Support API Timeout"
          description="Failed to fetch live support tickets from the queue microservice. Circuit breaker tripped after 3 failed retries."
          onAction={() => setViewMode('success')}
          actionLabel="🔄 Reconnect and Retry"
        />
      )}

      {viewMode === 'empty' && (
        <StateView
          type="empty"
          title="Zero Unresolved Tickets"
          description="All customer support tickets have been resolved and all SLA windows are clear. Great job!"
          onAction={() => setViewMode('success')}
          actionLabel="Load Sample Queue"
        />
      )}

      {viewMode === 'success' && (
        <>
          {filteredTickets.length === 0 ? (
            <StateView
              type="empty"
              title="No Tickets Match Filter Criteria"
              description="Try adjusting your priority, assignee, or keyword search filters."
              onAction={handleResetFilters}
              actionLabel="Clear Filter Criteria"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onPriorityChange={handlePriorityChange}
                  onAssignAgent={handleAssignAgent}
                  onToggleResolve={handleToggleResolve}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
