import { escapeHtml } from '../utils.js';
import type { LivePendingActionStatus } from '../types.js';

export const DASHBOARD_ROUTE_PATH = '/plugins/clawguard/dashboard';
export const CHECKUP_ROUTE_PATH = '/plugins/clawguard/checkup';
export const APPROVALS_ROUTE_PATH = '/plugins/clawguard/approvals';
export const AUDIT_ROUTE_PATH = '/plugins/clawguard/audit';
export const SETTINGS_ROUTE_PATH = '/plugins/clawguard/settings';

export type OperatorActionId =
  | 'review-approvals'
  | 'retry-approved-actions'
  | 'inspect-audit-signals'
  | 'review-demo-posture';

type OperatorActionTarget = '_self';
type OperatorActionSurfaceId = 'approvals' | 'audit' | 'settings';

type OperatorActionSurface = {
  readonly id: OperatorActionSurfaceId;
  readonly label: string;
};

type OperatorActionDefinition = {
  readonly id: OperatorActionId;
  readonly href: string;
  readonly target: OperatorActionTarget;
  readonly surface: OperatorActionSurface;
  readonly label: string;
  readonly intent: string;
};

export type OperatorActionLink = OperatorActionDefinition;

export type OperatorQuickAction = OperatorActionLink & {
  readonly title: string;
  readonly description: string;
  readonly cta: string;
  readonly relatedCheckupItemIds: readonly string[];
};

export type RecommendedOperatorAction = OperatorActionLink & {
  readonly actionId: OperatorActionId;
  readonly summary: string;
};

type ControlSurfacePage = {
  readonly href: string;
  readonly label: string;
  readonly role: string;
  readonly intro: string;
};

type CoverageLane = {
  readonly id: 'exec' | 'outbound' | 'workspace';
  readonly label: string;
  readonly summary: string;
};

export type ControlSurfaceDomain = 'exec' | 'outbound' | 'workspace' | 'other';

export interface ControlSurfaceDomainBreakdown {
  readonly exec: number;
  readonly outbound: number;
  readonly workspace: number;
  readonly other: number;
}

export interface ControlSurfaceLanePressure {
  readonly leadLabel: string | null;
  readonly leadCount: number;
  readonly namedTotal: number;
  readonly mix: string;
}

export type ControlSurfaceHandoffMode = 'dashboard' | 'checkup';

export const INSTALL_DEMO = {
  title: 'ClawGuard for OpenClaw install demo',
  releaseStatus: 'Install demo only. Not a formal release.',
  published: false,
  demoPosture:
    'Alpha install-demo only. Unpublished and fake-only. This remains a plugin-owned page rather than a stock Control UI Security tab.',
  packageName: '@clawguard/openclaw-clawguard',
  packageNamePosture: 'Metadata and future compatibility placeholder only.',
  recommendedMethod: 'Local path install from the repo root.',
  recommendedCommand: 'openclaw plugins install .\\plugins\\openclaw-clawguard',
  optionalMethod: 'Local tarball install only. No registry implication.',
  optionalPackedArtifactHint: 'pnpm --dir plugins\\openclaw-clawguard pack',
  readmePath: 'plugins/openclaw-clawguard/README.md',
  docsPath: 'docs/v1-installer-demo-strategy.md',
  reloadRequirement: 'Restart OpenClaw after install; hot reload is not assumed for the demo.',
  smokePaths: [
    DASHBOARD_ROUTE_PATH,
    CHECKUP_ROUTE_PATH,
    APPROVALS_ROUTE_PATH,
    AUDIT_ROUTE_PATH,
    SETTINGS_ROUTE_PATH,
  ],
  coverage:
    'Risky exec approvals, minimal outbound checks, and limited workspace mutation heuristics for write / edit / apply_patch. This alpha UI stays fake-only and does not claim broad outbound or workspace coverage.',
  limitations:
    'Host-level direct outbound cannot enter the pending approval loop, so message_sending stays on the hard-block path for both approve_required and block cases; message_sent only closes sends that were actually allowed to leave the host, while tool-level approvals stay on message / sessions_send.',
  navigationPosture:
    'There is no stock Control UI Security tab for this alpha, and ClawGuard does not depend on a patched nav hack.',
} as const;

const CONTROL_SURFACE_POSTURE =
  'Alpha control surface only. Plugin-owned, install-demo only, unpublished, fake-only, and not a stock Control UI Security tab.';
const CONTROL_SURFACE_SCOPE =
  'These pages reorganize the same bounded approval, posture, and audit signals only. They do not add new hooks, broader outbound coverage, or extra workspace capture.';
const CONTROL_SURFACE_RELATIONSHIP =
  'Dashboard = status · Checkup = explanation · Approvals = action · Audit = replay.';
const APPROVALS_QUEUE_BOUNDARY_COPY =
  'This page only shows live queue states: pending and approved_waiting_retry. Once a flow lands in denied, expired, consumed, or evicted, it leaves this queue and is only explainable from Audit replay.';
const APPROVALS_PENDING_HANDOFF_COPY =
  'This stays in the live queue until someone approves or denies it here. After that live step closes, inspect Audit for the final replay outcome.';
const APPROVALS_RETRY_HANDOFF_COPY =
  'This is the handoff state between Approvals and Audit. Retry the same tool call once, then inspect Audit for the final allowed, blocked, or failed ending after it leaves the live queue.';
const APPROVALS_TO_AUDIT_HANDOFF_COPY =
  'This is the approvals-to-audit handoff. Retry the same fake-only tool call once outside this page, then check Audit for the final allowed, blocked, or failed outcome.';
const AUDIT_APPROVALS_CLOSED_HANDOFF_COPY =
  'This replay started in Approvals. The live queue handoff is over; inspect the final outcome here.';
const AUDIT_DIRECT_HANDOFF_COPY =
  'This replay did not originate from Approvals, so Audit is the primary place to inspect the recorded ending.';
const AUDIT_LIVE_QUEUE_HINT_COPY =
  `If a replay says <strong>Waiting for decision</strong> or <strong>Waiting for approved retry</strong>, the flow is still live in <a href="${APPROVALS_ROUTE_PATH}">Approvals</a>. Once it leaves the live queue, inspect the final outcome here.`;
const COVERAGE_LANES: readonly CoverageLane[] = [
  {
    id: 'exec',
    label: 'Exec',
    summary:
      'Approval demo path only. Risky command execution can queue for review, then replay once after approval.',
  },
  {
    id: 'outbound',
    label: 'Outbound',
    summary:
      'Tool-level message and sessions_send can queue approvals, while host-level message_sending stays on the hard-block path and only closes through message_sent after a send actually leaves the host.',
  },
  {
    id: 'workspace',
    label: 'Workspace',
    summary:
      'Limited to write, edit, and apply_patch with alpha-safe heuristics plus a workspace-only tool_result_persist fallback for result closure.',
  },
] as const;

const OPERATOR_ACTIONS: Record<OperatorActionId, OperatorActionDefinition> = {
  'review-approvals': {
    id: 'review-approvals',
    href: APPROVALS_ROUTE_PATH,
    target: '_self',
    surface: {
      id: 'approvals',
      label: 'Approvals',
    },
    label: 'Open approvals queue',
    intent: 'Review live risky actions that still need a human decision.',
  },
  'retry-approved-actions': {
    id: 'retry-approved-actions',
    href: APPROVALS_ROUTE_PATH,
    target: '_self',
    surface: {
      id: 'approvals',
      label: 'Approvals',
    },
    label: 'Open approved retry backlog',
    intent: 'Find approved fake-only actions that still need one controlled retry.',
  },
  'inspect-audit-signals': {
    id: 'inspect-audit-signals',
    href: AUDIT_ROUTE_PATH,
    target: '_self',
    surface: {
      id: 'audit',
      label: 'Audit',
    },
    label: 'Open audit replay',
    intent: 'Replay what ClawGuard blocked, queued, allowed, or failed.',
  },
  'review-demo-posture': {
    id: 'review-demo-posture',
    href: SETTINGS_ROUTE_PATH,
    target: '_self',
    surface: {
      id: 'settings',
      label: 'Settings',
    },
    label: 'Open install-demo settings',
    intent: 'Confirm alpha limits, TTLs, and install-demo guardrails.',
  },
};

const NAV_ITEMS: readonly ControlSurfacePage[] = [
  {
    href: DASHBOARD_ROUTE_PATH,
    label: 'Dashboard',
    role: 'status',
    intro:
      'Start here for the current Alpha status, the main drag, and the first fix. Then use Checkup for explanation, Approvals for action, and Audit for replay.',
  },
  {
    href: CHECKUP_ROUTE_PATH,
    label: 'Checkup',
    role: 'explanation',
    intro:
      'Use this page to explain why the current status looks the way it does. Dashboard gives the summary, Approvals handles the live decision, and Audit shows the replay.',
  },
  {
    href: APPROVALS_ROUTE_PATH,
    label: 'Approvals',
    role: 'action',
    intro:
      'Use this page to take the live approve-or-deny action on risky requests. Dashboard shows the current status, Checkup explains the posture, and Audit replays what happened afterward.',
  },
  {
    href: AUDIT_ROUTE_PATH,
    label: 'Audit',
    role: 'replay',
    intro:
      'Use this page to replay how a risky flow unfolded over time. Dashboard shows the current status, Checkup explains why, and Approvals is where the human action happens.',
  },
  {
    href: SETTINGS_ROUTE_PATH,
    label: 'Settings',
    role: 'limits',
    intro:
      'Use this page to inspect install-demo limits and metadata without changing the control-surface scope.',
  },
] as const;

function getControlSurfacePage(currentPath: string): ControlSurfacePage {
  return NAV_ITEMS.find((item) => item.href === currentPath) ?? NAV_ITEMS[0];
}

export function renderControlSurfaceIntro(currentPath: string): string {
  const page = getControlSurfacePage(currentPath);

  return `<p><strong>${CONTROL_SURFACE_POSTURE}</strong> ${CONTROL_SURFACE_SCOPE}</p>
<p><strong>${page.label} = ${page.role}</strong>. ${page.intro}</p>`;
}

export function renderClawGuardNav(currentPath: string): string {
  const pageLinks = NAV_ITEMS.map((item) =>
    item.href === currentPath
      ? `<strong>${item.label}</strong> <small aria-current="page">${item.role}</small>`
      : `<a href="${item.href}">${item.label}</a> <small>${item.role}</small>`,
  ).join(' · ');

  return `<nav aria-label="ClawGuard alpha control surface">
<p><strong>Alpha control surface</strong> — ${CONTROL_SURFACE_RELATIONSHIP}</p>
<p>${pageLinks}</p>
</nav>`;
}

export function renderInstallDemoPostureNote(): string {
  return `<p><strong>${INSTALL_DEMO.demoPosture}</strong> ${INSTALL_DEMO.navigationPosture}</p>`;
}

export function renderLifecycleHandoffCopy(mode: ControlSurfaceHandoffMode): string {
  switch (mode) {
    case 'dashboard':
      return `Need the deeper Alpha explanation? Open the plugin-owned <a href="${CHECKUP_ROUTE_PATH}">full safety checkup</a> for the same read-only posture source with per-item evidence and follow-up actions, then use <a href="${APPROVALS_ROUTE_PATH}">Approvals</a> for any live item that still needs a decision or retry, and use <a href="${AUDIT_ROUTE_PATH}">Audit</a> for the final closure after the item leaves the queue.`;
    case 'checkup':
      return 'When an item is still live, continue to Approvals to act on it; when it has already closed, continue to Audit for the final replay trail.';
  }
}

export function renderCoverageMatrix(): string {
  const items = COVERAGE_LANES.map(
    (lane) =>
      `<li><strong>${lane.label}</strong> (<code>${lane.id}</code>) — ${escapeHtml(lane.summary)}</li>`,
  ).join('\n');

  return `<ul>${items}</ul>`;
}

export function summarizeControlSurfaceDomains(
  entries: ReadonlyArray<{ readonly tool_name?: string }>,
): ControlSurfaceDomainBreakdown {
  const summary = {
    exec: 0,
    outbound: 0,
    workspace: 0,
    other: 0,
  };

  for (const entry of entries) {
    summary[classifyControlSurfaceDomain(entry.tool_name)] += 1;
  }

  return summary;
}

export function renderControlSurfaceDomainBreakdown(
  counts: ControlSurfaceDomainBreakdown,
): string {
  return `<ul>
  <li><strong>Exec</strong>: ${counts.exec}</li>
  <li><strong>Outbound</strong>: ${counts.outbound}</li>
  <li><strong>Workspace</strong>: ${counts.workspace}</li>
  <li><strong>Other</strong>: ${counts.other}</li>
</ul>`;
}

export function summarizeControlSurfaceLanePressure(
  counts: ControlSurfaceDomainBreakdown,
): ControlSurfaceLanePressure {
  const namedTotal = counts.exec + counts.outbound + counts.workspace;
  const lead = getDominantNamedControlSurfaceDomain(counts);
  const leadCount = counts[lead];
  const leadLabel = namedTotal > 0 ? CONTROL_SURFACE_DOMAIN_LABELS[lead] : null;

  return {
    leadLabel,
    leadCount,
    namedTotal,
    mix: `Exec ${counts.exec} · Outbound ${counts.outbound} · Workspace ${counts.workspace}${
      counts.other > 0 ? ` · Other ${counts.other}` : ''
    }`,
  };
}

export function renderApprovalsQueueBoundaryCopy(): string {
  return APPROVALS_QUEUE_BOUNDARY_COPY;
}

export function renderApprovalsHandoffCopy(status: LivePendingActionStatus): string {
  switch (status) {
    case 'pending':
      return APPROVALS_PENDING_HANDOFF_COPY;
    case 'approved_waiting_retry':
      return APPROVALS_RETRY_HANDOFF_COPY;
  }
}

export function renderApprovalsToAuditHandoffCopy(): string {
  return APPROVALS_TO_AUDIT_HANDOFF_COPY;
}

export function renderAuditLiveQueueHintCopy(): string {
  return AUDIT_LIVE_QUEUE_HINT_COPY;
}

export function renderAuditFlowHandoffCopy(origin: 'approvals' | 'direct', isStillLive: boolean): string {
  if (origin === 'approvals') {
    return isStillLive
      ? `This replay started in ${renderOperatorActionLink(getOperatorAction('review-approvals'), 'Approvals')}. Use the live queue for the next operator step, then return here for final closure.`
      : AUDIT_APPROVALS_CLOSED_HANDOFF_COPY;
  }

  return AUDIT_DIRECT_HANDOFF_COPY;
}

export function getOperatorAction(id: OperatorActionId): OperatorActionLink {
  return OPERATOR_ACTIONS[id];
}

export function createOperatorQuickAction(
  id: OperatorActionId,
  copy: {
    readonly title: string;
    readonly description: string;
    readonly relatedCheckupItemIds: readonly string[];
    readonly cta?: string;
  },
): OperatorQuickAction {
  const action = getOperatorAction(id);

  return {
    ...action,
    title: copy.title,
    description: copy.description,
    cta: copy.cta ?? action.label,
    relatedCheckupItemIds: [...copy.relatedCheckupItemIds],
  };
}

export function createRecommendedOperatorAction(
  id: OperatorActionId,
  copy: {
    readonly summary: string;
  },
): RecommendedOperatorAction {
  return {
    ...getOperatorAction(id),
    actionId: id,
    summary: copy.summary,
  };
}

export function renderOperatorActionLink(
  action: Pick<OperatorActionLink, 'href' | 'target'>,
  label: string,
): string {
  return `<a href="${escapeHtml(action.href)}" target="${escapeHtml(action.target)}">${escapeHtml(label)}</a>`;
}

function classifyControlSurfaceDomain(toolName: string | undefined): ControlSurfaceDomain {
  const normalized = toolName?.trim().toLowerCase();

  switch (normalized) {
    case 'exec':
      return 'exec';
    case 'message':
    case 'sessions_send':
    case 'message_sending':
      return 'outbound';
    case 'write':
    case 'edit':
    case 'apply_patch':
      return 'workspace';
    default:
      return 'other';
  }
}

const CONTROL_SURFACE_DOMAIN_LABELS: Record<Exclude<ControlSurfaceDomain, 'other'>, string> = {
  exec: 'Exec',
  outbound: 'Outbound',
  workspace: 'Workspace',
};

const CONTROL_SURFACE_DOMAIN_PRIORITY: readonly Exclude<ControlSurfaceDomain, 'other'>[] = [
  'exec',
  'outbound',
  'workspace',
];

function getDominantNamedControlSurfaceDomain(
  counts: ControlSurfaceDomainBreakdown,
): Exclude<ControlSurfaceDomain, 'other'> {
  return CONTROL_SURFACE_DOMAIN_PRIORITY.reduce((winner, candidate) =>
    counts[candidate] > counts[winner] ? candidate : winner,
  'exec');
}
