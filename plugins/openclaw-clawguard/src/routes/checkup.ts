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
  renderInstallDemoPostureNote,
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
  const checkupItems = payload.checkup.items
    .map(
      (item) => `
        <article id="checkup-${escapeHtml(item.id)}">
          <h3>${escapeHtml(summarizeCheckupStatus(item.status))} — ${escapeHtml(item.label)}</h3>
          <p>${escapeHtml(item.explanation)}</p>
          ${renderEvidence(item.evidence)}
          <p><strong>Follow-up:</strong> <a href="${item.recommendedAction.href}">${escapeHtml(item.recommendedAction.label)}</a> — ${escapeHtml(item.recommendedAction.summary)}</p>
        </article>
      `,
    )
    .join('\n');
  const quickActions = payload.quickActions
    .map(
      (action) => `
        <li id="action-${escapeHtml(action.id)}">
          <strong>${escapeHtml(action.title)}</strong> — ${escapeHtml(action.description)}
          <a href="${action.href}">${escapeHtml(action.cta)}</a>
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
      <h2>Main drag and fix first</h2>
      <p><strong>Main drag:</strong> ${escapeHtml(payload.checkup.mainDrag.label)} — ${escapeHtml(payload.checkup.mainDrag.explanation)}</p>
      <p><strong>Fix first:</strong> <a href="${payload.checkup.firstFix.href}">${escapeHtml(payload.checkup.firstFix.title)}</a> — ${escapeHtml(payload.checkup.firstFix.why)}</p>
      <p><small>${escapeHtml(INSTALL_DEMO.limitations)}</small></p>
    </section>
    <section>
      <h2>All checkup items</h2>
      <p>This page reuses the same UI-facing posture/checkup aggregation as the dashboard and expands it with item-level evidence. When an item needs a decision, continue to Approvals; when it needs a trail, continue to Audit.</p>
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
