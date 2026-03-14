import {
  type IsoTimestamp,
  type RunRef,
  type SessionRef,
  type ToolCallRef,
  type ToolStatus,
  WorkspaceMutationOperationType,
} from '../shared/index.js';

export interface EvaluationOrigin {
  readonly channel?: string;
  readonly to?: string;
  readonly thread?: string;
}

export interface EvaluationDestination {
  readonly kind: 'channel' | 'session' | 'workspace' | 'unknown';
  readonly target?: string;
  readonly thread?: string;
}

export interface WorkspaceContext {
  readonly paths: readonly string[];
  readonly summary?: string;
  readonly operation_type?: WorkspaceMutationOperationType;
}

export interface AgentEventContext {
  readonly stream: string;
  readonly sequence: number;
  readonly timestamp: IsoTimestamp;
  readonly tool_status: ToolStatus;
  readonly summary?: string;
}

export interface EvaluationInput {
  readonly tool_name: string;
  readonly tool_params: Record<string, unknown>;
  readonly session_ref: SessionRef;
  readonly run_ref: RunRef;
  readonly tool_call_ref: ToolCallRef;
  readonly origin?: EvaluationOrigin;
  readonly destination?: EvaluationDestination;
  readonly workspace_context?: WorkspaceContext;
  readonly raw_text_candidates: readonly string[];
  readonly agent_event?: AgentEventContext;
}

export function detectWorkspaceMutationOperationType(
  toolName: string,
  toolParams: Record<string, unknown>,
): WorkspaceMutationOperationType | undefined {
  if (toolName.trim().toLowerCase() !== 'edit') {
    return undefined;
  }

  const oldText = normalizeWorkspaceMutationText(
    toolParams.oldText ?? toolParams.old_string ?? toolParams.oldValue ?? toolParams.old_value,
  );
  const newText = normalizeWorkspaceMutationText(
    toolParams.newText ?? toolParams.new_string ?? toolParams.newValue ?? toolParams.new_value,
  );

  if (oldText && newText) {
    return isRenameLikeEdit(oldText, newText)
      ? WorkspaceMutationOperationType.RenameLike
      : WorkspaceMutationOperationType.Modify;
  }

  if (newText) {
    return WorkspaceMutationOperationType.Insert;
  }

  if (oldText) {
    return WorkspaceMutationOperationType.Delete;
  }

  return WorkspaceMutationOperationType.Modify;
}

function normalizeWorkspaceMutationText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isRenameLikeEdit(oldText: string, newText: string): boolean {
  if (oldText === newText) {
    return false;
  }

  return isRenameLikeToken(oldText) && isRenameLikeToken(newText);
}

function isRenameLikeToken(value: string): boolean {
  if (value.length > 120 || /\r|\n/u.test(value) || /\s/u.test(value)) {
    return false;
  }

  return /^[A-Za-z0-9_.\-\\/]+$/u.test(value);
}
