import type { IsoTimestamp, RunRef, SessionRef, ToolCallRef, ToolStatus } from '../shared/index.js';

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
