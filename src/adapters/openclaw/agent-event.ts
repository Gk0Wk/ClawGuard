export interface OpenClawAgentEventInput {
  readonly runId: string;
  readonly seq: number;
  readonly stream: string;
  readonly ts?: number | string;
  readonly sessionKey?: string;
  readonly data: {
    readonly toolName?: string;
    readonly toolCallId?: string;
    readonly status?: string;
    readonly phase?: string;
    readonly summary?: string;
    readonly result?: string;
    readonly [key: string]: unknown;
  };
}
