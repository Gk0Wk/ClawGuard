import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ClawGuardState } from '../services/state.js';
import { escapeHtml } from '../utils.js';
import { createDashboardPayload, summarizeCheckupStatus } from './dashboard.js';
import {
  CHECKUP_ROUTE_PATH,
  DASHBOARD_ROUTE_PATH,
  INSTALL_DEMO,
  renderClawGuardNav,
  renderControlSurfaceIntro,
  renderCoverageMatrix,
  renderControlSurfaceDomainBreakdown,
  renderInstallDemoPostureNote,
  renderLifecycleHandoffCopy,
  renderOutboundHandoffCopy,
  renderOperatorActionLink,
  summarizeControlSurfaceLanePressure,
} from './shared.js';

function renderEvidenceValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }

  return JSON.stringify(value);
}

function renderEvidence(evidence: Record<string, unknown>): string {
  const items = Object.entries(evidence)
    .filter(([, value]) => value !== undefined)
    .map(
      ([label, value]) =>
        `<li><strong>${escapeHtml(label)}</strong>: ${escapeHtml(renderEvidenceValue(value))}</li>`,
    )
    .join('\n');

  return items
    ? `<div><strong>Evidence available right now</strong><ul>${items}</ul></div>`
    : '<p><small>No extra evidence is available for this item yet.</small></p>';
}

function renderCheckupPage(state: ClawGuardState): string {
  const payload = createDashboardPayload(state);
  const approvalsLanePressure = summarizeControlSurfaceLanePressure(
    payload.controlSurface.domainBreakdown.approvals,
  );
  const recentAuditLanePressure = summarizeControlSurfaceLanePressure(
    payload.controlSurface.domainBreakdown.recentAudit,
  );
  const checkupItems = payload.checkup.items
    .map(
      (item) => `
        <article id="checkup-${escapeHtml(item.id)}">
          <h3>${escapeHtml(summarizeCheckupStatus(item.status))} — ${escapeHtml(item.label)}</h3>
          <p>${escapeHtml(item.explanation)}</p>
          ${renderEvidence(item.evidence)}
          <p><strong>Follow-up:</strong> ${renderOperatorActionLink(item.recommendedAction, item.recommendedAction.label)} — ${escapeHtml(item.recommendedAction.summary)}</p>
          <p><small>Action ID: <code>${escapeHtml(item.recommendedAction.actionId)}</code> · Opens ${escapeHtml(item.recommendedAction.surface.label)} · Operator intent: ${escapeHtml(item.recommendedAction.intent)}</small></p>
        </article>
      `,
    )
    .join('\n');
  const quickActions = payload.quickActions
    .map(
      (action) => `
        <li id="action-${escapeHtml(action.id)}">
          <strong>${escapeHtml(action.title)}</strong> — ${escapeHtml(action.description)}
          ${renderOperatorActionLink(action, action.cta)}
          <br />
          <small>Action ID: <code>${escapeHtml(action.id)}</code> · Opens ${escapeHtml(action.surface.label)} · Intent: ${escapeHtml(action.intent)}</small>
          <br />
          <small>Linked checkup item: ${action.relatedCheckupItemIds.map((itemId) => escapeHtml(itemId)).join(', ')}</small>
        </li>
      `,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ClawGuard safety checkup</title>
  </head>
  <body>
    <h1>ClawGuard safety checkup</h1>
    ${renderControlSurfaceIntro(CHECKUP_ROUTE_PATH)}
    ${renderClawGuardNav(CHECKUP_ROUTE_PATH)}
    ${renderInstallDemoPostureNote()}
    <p>Use <a href="${DASHBOARD_ROUTE_PATH}">${DASHBOARD_ROUTE_PATH}</a> for the Alpha status view, then come here for the deeper explanation of the same read-only posture aggregation.</p>
    <section>
      <h2>Top status summary</h2>
      <p><strong>${escapeHtml(payload.safetyStatus.label)}</strong> — ${escapeHtml(payload.safetyStatus.summary)}</p>
      <p><strong>${payload.safetyStatus.score.passed}/${payload.safetyStatus.score.total}</strong> posture checks are currently passing.</p>
      <p>${escapeHtml(payload.safetyStatus.explanation)}</p>
      <p><strong>Why this status:</strong> ${escapeHtml(payload.safetyStatus.why)}</p>
      <p><a href="${DASHBOARD_ROUTE_PATH}">Back to dashboard summary</a></p>
    </section>
    <section>
      <h2>Current bounded coverage</h2>
      <p>This is the fixed install-demo legend for the current product surface. It explains what each active lane does today without claiming broader runtime coverage.</p>
      ${renderCoverageMatrix()}
    </section>
    <section>
      <h2>Outbound handoff</h2>
      ${renderOutboundHandoffCopy()}
    </section>
    <section>
      <h2>Live posture by domain</h2>
      <p>This is the live split of the same posture signals used to produce the current dashboard summary.</p>
      <p><strong>Main drag lane:</strong> ${approvalsLanePressure.leadLabel ? `${escapeHtml(approvalsLanePressure.leadLabel)} is the heaviest lane in the approvals queue (${approvalsLanePressure.leadCount} live signal${approvalsLanePressure.leadCount === 1 ? '' : 's'} among ${approvalsLanePressure.namedTotal} named signal${approvalsLanePressure.namedTotal === 1 ? '' : 's'}).` : 'No named lane is leading the approvals queue right now.'}</p>
      <p><small>Split: ${escapeHtml(approvalsLanePressure.mix)}</small></p>
      <h3>Approvals queue</h3>
      ${renderControlSurfaceDomainBreakdown(payload.controlSurface.domainBreakdown.approvals)}
      <h3>Recent audit trail</h3>
      <p><strong>Recent audit lane pressure:</strong> ${recentAuditLanePressure.leadLabel ? `${escapeHtml(recentAuditLanePressure.leadLabel)} is the heaviest lane in the recent audit trail (${recentAuditLanePressure.leadCount} live signal${recentAuditLanePressure.leadCount === 1 ? '' : 's'} among ${recentAuditLanePressure.namedTotal} named signal${recentAuditLanePressure.namedTotal === 1 ? '' : 's'}).` : 'No named lane is leading the recent audit trail right now.'}</p>
      <p><small>Split: ${escapeHtml(recentAuditLanePressure.mix)}</small></p>
      ${renderControlSurfaceDomainBreakdown(payload.controlSurface.domainBreakdown.recentAudit)}
    </section>
    <section>
      <h2>Main drag and fix first</h2>
      <p><strong>Main drag:</strong> ${escapeHtml(payload.checkup.mainDrag.label)} — ${escapeHtml(payload.checkup.mainDrag.explanation)}</p>
      <p><small>Mapped action: ${renderOperatorActionLink(payload.checkup.mainDrag.recommendedAction, payload.checkup.mainDrag.recommendedAction.label)} · Action ID: <code>${escapeHtml(payload.checkup.mainDrag.recommendedAction.actionId)}</code> · Opens ${escapeHtml(payload.checkup.mainDrag.recommendedAction.surface.label)} · Intent: ${escapeHtml(payload.checkup.mainDrag.recommendedAction.intent)}</small></p>
      <p><small>Lane pressure: ${approvalsLanePressure.leadLabel ? `${escapeHtml(approvalsLanePressure.leadLabel)} is still the lane behind the current main drag.` : 'No named lane currently dominates the approvals queue.'}</small></p>
      <p><strong>Fix first:</strong> ${renderOperatorActionLink(payload.checkup.firstFix, payload.checkup.firstFix.title)} — ${escapeHtml(payload.checkup.firstFix.why)}</p>
      <p><small>Action ID: <code>${escapeHtml(payload.checkup.firstFix.actionId)}</code> · Opens ${escapeHtml(payload.checkup.firstFix.surface.label)} · Linked item: <code>${escapeHtml(payload.checkup.firstFix.checkupItemId)}</code> · Intent: ${escapeHtml(payload.checkup.firstFix.intent)}</small></p>
      <p><small>That first fix stays aligned with the same approvals-queue lane pressure.</small></p>
      <p><small>${escapeHtml(INSTALL_DEMO.limitations)}</small></p>
    </section>
    <section>
      <h2>All checkup items</h2>
      <p>This page reuses the same UI-facing posture/checkup aggregation as the dashboard and expands it with item-level evidence. ${renderLifecycleHandoffCopy('checkup')}</p>
      ${checkupItems}
    </section>
    <section>
      <h2>Quick follow-up actions</h2>
      <ul>
        ${quickActions}
      </ul>
      <p><a href="${DASHBOARD_ROUTE_PATH}">Return to the dashboard</a> when you want the lighter Alpha overview again.</p>
    </section>
  </body>
</html>`;
}

export function createCheckupRoute(state: ClawGuardState) {
  return (req: IncomingMessage, res: ServerResponse): true | void => {
    const url = new URL(req.url ?? CHECKUP_ROUTE_PATH, 'http://localhost');
    if (url.pathname !== CHECKUP_ROUTE_PATH) {
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
    res.end(renderCheckupPage(state));
    return true;
  };
}
