/**
 * Customer Support Desk Domain Constants and SLA Configuration
 */

// SLA Resolution Deadline in hours mapped by Priority Level
export const SLA_POLICIES = {
  CRITICAL: { label: 'Critical', hours: 1, color: '#ef4444', bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
  HIGH:     { label: 'High',     hours: 4, color: '#f97316', bg: '#ffedd5', text: '#9a3412', border: '#fb923c' },
  MEDIUM:   { label: 'Medium',   hours: 12, color: '#eab308', bg: '#fef9c3', text: '#854d0e', border: '#facc15' },
  LOW:      { label: 'Low',      hours: 48, color: '#3b82f6', bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' }
};

// Support Agents Roster
export const AGENTS = [
  { id: 'unassigned', name: 'Unassigned', role: 'Queue', initials: 'UN', color: '#94a3b8' },
  { id: 'agent_1', name: 'Sarah Lin', role: 'L2 Enterprise Escalations', initials: 'SL', color: '#8b5cf6' },
  { id: 'agent_2', name: 'Marcus Vance', role: 'DevOps & Infrastructure', initials: 'MV', color: '#06b6d4' },
  { id: 'agent_3', name: 'Priya Sharma', role: 'Security & Auth', initials: 'PS', color: '#ec4899' },
  { id: 'agent_4', name: 'David Kim', role: 'Billing & Subscriptions', initials: 'DK', color: '#10b981' }
];

// Helper to compute SLA deadline timestamp from creation time and priority
export function calculateSlaDeadline(createdAtDate, priority) {
  const policy = SLA_POLICIES[priority] || SLA_POLICIES.MEDIUM;
  return new Date(createdAtDate.getTime() + policy.hours * 60 * 60 * 1000);
}

// Seed Mock Tickets for Customer Support Desk
export function getInitialTickets() {
  const now = Date.now();

  return [
    {
      id: 'TICK-1082',
      title: 'Production database connection pool exhaustion under peak load',
      customer: { name: 'Acme Corp', tier: 'ENTERPRISE', email: 'devops@acme.com' },
      category: 'Infrastructure',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      assignedAgentId: 'agent_2', // Marcus Vance
      createdAt: new Date(now - 52 * 60 * 1000), // Created 52 mins ago (SLA: 1h -> 8 mins left!)
      slaDeadline: new Date(now - 52 * 60 * 1000 + 1 * 60 * 60 * 1000)
    },
    {
      id: 'TICK-1083',
      title: 'SSO SAML authentication infinite redirect loop for Okta users',
      customer: { name: 'FintechGlobal Inc', tier: 'ENTERPRISE', email: 'security@fintechglobal.io' },
      category: 'Authentication',
      priority: 'HIGH',
      status: 'OPEN',
      assignedAgentId: 'agent_3', // Priya Sharma
      createdAt: new Date(now - 90 * 60 * 1000), // Created 1.5h ago (SLA: 4h -> 2.5h left)
      slaDeadline: new Date(now - 90 * 60 * 1000 + 4 * 60 * 60 * 1000)
    },
    {
      id: 'TICK-1081',
      title: 'Outage report: Webhook dispatch failure in US-East-1 region',
      customer: { name: 'HyperScale Systems', tier: 'ENTERPRISE', email: 'admin@hyperscale.com' },
      category: 'Incident',
      priority: 'CRITICAL',
      status: 'OPEN',
      assignedAgentId: 'unassigned', // Unassigned and BREACHED!
      createdAt: new Date(now - 95 * 60 * 1000), // Created 95 mins ago (SLA: 60 mins -> BREACHED by 35 mins!)
      slaDeadline: new Date(now - 95 * 60 * 1000 + 1 * 60 * 60 * 1000)
    },
    {
      id: 'TICK-1084',
      title: 'Billing invoice discrepancy on annual reserved capacity renewal',
      customer: { name: 'CloudMetrics Co', tier: 'PRO', email: 'billing@cloudmetrics.org' },
      category: 'Billing',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      assignedAgentId: 'agent_4', // David Kim
      createdAt: new Date(now - 3 * 60 * 60 * 1000), // Created 3h ago (SLA: 12h -> 9h left)
      slaDeadline: new Date(now - 3 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)
    },
    {
      id: 'TICK-1085',
      title: 'Feature inquiry: Adding dedicated egress IP address whitelist',
      customer: { name: 'StartupVentures', tier: 'PRO', email: 'alex@startupventures.co' },
      category: 'Networking',
      priority: 'LOW',
      status: 'OPEN',
      assignedAgentId: 'unassigned',
      createdAt: new Date(now - 5 * 60 * 60 * 1000), // Created 5h ago (SLA: 48h -> 43h left)
      slaDeadline: new Date(now - 5 * 60 * 60 * 1000 + 48 * 60 * 60 * 1000)
    }
  ];
}
