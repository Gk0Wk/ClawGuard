import type { EvaluationDestination, EvaluationInput, EvaluationOrigin, WorkspaceContext } from '../../domain/context/index.js';
import {
  RunStatus,
  ToolPhase,
  ToolStatus,
  type RunRef,
  type SessionRef,
  type ToolCallRef,
} from '../../domain/shared/index.js';
import { createStableId, systemClock, toIsoTimestamp, type RuntimeClock } from '../../shared/index.js';
import type { OpenClawAgentEventInput } from './agent-event.js';
import type { OpenClawBeforeToolCallInput } from './before-tool-call.js';
import type { OpenClawSessionPolicyInput } from './session-policy.js';

export interface NormalizeOpenClawInputsArgs {
  readonly before_tool_call: OpenClawBeforeToolCallInput;
  readonly session_policy: OpenClawSessionPolicyInput;
  readonly agent_event?: OpenClawAgentEventInput;
  readonly clock?: RuntimeClock;
}

export interface NormalizedOpenClawInputs {
  readonly session_ref: SessionRef;
  readonly run_ref: RunRef;
  readonly tool_call_ref: ToolCallRef;
  readonly evaluation_input: EvaluationInput;
}

export function normalizeOpenClawInputs(args: NormalizeOpenClawInputsArgs): NormalizedOpenClawInputs {
  const clock = args.clock ?? systemClock;
  const session_ref = normalizeSessionRef(args.before_tool_call, args.session_policy);
  const run_ref = normalizeRunRef(args.before_tool_call, args.agent_event, session_ref, clock);
  const tool_call_ref = normalizeToolCallRef(args.before_tool_call, args.agent_event, run_ref);
  const origin = normalizeOrigin(args.session_policy);
  const destination = normalizeDestination(args.before_tool_call.event.toolName, args.before_tool_call.event.params);
  const workspace_context = normalizeWorkspaceContext(args.before_tool_call.event.toolName, args.before_tool_call.event.params);
  const raw_text_candidates = collectRawTextCandidates(args.before_tool_call.event.params);
  const agent_event = normalizeAgentEvent(args.agent_event, tool_call_ref.tool_status, clock);

  return {
    session_ref,
    run_ref,
    tool_call_ref,
    evaluation_input: {
      tool_name: tool_call_ref.tool_name,
      tool_params: args.before_tool_call.event.params,
      session_ref,
      run_ref,
      tool_call_ref,
      origin,
      destination,
      workspace_context,
      raw_text_candidates,
      agent_event,
    },
  };
}

function normalizeSessionRef(
  beforeToolCall: OpenClawBeforeToolCallInput,
  sessionPolicy: OpenClawSessionPolicyInput,
): SessionRef {
  const normalizedToolName = normalizeToolName(beforeToolCall.event.toolName);
  const session_key =
    normalizeOptionalString(sessionPolicy.sessionKey) ??
    normalizeOptionalString(beforeToolCall.context?.sessionKey) ??
    createStableId('session', beforeToolCall.event.runId, normalizedToolName);

  return {
    session_key,
    session_id: normalizeOptionalString(sessionPolicy.sessionId ?? beforeToolCall.context?.sessionId),
    agent_id: normalizeOptionalString(sessionPolicy.agentId ?? beforeToolCall.context?.agentId),
    origin_channel: normalizeOptionalString(sessionPolicy.origin?.channel),
    origin_to: normalizeOptionalString(sessionPolicy.origin?.to),
    origin_thread:
      sessionPolicy.origin?.thread !== undefined ? normalizeOptionalString(String(sessionPolicy.origin.thread)) : undefined,
    send_policy: normalizeOptionalString(sessionPolicy.sendPolicy),
    exec_host: normalizeOptionalString(sessionPolicy.execHost),
    exec_security: normalizeOptionalString(sessionPolicy.execSecurity),
    exec_ask: sessionPolicy.execAsk,
    elevated_level: normalizeOptionalString(sessionPolicy.elevatedLevel),
  };
}

function normalizeRunRef(
  beforeToolCall: OpenClawBeforeToolCallInput,
  agentEvent: OpenClawAgentEventInput | undefined,
  sessionRef: SessionRef,
  clock: RuntimeClock,
): RunRef {
  const normalizedToolName = normalizeToolName(beforeToolCall.event.toolName);
  const run_id =
    normalizeOptionalString(beforeToolCall.event.runId) ??
    normalizeOptionalString(beforeToolCall.context?.runId) ??
    normalizeOptionalString(agentEvent?.runId) ??
    createStableId('run', sessionRef.session_key, normalizedToolName);

  return {
    run_id,
    session_key: sessionRef.session_key,
    started_at: toIsoTimestamp(agentEvent?.ts, clock),
    run_status: ToolStatusToRunStatus[normalizeToolStatus(agentEvent)],
  };
}

const ToolStatusToRunStatus = {
  [ToolStatus.Pending]: RunStatus.Running,
  [ToolStatus.Running]: RunStatus.Running,
  [ToolStatus.Completed]: RunStatus.Completed,
  [ToolStatus.Blocked]: RunStatus.Failed,
  [ToolStatus.Failed]: RunStatus.Failed,
} as const;

function normalizeToolCallRef(
  beforeToolCall: OpenClawBeforeToolCallInput,
  agentEvent: OpenClawAgentEventInput | undefined,
  runRef: RunRef,
): ToolCallRef {
  const normalizedToolName = normalizeToolName(beforeToolCall.event.toolName);

  return {
    tool_call_id:
      normalizeOptionalString(beforeToolCall.event.toolCallId) ??
      normalizeOptionalString(beforeToolCall.context?.toolCallId) ??
      normalizeOptionalString(agentEvent?.data.toolCallId) ??
      createStableId('toolcall', runRef.run_id, normalizedToolName),
    tool_name: normalizedToolName,
    run_id: runRef.run_id,
    tool_phase: ToolPhase.Before,
    tool_status: normalizeToolStatus(agentEvent),
  };
}

function normalizeOrigin(sessionPolicy: OpenClawSessionPolicyInput): EvaluationOrigin | undefined {
  if (!sessionPolicy.origin) {
    return undefined;
  }

  return {
    channel: normalizeOptionalString(sessionPolicy.origin.channel),
    to: normalizeOptionalString(sessionPolicy.origin.to),
    thread:
      sessionPolicy.origin.thread !== undefined ? normalizeOptionalString(String(sessionPolicy.origin.thread)) : undefined,
  };
}

function normalizeDestination(
  toolName: string,
  toolParams: Record<string, unknown>,
): EvaluationDestination | undefined {
  const normalizedToolName = normalizeToolName(toolName);
  const isOutboundTool = normalizedToolName === 'message' || normalizedToolName === 'sessions_send';
  if (!isOutboundTool) {
    return undefined;
  }

  const target = firstString(toolParams, ['to', 'recipient', 'destination', 'channelId', 'conversationId']);
  const thread = firstString(toolParams, ['thread', 'threadId']);

  return {
    kind: normalizedToolName === 'sessions_send' ? 'session' : 'channel',
    target,
    thread,
  };
}

function normalizeWorkspaceContext(
  toolName: string,
  toolParams: Record<string, unknown>,
): WorkspaceContext | undefined {
  const normalizedToolName = normalizeToolName(toolName);
  const isWorkspaceTool = normalizedToolName === 'write' || normalizedToolName === 'apply_patch';
  if (!isWorkspaceTool) {
    return undefined;
  }

  const patchText = firstString(toolParams, ['patch', 'patchText']);
  const candidatePaths = dedupeStrings([
    firstString(toolParams, ['path', 'filePath']),
    ...readStringArray(toolParams.paths),
    ...extractPatchPaths(patchText),
  ]);

  return {
    paths: candidatePaths,
    summary: firstString(toolParams, ['patch', 'patchText', 'content']),
  };
}

function normalizeAgentEvent(
  agentEvent: OpenClawAgentEventInput | undefined,
  fallbackStatus: ToolStatus,
  clock: RuntimeClock,
): EvaluationInput['agent_event'] | undefined {
  if (!agentEvent) {
    return undefined;
  }

  return {
    stream: agentEvent.stream,
    sequence: agentEvent.seq,
    timestamp: toIsoTimestamp(agentEvent.ts, clock),
    tool_status: normalizeToolStatus(agentEvent) ?? fallbackStatus,
    summary: firstString(agentEvent.data, ['summary', 'result', 'phase', 'status']),
  };
}

export function normalizeToolStatus(agentEvent: OpenClawAgentEventInput | undefined): ToolStatus {
  const signal = `${agentEvent?.data.status ?? ''} ${agentEvent?.data.phase ?? ''} ${agentEvent?.data.result ?? ''}`
    .toLowerCase()
    .trim();

  if (!signal) {
    return ToolStatus.Pending;
  }

  if (signal.includes('block') || signal.includes('deny')) {
    return ToolStatus.Blocked;
  }

  if (signal.includes('fail') || signal.includes('error')) {
    return ToolStatus.Failed;
  }

  if (signal.includes('complete') || signal.includes('result') || signal.includes('success')) {
    return ToolStatus.Completed;
  }

  if (signal.includes('run') || signal.includes('start')) {
    return ToolStatus.Running;
  }

  return ToolStatus.Pending;
}

function collectRawTextCandidates(toolParams: Record<string, unknown>): string[] {
  return dedupeStrings([
    firstString(toolParams, ['command', 'text', 'message', 'content', 'patch']),
    ...Object.values(toolParams)
      .map((value) => normalizeOptionalString(value))
      .filter((value): value is string => Boolean(value)),
  ]);
}

function firstString(source: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string') {
      const normalized = normalizeOptionalString(value);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof value === 'number') {
      return String(value).trim();
    }
  }

  return undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function extractPatchPaths(patchText: string | undefined): string[] {
  if (!patchText) {
    return [];
  }

  const extractedPaths: string[] = [];
  const lines = patchText.split(/\r?\n/u);

  for (const line of lines) {
    const applyPatchHeaderMatch = line.match(/^\*\*\* (?:Update|Add|Delete) File:\s+(.+)$/u);
    if (applyPatchHeaderMatch) {
      const path = normalizePatchPath(applyPatchHeaderMatch[1]);
      if (path) {
        extractedPaths.push(path);
      }
      continue;
    }

    const diffHeaderMatch = line.match(/^diff --git\s+a\/(.+?)\s+b\/(.+)$/u);
    if (diffHeaderMatch) {
      const fromPath = normalizeDiffPath(diffHeaderMatch[1], 'a');
      const toPath = normalizeDiffPath(diffHeaderMatch[2], 'b');
      if (fromPath) {
        extractedPaths.push(fromPath);
      }
      if (toPath) {
        extractedPaths.push(toPath);
      }
      continue;
    }

    const diffFileHeaderMatch = line.match(/^(---|\+\+\+)\s+(.+)$/u);
    if (diffFileHeaderMatch) {
      const side = diffFileHeaderMatch[1] === '---' ? 'a' : 'b';
      const path = normalizeDiffPath(diffFileHeaderMatch[2], side);
      if (path) {
        extractedPaths.push(path);
      }
      continue;
    }

    const renameHeaderMatch = line.match(/^rename (?:from|to)\s+(.+)$/u);
    if (renameHeaderMatch) {
      const path = normalizePatchPath(renameHeaderMatch[1]);
      if (path) {
        extractedPaths.push(path);
      }
    }
  }

  return dedupeStrings(extractedPaths);
}

function normalizeDiffPath(rawPath: string, side: 'a' | 'b'): string | undefined {
  const withoutMetadata = rawPath.split('\t')[0] ?? rawPath;
  let normalized = normalizePatchPath(withoutMetadata);

  if (!normalized) {
    return undefined;
  }

  if (normalized === '/dev/null') {
    return undefined;
  }

  const sidePrefix = `${side}/`;
  if (normalized.startsWith(sidePrefix)) {
    normalized = normalized.slice(sidePrefix.length).trim();
  }

  return normalized.length > 0 ? normalized : undefined;
}

function normalizePatchPath(rawPath: string): string | undefined {
  const normalized = normalizeOptionalString(rawPath);
  if (!normalized) {
    return undefined;
  }

  const unquoted =
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
      ? normalized.slice(1, -1).trim()
      : normalized;

  return unquoted.length > 0 ? unquoted : undefined;
}

function dedupeStrings(values: readonly (string | undefined)[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    deduped.push(value);
  }

  return deduped;
}

function normalizeToolName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : undefined;
}
