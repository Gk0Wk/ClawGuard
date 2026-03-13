import type { IncomingMessage, ServerResponse } from 'node:http';
import { escapeHtml } from '../utils.js';
import type { ClawGuardState } from '../services/state.js';

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

function renderApprovalsPage(state: ClawGuardState): string {
  const entries = state.pendingActions.list();
  const items = entries
    .map((entry) => {
      const params = escapeHtml(JSON.stringify(entry.params, null, 2));
      const actions =
        entry.status === 'pending'
          ? `
            <form method="post" action="/plugins/clawguard/approvals/${escapeHtml(entry.pending_action_id)}/approve">
              <button type="submit">Approve once</button>
            </form>
            <form method="post" action="/plugins/clawguard/approvals/${escapeHtml(entry.pending_action_id)}/deny">
              <button type="submit">Deny</button>
            </form>
          `
          : '<em>No actions available.</em>';

      return `
        <article>
          <h2>${escapeHtml(entry.pending_action_id)}</h2>
          <p><strong>Status:</strong> ${escapeHtml(entry.status)}</p>
          <p><strong>Tool:</strong> ${escapeHtml(entry.tool_name)}</p>
          <p><strong>Reason:</strong> ${escapeHtml(entry.reason_summary)}</p>
          <p><strong>Expires:</strong> ${escapeHtml(entry.expires_at)}</p>
          <pre>${params}</pre>
          ${actions}
        </article>
      `;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ClawGuard approvals</title>
  </head>
  <body>
    <h1>ClawGuard approvals</h1>
    <p>Review risky actions, approve once, then retry the same tool call.</p>
    <nav>
      <a href="/plugins/clawguard/approvals">Approvals</a>
      <a href="/plugins/clawguard/audit">Audit</a>
      <a href="/plugins/clawguard/settings">Settings</a>
    </nav>
    ${items || '<p>No pending actions.</p>'}
  </body>
</html>`;
}

export function createApprovalsRoute(state: ClawGuardState) {
  return (req: IncomingMessage, res: ServerResponse): true | void => {
    const url = new URL(req.url ?? '/plugins/clawguard/approvals', 'http://localhost');
    const pathname = url.pathname;

    if (!pathname.startsWith('/plugins/clawguard/approvals')) {
      return undefined;
    }

    if (req.method === 'GET') {
      if (url.searchParams.get('format') === 'json') {
        return endJson(res, 200, {
          approvals: state.pendingActions.list(),
        });
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

      return redirect(res, '/plugins/clawguard/approvals');
    }

    return endJson(res, 405, { error: 'Method not allowed.' });
  };
}
