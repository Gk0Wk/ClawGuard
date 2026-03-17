import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuditEntry, PendingAction } from '../types.js';
import type { ClawGuardState } from '../services/state.js';
import { escapeHtml } from '../utils.js';
import {
  APPROVALS_ROUTE_PATH,
  AUDIT_ROUTE_PATH,
  CHECKUP_ROUTE_PATH,
  DASHBOARD_ROUTE_PATH,
  SETTINGS_ROUTE_PATH,
  renderClawGuardNav,
  renderControlSurfaceIntro,
  renderInstallDemoPostureNote,
  INSTALL_DEMO,
} from './shared.js';

const PENDING_OVERVIEW_LIMIT = 5;
const RECENT_AUDIT_LIMIT = 5;
const RECENT_RISK_SIGNAL_KINDS: AuditEntry['kind'][] = [
  'risk_hit',
  'blocked',
  'failed',
  'invalid_transition',
  'recovery_error',
  'persistence_error',
];
const CHECKUP_STATUS_ORDER = {
  urgent: 3,
  needs_attention: 2,
  healthy: 1,
} as const;
const RECENT_ERROR_KINDS: AuditEntry['kind'][] = [
  'failed',
  'invalid_transition',
  'recovery_error',
  'persistence_error',
];

function summarizeAudit(entries: AuditEntry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((summary, entry) => {
    summary[entry.kind] = (summary[entry.kind] ?? 0) + 1;
    return summary;
  }, {});
}

function countAuditKinds(entries: AuditEntry[], kinds: readonly AuditEntry['kind'][]): number {
  return entries.filter((entry) => kinds.includes(entry.kind)).length;
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function summarizeCheckupStatus(status: keyof typeof CHECKUP_STATUS_ORDER): string {
  switch (status) {
    case 'urgent':
      return 'Urgent';
    case 'needs_attention':
      return 'Needs attention';
    case 'healthy':
      return 'Healthy';
  }
}

function compareCheckupItems(
  left: { status: keyof typeof CHECKUP_STATUS_ORDER; dragRank: number },
  right: { status: keyof typeof CHECKUP_STATUS_ORDER; dragRank: number },
): number {
  return (
    CHECKUP_STATUS_ORDER[right.status] - CHECKUP_STATUS_ORDER[left.status] ||
    left.dragRank - right.dragRank
  );
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

export function createDashboardPayload(state: ClawGuardState) {
  const pendingActions = state.pendingActions.list();
  const recentAudit = state.audit.list();
  const approvalsNeedingDecision = pendingActions.filter((entry) => entry.status === 'pending');
  const approvalsAwaitingRetry = pendingActions.filter(
    (entry) => entry.status === 'approved_waiting_retry',
  );
  const recentAuditItems = recentAudit.slice(0, RECENT_AUDIT_LIMIT);
  const recentRiskSignals = countAuditKinds(recentAuditItems, RECENT_RISK_SIGNAL_KINDS);
  const recentErrors = countAuditKinds(recentAuditItems, RECENT_ERROR_KINDS);
  const firstPending = approvalsNeedingDecision[0];
  const quickActions = [
    {
      id: 'review-approvals',
      title:
        approvalsNeedingDecision.length > 0 ? 'Review pending approvals' : 'Check the approvals queue',
      description:
        approvalsNeedingDecision.length > 0
          ? `Resolve ${pluralize(approvalsNeedingDecision.length, 'pending approval')} before retrying any risky fake-only action.`
          : 'The queue is clear now, but this is still the fastest place to confirm whether a risky action was held for review.',
      href: APPROVALS_ROUTE_PATH,
      cta:
        approvalsNeedingDecision.length > 0
          ? `Review ${pluralize(approvalsNeedingDecision.length, 'approval')}`
          : 'Open approvals',
      relatedCheckupItemIds: ['approval-queue'],
    },
    {
      id: 'retry-approved-actions',
      title:
        approvalsAwaitingRetry.length > 0
          ? 'Retry approved fake-only actions'
          : 'Check approved retry backlog',
      description:
        approvalsAwaitingRetry.length > 0
          ? `Retry ${pluralize(approvalsAwaitingRetry.length, 'approved action')} once inside the ${state.config.approvalTtlSeconds}s TTL, then confirm the follow-up audit result.`
          : `No approved fake-only actions are waiting right now, but the approvals page is where the single-retry backlog would appear inside the ${state.config.approvalTtlSeconds}s TTL.`,
      href: APPROVALS_ROUTE_PATH,
      cta: approvalsAwaitingRetry.length > 0 ? 'Open retry backlog' : 'Open approvals',
      relatedCheckupItemIds: ['approved-retry-backlog'],
    },
    {
      id: 'inspect-audit-signals',
      title: recentRiskSignals > 0 ? 'Inspect recent protective events' : 'Review recent audit events',
      description:
        recentErrors > 0
          ? `The latest ${recentAuditItems.length} audit event(s) include ${pluralize(recentErrors, 'error or failed outcome')} and ${pluralize(recentRiskSignals, 'total risk or error signal')}. Use the audit page to explain the failing path first.`
          : recentRiskSignals > 0
            ? `The latest ${recentAuditItems.length} audit event(s) include ${pluralize(recentRiskSignals, 'risk or error signal')}. Use the audit page to explain what ClawGuard blocked, queued, or failed.`
          : 'Use the audit page to confirm the latest fake-only actions and show that the current demo trail is quiet.',
      href: AUDIT_ROUTE_PATH,
      cta: 'Open audit',
      relatedCheckupItemIds: ['recent-audit-signals'],
    },
    {
      id: 'review-demo-posture',
      title: 'Confirm alpha limits and guardrails',
      description: `Check the live TTL (${state.config.approvalTtlSeconds}s), pending limit (${state.config.pendingActionLimit}), allow-once limit (${state.config.allowOnceGrantLimit}), and install-demo posture before any walkthrough.`,
      href: SETTINGS_ROUTE_PATH,
      cta: 'Open settings',
      relatedCheckupItemIds: ['install-demo-posture'],
    },
  ];
  const quickActionById = Object.fromEntries(quickActions.map((action) => [action.id, action]));
  const checkupItems = [
    {
      id: 'approval-queue',
      dragRank: 0,
      label:
        approvalsNeedingDecision.length > 0
          ? 'Approval queue needs a decision'
          : 'Approval queue is clear',
      status:
        approvalsNeedingDecision.length > 0 ? ('urgent' as const) : ('healthy' as const),
      passed: approvalsNeedingDecision.length === 0,
      explanation:
        approvalsNeedingDecision.length > 0
          ? `${pluralize(approvalsNeedingDecision.length, 'live approval')} ${approvalsNeedingDecision.length === 1 ? 'is' : 'are'} still waiting for a human decision. Latest: ${firstPending ? `${firstPending.tool_name} — ${firstPending.reason_summary}` : 'review the queue now'}.`
          : 'No live approvals are waiting for a human decision.',
      recommendedAction: {
        actionId: 'review-approvals',
        label: quickActionById['review-approvals'].cta,
        href: quickActionById['review-approvals'].href,
        summary: quickActionById['review-approvals'].description,
      },
      evidence: {
        awaitingDecision: approvalsNeedingDecision.length,
        totalLive: pendingActions.length,
      },
    },
    {
      id: 'recent-audit-signals',
      dragRank: 1,
      label:
        recentErrors > 0
          ? 'Recent audit includes errors or failed outcomes'
          : recentRiskSignals > 0
            ? 'Recent audit shows protective interventions'
            : 'Recent audit is calm',
      status:
        recentErrors > 0
          ? ('urgent' as const)
          : recentRiskSignals > 0
            ? ('needs_attention' as const)
            : ('healthy' as const),
      passed: recentRiskSignals === 0,
      explanation:
        recentErrors > 0
          ? `The latest ${recentAuditItems.length} audit event(s) include ${pluralize(recentErrors, 'error or failed outcome')} and ${pluralize(recentRiskSignals, 'total risk or error signal')}.`
          : recentRiskSignals > 0
            ? `The latest ${recentAuditItems.length} audit event(s) include ${pluralize(recentRiskSignals, 'risk or block signal')}, so recent behavior still needs operator explanation.`
            : `The latest ${recentAuditItems.length} audit event(s) do not include fresh risk, block, or error signals.`,
      recommendedAction: {
        actionId: 'inspect-audit-signals',
        label: quickActionById['inspect-audit-signals'].cta,
        href: quickActionById['inspect-audit-signals'].href,
        summary: quickActionById['inspect-audit-signals'].description,
      },
      evidence: {
        sampleSize: recentAuditItems.length,
        riskSignals: recentRiskSignals,
        errors: recentErrors,
      },
    },
    {
      id: 'approved-retry-backlog',
      dragRank: 2,
      label:
        approvalsAwaitingRetry.length > 0
          ? 'Approved actions still need verification'
          : 'Retry backlog is clear',
      status:
        approvalsAwaitingRetry.length > 0
          ? ('needs_attention' as const)
          : ('healthy' as const),
      passed: approvalsAwaitingRetry.length === 0,
      explanation:
        approvalsAwaitingRetry.length > 0
          ? `${pluralize(approvalsAwaitingRetry.length, 'approved action')} ${approvalsAwaitingRetry.length === 1 ? 'is' : 'are'} still waiting for the single retry inside the ${state.config.approvalTtlSeconds}-second approval TTL.`
          : 'No approved fake-only actions are waiting for their single retry.',
      recommendedAction: {
        actionId: 'retry-approved-actions',
        label: quickActionById['retry-approved-actions'].cta,
        href: quickActionById['retry-approved-actions'].href,
        summary: quickActionById['retry-approved-actions'].description,
      },
      evidence: {
        awaitingRetry: approvalsAwaitingRetry.length,
        approvalTtlSeconds: state.config.approvalTtlSeconds,
      },
    },
    {
      id: 'install-demo-posture',
      dragRank: 3,
      label: 'Coverage remains install-demo only',
      status: 'needs_attention' as const,
      passed: false,
      explanation: `${INSTALL_DEMO.demoPosture} Coverage remains limited: ${INSTALL_DEMO.coverage}`,
      recommendedAction: {
        actionId: 'review-demo-posture',
        label: quickActionById['review-demo-posture'].cta,
        href: quickActionById['review-demo-posture'].href,
        summary: quickActionById['review-demo-posture'].description,
      },
      evidence: {
        published: INSTALL_DEMO.published,
        smokePathCount: INSTALL_DEMO.smokePaths.length,
      },
    },
  ];
  const passedChecks = checkupItems.filter((item) => item.passed).length;
  const failingCheckupItems = checkupItems.filter((item) => !item.passed).sort(compareCheckupItems);
  const publicCheckupItems = checkupItems.map(({ dragRank, ...item }) => item);
  const mainDragItem = failingCheckupItems[0] ?? [...checkupItems].sort(compareCheckupItems)[0];
  const firstFixAction = quickActionById[mainDragItem.recommendedAction.actionId];
  const safetyStatusValue =
    failingCheckupItems.some((item) => item.status === 'urgent')
      ? ('urgent' as const)
      : failingCheckupItems.length > 0
        ? ('needs_attention' as const)
        : ('healthy' as const);
  const safetyLabel = summarizeCheckupStatus(safetyStatusValue);
  const topRisks = (failingCheckupItems.length > 0 ? failingCheckupItems : checkupItems)
    .slice(0, 3)
    .map((item) => ({
      checkupItemId: item.id,
      actionId: item.recommendedAction.actionId,
      severity: item.status,
      title: item.label,
      summary: item.explanation,
      actionLabel: item.recommendedAction.label,
      href: item.recommendedAction.href,
    }));

  return {
    installDemo: INSTALL_DEMO,
    safetyStatus: {
      status: safetyStatusValue,
      label: safetyLabel,
      summary:
        safetyStatusValue === 'healthy'
          ? 'The lightweight dashboard checkup is clear right now.'
          : safetyStatusValue === 'urgent'
            ? 'The dashboard sees at least one urgent drag item that should be fixed before calling this demo safe.'
            : 'The dashboard still sees follow-up work or explicit demo limits that keep this from being fully safe.',
      explanation:
        'Derived only from live approvals, approved actions waiting for retry, recent audit signals shown on this page, and explicit install-demo metadata.',
      why:
        failingCheckupItems.length > 0
          ? `This status is driven by ${failingCheckupItems.map((item) => item.label.toLowerCase()).join(', ')}.`
          : 'All checkup items are currently healthy.',
      mainDragItemId: mainDragItem.id,
      firstFixActionId: firstFixAction.id,
      score: {
        passed: passedChecks,
        total: publicCheckupItems.length,
      },
      checks: publicCheckupItems.map(({ explanation, ...item }) => ({
        ...item,
        explanation,
        detail: explanation,
      })),
    },
    checkup: {
      items: publicCheckupItems,
      failingItemIds: failingCheckupItems.map((item) => item.id),
      mainDrag: {
        itemId: mainDragItem.id,
        label: mainDragItem.label,
        status: mainDragItem.status,
        explanation: mainDragItem.explanation,
      },
      firstFix: {
        actionId: firstFixAction.id,
        title: firstFixAction.title,
        href: firstFixAction.href,
        cta: firstFixAction.cta,
        why: mainDragItem.recommendedAction.summary,
      },
    },
    pendingApprovals: {
      totalLive: pendingActions.length,
      awaitingDecision: approvalsNeedingDecision.length,
      awaitingRetry: approvalsAwaitingRetry.length,
      items: pendingActions.slice(0, PENDING_OVERVIEW_LIMIT),
    },
    recentAudit: {
      total: recentAudit.length,
      byKind: summarizeAudit(recentAuditItems),
      items: recentAuditItems,
    },
    settingsSummary: {
      approvalTtlSeconds: state.config.approvalTtlSeconds,
      pendingActionLimit: state.config.pendingActionLimit,
      allowOnceGrantLimit: state.config.allowOnceGrantLimit,
    },
    topRisks,
    quickActions,
    nextSteps: quickActions.map(
      (action) => `${action.title}: ${action.description} (${action.href})`,
    ),
  };
}

function renderDashboardPage(state: ClawGuardState): string {
  const payload = createDashboardPayload(state);
  const pendingItems = payload.pendingApprovals.items.map(renderPendingItem).join('\n');
  const auditItems = payload.recentAudit.items.map(renderAuditItem).join('\n');
  const auditSummary = Object.entries(payload.recentAudit.byKind)
    .map(([kind, count]) => `${kind}: ${count}`)
    .join(', ');
  const checkupItems = payload.checkup.items
    .map(
      (item) =>
        `<li id="checkup-${escapeHtml(item.id)}"><strong>${escapeHtml(summarizeCheckupStatus(item.status))}:</strong> ${escapeHtml(item.label)} — ${escapeHtml(item.explanation)} <a href="${item.recommendedAction.href}">${escapeHtml(item.recommendedAction.label)}</a><br /><small>Recommended next step: ${escapeHtml(item.recommendedAction.summary)}</small></li>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ClawGuard dashboard</title>
  </head>
  <body>
    <h1>ClawGuard dashboard</h1>
    ${renderControlSurfaceIntro(DASHBOARD_ROUTE_PATH)}
    ${renderClawGuardNav(DASHBOARD_ROUTE_PATH)}
    ${renderInstallDemoPostureNote()}
    <section>
      <h2>Am I safe right now?</h2>
      <p><strong>${escapeHtml(payload.safetyStatus.label)}</strong> — ${escapeHtml(payload.safetyStatus.summary)}</p>
      <p><strong>${payload.safetyStatus.score.passed}/${payload.safetyStatus.score.total}</strong> lightweight dashboard checks are passing.</p>
      <p>${escapeHtml(payload.safetyStatus.explanation)}</p>
      <p><strong>Why this status:</strong> ${escapeHtml(payload.safetyStatus.why)}</p>
      <p><strong>Main drag right now:</strong> ${escapeHtml(payload.checkup.mainDrag.label)} — ${escapeHtml(payload.checkup.mainDrag.explanation)}</p>
      <p><strong>Fix first:</strong> <a href="${payload.checkup.firstFix.href}">${escapeHtml(payload.checkup.firstFix.title)}</a> — ${escapeHtml(payload.checkup.firstFix.why)}</p>
      <ul>
        ${payload.safetyStatus.checks
          .map(
            (check) =>
              `<li><strong>${check.passed ? 'Passing' : 'Needs attention'}:</strong> ${escapeHtml(check.label)} — ${escapeHtml(check.explanation)}</li>`,
          )
          .join('\n')}
      </ul>
      <p><small>${escapeHtml(INSTALL_DEMO.navigationPosture)}</small></p>
    </section>
    <section>
      <h2>What is this?</h2>
      <p><strong>${INSTALL_DEMO.title}</strong> — ${INSTALL_DEMO.releaseStatus}</p>
      <p>Recommended install: <code>${INSTALL_DEMO.recommendedCommand}</code></p>
      <p>Current alpha scope: ${INSTALL_DEMO.coverage}</p>
      <p>Current limitation: ${INSTALL_DEMO.limitations}</p>
    </section>
    <section>
      <h2>Top attention items right now</h2>
      <ul>
        ${payload.topRisks
          .map(
            (item) =>
              `<li id="risk-${escapeHtml(item.checkupItemId)}"><strong>${escapeHtml(item.title)}</strong> (${escapeHtml(summarizeCheckupStatus(item.severity))}) — ${escapeHtml(item.summary)} <a href="${item.href}">${escapeHtml(item.actionLabel)}</a></li>`,
          )
          .join('\n')}
      </ul>
    </section>
    <section>
      <h2>Checkup details</h2>
      <p>These posture items are read-only summaries built from the current approvals queue, recent audit trail, and install-demo metadata.</p>
      <p>Need the deeper Alpha explanation? Open the plugin-owned <a href="${CHECKUP_ROUTE_PATH}">full safety checkup</a> for the same read-only posture source with per-item evidence and follow-up actions, then jump to <a href="${APPROVALS_ROUTE_PATH}">Approvals</a> for action or <a href="${AUDIT_ROUTE_PATH}">Audit</a> for replay.</p>
      <ul>
        ${checkupItems}
      </ul>
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
      <h2>Quick actions</h2>
      <ul>
        ${payload.quickActions
          .map(
            (action) =>
              `<li id="action-${escapeHtml(action.id)}"><strong>${escapeHtml(action.title)}</strong> — ${escapeHtml(action.description)} <a href="${action.href}">${escapeHtml(action.cta)}</a><br /><small>Linked checkup item: ${action.relatedCheckupItemIds.map((itemId) => escapeHtml(itemId)).join(', ')}</small></li>`,
          )
          .join('\n')}
      </ul>
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
