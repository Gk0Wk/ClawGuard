import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ClawGuardState } from '../services/state.js';
import type { PendingAction } from '../types.js';
import { escapeHtml } from '../utils.js';
import {
  APPROVALS_ROUTE_PATH,
  AUDIT_ROUTE_PATH,
  CHECKUP_ROUTE_PATH,
  DASHBOARD_ROUTE_PATH,
  INSTALL_DEMO,
  renderClawGuardNav,
  renderControlSurfaceIntro,
  renderInstallDemoPostureNote,
} from './shared.js';

type ApprovalStateGuide = {
  readonly state: 'pending' | 'approved_waiting_retry';
  readonly title: string;
  readonly meaning: string;
  readonly operatorAction: string;
};

const LIVE_STATE_GUIDE: ApprovalStateGuide[] = [
  {
    state: 'pending',
    title: 'Decision needed',
    meaning: 'ClawGuard paused the risky fake-only action before it could continue.',
    operatorAction:
      'Review the reason, impact scope, and guidance now. Then either approve one retry or deny the action.',
  },
  {
    state: 'approved_waiting_retry',
    title: 'Approved, waiting for one retry',
    meaning:
      'A human already approved this exact action, but the same tool call still has to be retried once before the TTL expires.',
    operatorAction:
      'Retry the same tool call once, then confirm the final result on the audit page. No second approval is available from this live state.',
  },
] as const;

const TERMINAL_STATE_BOUNDARY =
  'Non-live states such as denied, expired, consumed, and evicted are not shown in this queue. Use Audit to explain how an earlier approval path ended.';

function endHtml(res: ServerResponse, statusCode: number, body: string): true {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(body);
  return true;
}

function endJson(res: ServerResponse, statusCode: number, payload: unknown): true {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload, null, 2));
  return true;
}

function redirect(res: ServerResponse, location: string): true {
  res.statusCode = 303;
  res.setHeader('location', location);
  res.end('');
  return true;
}

function endConflict(
  res: ServerResponse,
  action: 'approve' | 'deny',
  pendingActionId: string,
  currentState?: string,
): true {
  return endJson(res, 409, {
    error: `Cannot ${action} pending action ${pendingActionId}.`,
    currentState,
  });
}

function humanizeValue(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function summarizeTool(entry: PendingAction): string {
  switch (entry.tool_name) {
    case 'exec':
      return 'Shell or command execution';
    case 'message':
    case 'sessions_send':
      return 'Message delivery';
    case 'write':
      return 'Workspace file write';
    case 'edit':
      return 'Workspace file edit';
    case 'apply_patch':
      return 'Workspace patch application';
    default:
      return `${humanizeValue(entry.tool_name)} action`;
  }
}

function summarizeStatus(status: PendingAction['status']): string {
  switch (status) {
    case 'pending':
      return 'Decision needed';
    case 'approved_waiting_retry':
      return 'Approved, waiting for one retry';
  }
}

function describeRisk(entry: PendingAction): string {
  if (entry.guidance_summary) {
    return entry.guidance_summary;
  }

  if (entry.reason_summary) {
    return entry.reason_summary;
  }

  return 'ClawGuard detected a risky fake-only action that should not continue automatically.';
}

function describeImpactScope(entry: PendingAction): string {
  return entry.impact_scope ?? 'Impact scope was not captured beyond the tool call parameters shown below.';
}

function describeOperatorAction(entry: PendingAction, approvalTtlSeconds: number): string {
  if (entry.status === 'pending') {
    return `Approve once only if this exact ${entry.tool_name} action is expected, or deny it to keep the risky path blocked.`;
  }

  return `Retry the same ${entry.tool_name} call once within ${approvalTtlSeconds} seconds of approval, then confirm whether the replay ended as allowed, blocked, or failed on ${AUDIT_ROUTE_PATH}.`;
}

function renderStateGuide(): string {
  return LIVE_STATE_GUIDE.map(
    (item) => `
      <li>
        <strong>${escapeHtml(item.title)}</strong> (<code>${escapeHtml(item.state)}</code>) — ${escapeHtml(item.meaning)}
        <br />
        <small>Operator action: ${escapeHtml(item.operatorAction)}</small>
      </li>
    `,
  ).join('\n');
}

function renderPendingItem(entry: PendingAction, approvalTtlSeconds: number): string {
  const params = escapeHtml(JSON.stringify(entry.params, null, 2));
  const actions =
    entry.status === 'pending'
      ? `
        <div>
          <form method="post" action="${APPROVALS_ROUTE_PATH}/${escapeHtml(entry.pending_action_id)}/approve">
            <button type="submit">Approve one retry</button>
          </form>
          <form method="post" action="${APPROVALS_ROUTE_PATH}/${escapeHtml(entry.pending_action_id)}/deny">
            <button type="submit">Deny and keep blocked</button>
          </form>
        </div>
      `
      : `<p><strong>Current boundary:</strong> This live item already has its one approval. The next operator step is to retry the same tool call once before ${escapeHtml(entry.expires_at)} and then verify the outcome in <a href="${AUDIT_ROUTE_PATH}">Audit</a>.</p>`;

  return `
    <article id="approval-${escapeHtml(entry.pending_action_id)}">
      <h2>${escapeHtml(summarizeTool(entry))}</h2>
      <p><strong>${escapeHtml(summarizeStatus(entry.status))}</strong> · Pending ID: <code>${escapeHtml(entry.pending_action_id)}</code></p>
      <p><strong>What action is this?</strong> ${escapeHtml(entry.tool_name)}${entry.risk_level ? ` · Risk level: ${escapeHtml(humanizeValue(entry.risk_level))}` : ''}${entry.reason_code ? ` · Rule path: <code>${escapeHtml(entry.reason_code)}</code>` : ''}</p>
      <p><strong>Why it is risky:</strong> ${escapeHtml(entry.reason_summary)}</p>
      <p><strong>Guidance:</strong> ${escapeHtml(describeRisk(entry))}</p>
      <p><strong>Impact scope:</strong> ${escapeHtml(describeImpactScope(entry))}</p>
      <p><strong>What the operator can do now:</strong> ${escapeHtml(describeOperatorAction(entry, approvalTtlSeconds))}</p>
      <p><strong>Live timing:</strong> Created ${escapeHtml(entry.created_at)} · Expires ${escapeHtml(entry.expires_at)}${entry.approved_at ? ` · Approved ${escapeHtml(entry.approved_at)}` : ''}</p>
      ${actions}
      <details>
        <summary>Show captured tool parameters</summary>
        <pre>${params}</pre>
      </details>
    </article>
  `;
}

function buildApprovalsPayload(state: ClawGuardState) {
  const entries = [...state.pendingActions.list()].sort((left, right) => {
    if (left.status === right.status) {
      return left.created_at.localeCompare(right.created_at);
    }

    return left.status === 'pending' ? -1 : 1;
  });
  const pending = entries.filter((entry) => entry.status === 'pending');
  const approvedWaitingRetry = entries.filter((entry) => entry.status === 'approved_waiting_retry');

  return {
    approvals: entries,
    summary: {
      totalLive: entries.length,
      pending: pending.length,
      approvedWaitingRetry: approvedWaitingRetry.length,
      approvalTtlSeconds: state.config.approvalTtlSeconds,
      pendingActionLimit: state.config.pendingActionLimit,
      installDemo: {
        releaseStatus: INSTALL_DEMO.releaseStatus,
        demoPosture: INSTALL_DEMO.demoPosture,
        published: INSTALL_DEMO.published,
      },
      relationships: {
        dashboard: DASHBOARD_ROUTE_PATH,
        checkup: CHECKUP_ROUTE_PATH,
        approvals: APPROVALS_ROUTE_PATH,
        audit: AUDIT_ROUTE_PATH,
      },
      hiddenTerminalStates: ['denied', 'expired', 'consumed', 'evicted'],
      boundaryNote: TERMINAL_STATE_BOUNDARY,
    },
    stateGuide: LIVE_STATE_GUIDE,
  };
}

function renderApprovalsPage(state: ClawGuardState): string {
  const payload = buildApprovalsPayload(state);
  const items = payload.approvals
    .map((entry) => renderPendingItem(entry, state.config.approvalTtlSeconds))
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ClawGuard approvals</title>
  </head>
  <body>
    <h1>ClawGuard approvals</h1>
    ${renderControlSurfaceIntro(APPROVALS_ROUTE_PATH)}
    ${renderClawGuardNav(APPROVALS_ROUTE_PATH)}
    ${renderInstallDemoPostureNote()}
    <p>Start at <a href="${DASHBOARD_ROUTE_PATH}">Dashboard</a> for the light overview, use <a href="${CHECKUP_ROUTE_PATH}">Checkup</a> for posture context, review decisions here, and confirm endings in <a href="${AUDIT_ROUTE_PATH}">Audit</a>.</p>
    <section>
      <h2>Live queue summary</h2>
      <p><strong>${payload.summary.pending}</strong> waiting for a decision · <strong>${payload.summary.approvedWaitingRetry}</strong> approved and waiting for one retry · <strong>${payload.summary.totalLive}</strong> live items total</p>
      <p>Approval TTL: ${payload.summary.approvalTtlSeconds} seconds · Pending action limit: ${payload.summary.pendingActionLimit}</p>
      <p>${escapeHtml(TERMINAL_STATE_BOUNDARY)}</p>
    </section>
    <section>
      <h2>How to read live states</h2>
      <ul>
        ${renderStateGuide()}
      </ul>
    </section>
    <section>
      <h2>Live approval queue</h2>
      <p>Each item explains the risky action, why ClawGuard paused it, the affected scope, and the next operator move without changing the underlying approval state machine.</p>
      ${items || `<p>No live approval items right now. Return to <a href="${DASHBOARD_ROUTE_PATH}">Dashboard</a> for the broader install-demo summary or open <a href="${AUDIT_ROUTE_PATH}">Audit</a> to explain earlier terminal states.</p>`}
    </section>
  </body>
</html>`;
}

export function createApprovalsRoute(state: ClawGuardState) {
  return (req: IncomingMessage, res: ServerResponse): true | void => {
    const url = new URL(req.url ?? APPROVALS_ROUTE_PATH, 'http://localhost');
    const pathname = url.pathname;

    if (!pathname.startsWith(APPROVALS_ROUTE_PATH)) {
      return undefined;
    }

    if (req.method === 'GET') {
      if (url.searchParams.get('format') === 'json') {
        return endJson(res, 200, buildApprovalsPayload(state));
      }
      return endHtml(res, 200, renderApprovalsPage(state));
    }

    if (req.method === 'POST') {
      const match = pathname.match(/^\/plugins\/clawguard\/approvals\/([^/]+)\/(approve|deny)$/);
      if (!match) {
        return endJson(res, 404, { error: 'Approval action not found.' });
      }

      const [, pendingActionId, rawAction] = match;
      const action: 'approve' | 'deny' = rawAction === 'approve' ? 'approve' : 'deny';
      const updated =
        action === 'approve'
          ? state.approvePendingAction(pendingActionId)
          : state.denyPendingAction(pendingActionId);
      if (!updated.ok) {
        if (updated.reason === 'invalid_transition') {
          return endConflict(res, action, pendingActionId, updated.currentState);
        }
        return endJson(res, 404, { error: 'Pending action not found.' });
      }

      return redirect(res, APPROVALS_ROUTE_PATH);
    }

    return endJson(res, 405, { error: 'Method not allowed.' });
  };
}
