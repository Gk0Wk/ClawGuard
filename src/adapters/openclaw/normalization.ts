import path from 'node:path';

import {
  detectWorkspaceMutationOperationType,
  type EvaluationDestination,
  type EvaluationInput,
  type EvaluationOrigin,
  type WorkspaceContext,
} from '../../domain/context/index.js';
import {
  RunStatus,
  ToolPhase,
  ToolStatus,
  type RunRef,
  type SessionRef,
  type ToolCallRef,
  WorkspaceMutationOperationType,
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
  const destination = normalizeDestination(
    args.before_tool_call.event.toolName,
    args.before_tool_call.event.params,
    args.session_policy,
  );
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
  sessionPolicy: OpenClawSessionPolicyInput,
): EvaluationDestination | undefined {
  const normalizedToolName = normalizeToolName(toolName);
  const isOutboundTool =
    normalizedToolName === 'message' ||
    normalizedToolName === 'message_sending' ||
    normalizedToolName === 'sessions_send';
  if (!isOutboundTool) {
    return undefined;
  }

  const explicitTarget = firstString(toolParams, ['to', 'recipient', 'destination', 'conversationId', 'channelId']);
  const explicitThread = firstString(toolParams, ['thread', 'threadId']);
  const explicitChannel = firstString(toolParams, ['channelId']);
  const explicitAccount = firstString(toolParams, ['accountId']);
  const explicitConversation = firstString(toolParams, ['conversationId']);
  const fallbackDeliveryContext = normalizeSessionDeliveryContext(sessionPolicy);

  const target = explicitTarget ?? fallbackDeliveryContext?.to;
  const thread = explicitThread ?? fallbackDeliveryContext?.threadId;
  const channel = explicitChannel ?? fallbackDeliveryContext?.channel;
  const account = explicitAccount ?? fallbackDeliveryContext?.accountId;
  const conversation = explicitConversation;
  const targetMode = explicitTarget ? 'explicit' : fallbackDeliveryContext?.to ? 'implicit' : undefined;

  if (!target && !thread && !channel && !account && !conversation) {
    return undefined;
  }

  return {
    kind: normalizedToolName === 'sessions_send' ? 'session' : 'channel',
    target,
    ...(thread ? { thread } : {}),
    ...(channel ? { channel } : {}),
    ...(account ? { account } : {}),
    ...(conversation ? { conversation } : {}),
    ...(targetMode ? { target_mode: targetMode } : {}),
  };
}

function normalizeSessionDeliveryContext(
  sessionPolicy: OpenClawSessionPolicyInput,
): {
  readonly channel?: string;
  readonly to?: string;
  readonly accountId?: string;
  readonly threadId?: string;
} | undefined {
  if (!sessionPolicy.deliveryContext) {
    return undefined;
  }

  const channel = normalizeOptionalString(sessionPolicy.deliveryContext.channel);
  const to = normalizeOptionalString(sessionPolicy.deliveryContext.to);
  const accountId = normalizeOptionalString(sessionPolicy.deliveryContext.accountId);
  const threadId =
    sessionPolicy.deliveryContext.threadId !== undefined
      ? normalizeOptionalString(String(sessionPolicy.deliveryContext.threadId))
      : undefined;

  if (!channel && !to && !accountId && !threadId) {
    return undefined;
  }

  return {
    ...(channel ? { channel } : {}),
    ...(to ? { to } : {}),
    ...(accountId ? { accountId } : {}),
    ...(threadId ? { threadId } : {}),
  };
}

function normalizeWorkspaceContext(
  toolName: string,
  toolParams: Record<string, unknown>,
): WorkspaceContext | undefined {
  const normalizedToolName = normalizeToolName(toolName);
  const isWorkspaceTool =
    normalizedToolName === 'write' || normalizedToolName === 'edit' || normalizedToolName === 'apply_patch';
  if (!isWorkspaceTool) {
    return undefined;
  }

  const patchText = firstString(toolParams, ['patch', 'patchText']);
  const operationType = resolveWorkspaceMutationOperationType(normalizedToolName, toolParams, patchText);
  const candidatePaths = dedupeStrings([
    ...readStringsFromKeys(toolParams, ['path', 'filePath', 'patchPath', 'fromPath', 'toPath', 'oldPath', 'newPath']),
    ...readStringArray(toolParams.paths),
    ...extractPatchPaths(patchText),
  ]);

  return {
    paths: candidatePaths,
    summary: firstString(toolParams, ['patch', 'patchText', 'content', 'newText', 'new_string', 'oldText', 'old_string']),
    operation_type: operationType,
  };
}

function resolveWorkspaceMutationOperationType(
  normalizedToolName: string,
  toolParams: Record<string, unknown>,
  patchText: string | undefined,
): WorkspaceMutationOperationType | undefined {
  const baseOperationType = detectWorkspaceMutationOperationType(normalizedToolName, toolParams);
  if (normalizedToolName === 'edit' && baseOperationType === WorkspaceMutationOperationType.Modify) {
    return detectEditPathReferenceRenameLikeOperationType(toolParams) ?? baseOperationType;
  }

  if (normalizedToolName !== 'apply_patch') {
    return baseOperationType;
  }

  if (patchText) {
    return (
      detectApplyPatchMoveLikeOperationType(patchText) ??
      (baseOperationType === WorkspaceMutationOperationType.Modify
        ? detectApplyPatchSectionOperationType(patchText) ?? baseOperationType
        : baseOperationType)
    );
  }

  return baseOperationType;
}

function detectApplyPatchMoveLikeOperationType(
  patchText: string,
): WorkspaceMutationOperationType | undefined {
  const addPaths: string[] = [];
  const deletePaths: string[] = [];
  let sawUpdateHeader = false;
  let sawOtherMoveSignal = false;

  for (const rawLine of patchText.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (/^\*\*\* Update File:\s+.+$/u.test(line) || /^diff --git\s+/u.test(line)) {
      sawUpdateHeader = true;
      continue;
    }

    if (
      /^\*\*\* Move to:\s+.+$/u.test(line) ||
      /^(?:rename|copy) (?:from|to)\s+.+$/u.test(line) ||
      /^similarity index\s+\d+%$/u.test(line) ||
      /^old mode\s+\d+$/u.test(line) ||
      /^new mode\s+\d+$/u.test(line)
    ) {
      sawOtherMoveSignal = true;
    }

    const addMatch = line.match(/^\*\*\* Add File:\s+(.+)$/u);
    if (addMatch) {
      const path = normalizePatchPath(addMatch[1]);
      if (path) {
        addPaths.push(path);
      }
      continue;
    }

    const deleteMatch = line.match(/^\*\*\* Delete File:\s+(.+)$/u);
    if (deleteMatch) {
      const path = normalizePatchPath(deleteMatch[1]);
      if (path) {
        deletePaths.push(path);
      }
    }
  }

  if (addPaths.length !== 1 || deletePaths.length !== 1) {
    return undefined;
  }

  if (sawUpdateHeader || sawOtherMoveSignal) {
    return undefined;
  }

  return isHighConfidenceApplyPatchRenameLikeMove(deletePaths[0], addPaths[0])
    ? WorkspaceMutationOperationType.RenameLike
    : undefined;
}

function isHighConfidenceApplyPatchRenameLikeMove(fromPath: string, toPath: string): boolean {
  const fromParsedPath = path.win32.parse(fromPath);
  const toParsedPath = path.win32.parse(toPath);

  if (!fromParsedPath.base || !toParsedPath.base) {
    return false;
  }

  if (fromParsedPath.base.toLowerCase() !== toParsedPath.base.toLowerCase()) {
    return false;
  }

  const fromDirectory = fromParsedPath.dir.trim().toLowerCase();
  const toDirectory = toParsedPath.dir.trim().toLowerCase();

  return fromDirectory !== toDirectory;
}

function detectApplyPatchSectionOperationType(
  patchText: string,
): WorkspaceMutationOperationType | undefined {
  const fileKinds: WorkspaceMutationOperationType[] = [];
  let currentFileStarted = false;
  let currentFileSawHunk = false;
  let currentFileSawPlus = false;
  let currentFileSawMinus = false;
  let currentFileSawNeutralContent = false;

  const resetCurrentFile = (): void => {
    currentFileStarted = false;
    currentFileSawHunk = false;
    currentFileSawPlus = false;
    currentFileSawMinus = false;
    currentFileSawNeutralContent = false;
  };

  const flushCurrentFile = (): void => {
    if (!currentFileStarted) {
      return;
    }

    if (currentFileSawPlus && currentFileSawMinus) {
      fileKinds.push(WorkspaceMutationOperationType.Modify);
      resetCurrentFile();
      return;
    }

    if (currentFileSawNeutralContent) {
      fileKinds.push(WorkspaceMutationOperationType.Modify);
      resetCurrentFile();
      return;
    }

    if (currentFileSawPlus) {
      fileKinds.push(WorkspaceMutationOperationType.Insert);
      resetCurrentFile();
      return;
    }

    if (currentFileSawMinus) {
      fileKinds.push(WorkspaceMutationOperationType.Delete);
      resetCurrentFile();
      return;
    }

    fileKinds.push(WorkspaceMutationOperationType.Modify);
    resetCurrentFile();
  };

  for (const rawLine of patchText.split(/\r?\n/u)) {
    const line = rawLine.trimEnd();
    const trimmedLine = line.trim();

    if (/^\*\*\* Update File:\s+.+$/u.test(line) || /^diff --git\s+/u.test(line)) {
      flushCurrentFile();
      currentFileStarted = true;
      continue;
    }

    if (!currentFileStarted) {
      continue;
    }

    if (
      /^\*\*\* Begin Patch$/u.test(trimmedLine) ||
      /^\*\*\* End Patch$/u.test(trimmedLine) ||
      /^\*\*\* (?:Add|Delete|Move to):\s+.+$/u.test(trimmedLine) ||
      /^index\s+.+$/u.test(trimmedLine) ||
      /^new file mode(?:\s+\d+)?$/u.test(trimmedLine) ||
      /^deleted file mode(?:\s+\d+)?$/u.test(trimmedLine) ||
      /^similarity index\s+\d+%$/u.test(trimmedLine) ||
      /^old mode\s+\d+$/u.test(trimmedLine) ||
      /^new mode\s+\d+$/u.test(trimmedLine) ||
      /^(?:rename|copy) (?:from|to)\s+.+$/u.test(trimmedLine) ||
      /^diff --git\s+/u.test(trimmedLine) ||
      /^(?:---|\+\+\+)\s+.+$/u.test(trimmedLine)
    ) {
      continue;
    }

    if (/^@@(?:\s|$)/u.test(line)) {
      currentFileSawHunk = true;
      continue;
    }

    if (/^\+(?!\+\+)/u.test(line)) {
      currentFileSawPlus = true;
      continue;
    }

    if (/^-(?!---)/u.test(line)) {
      currentFileSawMinus = true;
      continue;
    }

    if (trimmedLine.length === 0) {
      continue;
    }

    if (!currentFileSawHunk) {
      currentFileSawNeutralContent = true;
    }
  }

  flushCurrentFile();

  if (fileKinds.length === 0) {
    return undefined;
  }

  const uniqueKinds = Array.from(new Set(fileKinds));
  if (uniqueKinds.length !== 1) {
    return undefined;
  }

  const [singleKind] = uniqueKinds;
  return singleKind === WorkspaceMutationOperationType.Insert || singleKind === WorkspaceMutationOperationType.Delete
    ? singleKind
    : undefined;
}

function detectEditPathReferenceRenameLikeOperationType(
  toolParams: Record<string, unknown>,
): WorkspaceMutationOperationType | undefined {
  const oldText = normalizeEditPathReference(toolParams.oldText ?? toolParams.old_string ?? toolParams.oldValue ?? toolParams.old_value);
  const newText = normalizeEditPathReference(toolParams.newText ?? toolParams.new_string ?? toolParams.newValue ?? toolParams.new_value);

  if (!oldText || !newText) {
    return undefined;
  }

  return isPathReferenceRenameLikeReplacement(oldText, newText)
    ? WorkspaceMutationOperationType.RenameLike
    : undefined;
}

function normalizeEditPathReference(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  const unquoted =
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
      ? normalized.slice(1, -1).trim()
      : normalized;

  if (!/[\\/]/u.test(unquoted)) {
    return undefined;
  }

  return unquoted.replace(/\//gu, '\\');
}

function isPathReferenceRenameLikeReplacement(oldText: string, newText: string): boolean {
  const oldParsedPath = path.win32.parse(oldText);
  const newParsedPath = path.win32.parse(newText);

  if (!oldParsedPath.base || !newParsedPath.base) {
    return false;
  }

  if (oldParsedPath.base.toLowerCase() !== newParsedPath.base.toLowerCase()) {
    return false;
  }

  const oldDirectory = oldParsedPath.dir.trim().toLowerCase();
  const newDirectory = newParsedPath.dir.trim().toLowerCase();

  return oldDirectory !== newDirectory;
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
    firstString(toolParams, ['command', 'text', 'message', 'content', 'patch', 'newText', 'new_string', 'oldText', 'old_string']),
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

function readStringsFromKeys(source: Record<string, unknown>, keys: readonly string[]): string[] {
  return keys
    .map((key) => source[key])
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => Boolean(value));
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

    const applyPatchMoveMatch = line.match(/^\*\*\* Move to:\s+(.+)$/u);
    if (applyPatchMoveMatch) {
      const path = normalizePatchPath(applyPatchMoveMatch[1]);
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

    const renameOrCopyHeaderMatch = line.match(/^(?:rename|copy) (?:from|to)\s+(.+)$/u);
    if (renameOrCopyHeaderMatch) {
      const path = normalizePatchPath(renameOrCopyHeaderMatch[1]);
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
