export interface OpenClawBeforeToolCallEventInput {
  readonly toolName: string;
  readonly params: Record<string, unknown>;
  readonly runId?: string;
  readonly toolCallId?: string;
}

export interface OpenClawBeforeToolCallContextInput {
  readonly agentId?: string;
  readonly sessionKey?: string;
  readonly sessionId?: string;
  readonly runId?: string;
  readonly toolCallId?: string;
}

export interface OpenClawBeforeToolCallInput {
  readonly event: OpenClawBeforeToolCallEventInput;
  readonly context?: OpenClawBeforeToolCallContextInput;
}
