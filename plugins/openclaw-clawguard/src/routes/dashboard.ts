import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuditEntry, PendingAction } from '../types.js';
import type { ClawGuardState } from '../services/state.js';
import { escapeHtml } from '../utils.js';
import {
  APPROVALS_ROUTE_PATH,
  AUDIT_ROUTE_PATH,
  DASHBOARD_ROUTE_PATH,
  INSTALL_DEMO,
  SETTINGS_ROUTE_PATH,
  renderClawGuardNav,
} from './shared.js';

const PENDING_OVERVIEW_LIMIT = 5;
const RECENT_AUDIT_LIMIT = 5;

function summarizeAudit(entries: AuditEntry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((summary, entry) => {
    summary[entry.kind] = (summary[entry.kind] ?? 0) + 1;
    return summary;
  }, {});
}

function renderPendingItem(entry: PendingAction): string {
  return `<li>
    <strong>${escapeHtml(entry.tool_name)}</strong> — ${escapeHtml(entry.reason_summary)}
    <br />
    <small>Status: ${escapeHtml(entry.status)} · Expires: ${escapeHtml(entry.expires_at)} · Pending ID: ${escapeHtml(entry.pending_action_id)}</small>
  </li>`;
}

function renderAuditItem(entry: AuditEntry): string {
  return `<li>
    <strong>${escapeHtml(entry.kind)}</strong> — ${escapeHtml(entry.detail)}
    <br />
    <small>${escapeHtml(entry.timestamp)}${entry.tool_name ? ` · Tool: ${escapeHtml(entry.tool_name)}` : ''}</small>
  </li>`;
}

function createDashboardPayload(state: ClawGuardState) {
  const pendingActions = state.pendingActions.list();
  const recentAudit = state.audit.list();
  const approvalsNeedingDecision = pendingActions.filter((entry) => entry.status === 'pending');
  const approvalsAwaitingRetry = pendingActions.filter(
    (entry) => entry.status === 'approved_waiting_retry',
  );

  return {
    installDemo: INSTALL_DEMO,
    pendingApprovals: {
      totalLive: pendingActions.length,
      awaitingDecision: approvalsNeedingDecision.length,
      awaitingRetry: approvalsAwaitingRetry.length,
      items: pendingActions.slice(0, PENDING_OVERVIEW_LIMIT),
    },
    recentAudit: {
      total: recentAudit.length,
      byKind: summarizeAudit(recentAudit.slice(0, RECENT_AUDIT_LIMIT)),
      items: recentAudit.slice(0, RECENT_AUDIT_LIMIT),
    },
    settingsSummary: {
      approvalTtlSeconds: state.config.approvalTtlSeconds,
      pendingActionLimit: state.config.pendingActionLimit,
      allowOnceGrantLimit: state.config.allowOnceGrantLimit,
    },
    nextSteps: [
      approvalsNeedingDecision.length > 0
        ? `Review ${approvalsNeedingDecision.length} pending approval(s) at ${APPROVALS_ROUTE_PATH}.`
        : 'No pending approvals currently need a decision.',
      approvalsAwaitingRetry.length > 0
        ? `Retry ${approvalsAwaitingRetry.length} approved fake-only action(s) once, then verify the outcome in ${AUDIT_ROUTE_PATH}.`
        : `Use ${AUDIT_ROUTE_PATH} to review the latest fake-only demo events.`,
      `Use ${SETTINGS_ROUTE_PATH} for current limits, install-demo metadata, and smoke paths.`,
    ],
  };
}

function renderDashboardPage(state: ClawGuardState): string {
  const payload = createDashboardPayload(state);
  const pendingItems = payload.pendingApprovals.items.map(renderPendingItem).join('\n');
  const auditItems = payload.recentAudit.items.map(renderAuditItem).join('\n');
  const auditSummary = Object.entries(payload.recentAudit.byKind)
    .map(([kind, count]) => `${kind}: ${count}`)
    .join(', ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ClawGuard dashboard</title>
  </head>
  <body>
    <h1>ClawGuard dashboard</h1>
    <p><strong>Alpha install-demo only.</strong> This plugin-owned page is the unified entry point for the current fake-only approvals, audit, and settings surfaces. It is local-install only, unpublished, and should not be presented as broad outbound or workspace protection.</p>
    ${renderClawGuardNav(DASHBOARD_ROUTE_PATH)}
    <section>
      <h2>What is this?</h2>
      <p><strong>${INSTALL_DEMO.title}</strong> — ${INSTALL_DEMO.releaseStatus}</p>
      <p>Recommended install: <code>${INSTALL_DEMO.recommendedCommand}</code></p>
      <p>Current alpha scope: ${INSTALL_DEMO.coverage}</p>
      <p>Current limitation: ${INSTALL_DEMO.limitations}</p>
    </section>
    <section>
      <h2>Pending risk that needs attention</h2>
      <p>Awaiting decision: <strong>${payload.pendingApprovals.awaitingDecision}</strong> · Awaiting retry after approval: <strong>${payload.pendingApprovals.awaitingRetry}</strong> · Live total: <strong>${payload.pendingApprovals.totalLive}</strong></p>
      ${pendingItems ? `<ul>${pendingItems}</ul>` : `<p>No live approvals right now. Open <a href="${APPROVALS_ROUTE_PATH}">Approvals</a> for the full queue.</p>`}
    </section>
    <section>
      <h2>What happened recently?</h2>
      <p>Showing the latest ${payload.recentAudit.items.length} audit event(s).${auditSummary ? ` Recent kinds: ${escapeHtml(auditSummary)}.` : ''}</p>
      ${auditItems ? `<ul>${auditItems}</ul>` : `<p>No audit events yet. Open <a href="${AUDIT_ROUTE_PATH}">Audit</a> after a fake-only demo action.</p>`}
    </section>
    <section>
      <h2>Current settings and install-demo metadata</h2>
      <p>Approval TTL: ${payload.settingsSummary.approvalTtlSeconds} seconds</p>
      <p>Pending action limit: ${payload.settingsSummary.pendingActionLimit}</p>
      <p>Allow-once grant limit: ${payload.settingsSummary.allowOnceGrantLimit}</p>
      <p>Smoke paths: <code>${INSTALL_DEMO.smokePaths.join('</code>, <code>')}</code></p>
      <p>Operator notes: <code>${INSTALL_DEMO.readmePath}</code> and <code>${INSTALL_DEMO.docsPath}</code></p>
    </section>
    <section>
      <h2>Where should I go next?</h2>
      <ol>
        ${payload.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('\n')}
      </ol>
    </section>
  </body>
</html>`;
}

export function createDashboardRoute(state: ClawGuardState) {
  return (req: IncomingMessage, res: ServerResponse): true | void => {
    const url = new URL(req.url ?? DASHBOARD_ROUTE_PATH, 'http://localhost');
    if (url.pathname !== DASHBOARD_ROUTE_PATH) {
      return undefined;
    }

    const payload = createDashboardPayload(state);

    res.statusCode = 200;
    if (url.searchParams.get('format') === 'json') {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload, null, 2));
      return true;
    }

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(renderDashboardPage(state));
    return true;
  };
}
