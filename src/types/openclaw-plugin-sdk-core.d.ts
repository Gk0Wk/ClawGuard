declare module 'openclaw/plugin-sdk/core' {
  import type { IncomingMessage, ServerResponse } from 'node:http';

  export interface OpenClawPluginRuntimeState {
    resolveStateDir(): string;
  }

  export interface OpenClawPluginRuntime {
    readonly state: OpenClawPluginRuntimeState;
  }

  export interface OpenClawPluginLogger {
    info(message: string): void;
  }

  export interface BeforeToolCallEvent {
    readonly toolName: string;
    readonly params: Record<string, unknown>;
    readonly runId?: string;
    readonly toolCallId?: string;
  }

  export interface BeforeToolCallContext {
    readonly sessionKey?: string;
    readonly sessionId?: string;
    readonly agentId?: string;
  }

  export interface BeforeToolCallResult {
    readonly block?: boolean;
    readonly blockReason?: string;
  }

  export interface AfterToolCallEvent {
    readonly toolName: string;
    readonly params: Record<string, unknown>;
    readonly runId?: string;
    readonly toolCallId?: string;
    readonly result?: unknown;
    readonly error?: string;
    readonly durationMs?: number;
  }

  export interface AfterToolCallContext {
    readonly sessionKey?: string;
    readonly sessionId?: string;
    readonly agentId?: string;
  }

  export interface MessageSendingEvent {
    readonly to: string;
    readonly content: string;
    readonly metadata?: Record<string, unknown>;
  }

  export interface MessageSendingContext {
    readonly channelId: string;
    readonly accountId?: string;
    readonly conversationId?: string;
  }

  export interface MessageSendingResult {
    readonly cancel?: boolean;
  }

  export interface MessageSentEvent {
    readonly to: string;
    readonly content: string;
    readonly success: boolean;
    readonly error?: string;
  }

  export type BeforeToolCallHandler = (
    event: BeforeToolCallEvent,
    context: BeforeToolCallContext,
  ) => BeforeToolCallResult | void;

  export type AfterToolCallHandler = (
    event: AfterToolCallEvent,
    context: AfterToolCallContext,
  ) => void;

  export type MessageSendingHandler = (
    event: MessageSendingEvent,
    context: MessageSendingContext,
  ) => MessageSendingResult | void;

  export type MessageSentHandler = (
    event: MessageSentEvent,
    context: MessageSendingContext,
  ) => void;

  export type OpenClawRouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
  ) => boolean | void;

  export interface OpenClawRouteDefinition {
    readonly path: string;
    readonly auth: 'gateway';
    readonly match: 'exact' | 'prefix';
    readonly handler: OpenClawRouteHandler;
  }

  export interface OpenClawPluginApi {
    readonly id: string;
    readonly pluginConfig?: Record<string, unknown>;
    readonly runtime: OpenClawPluginRuntime;
    readonly logger: OpenClawPluginLogger;
    on(event: 'before_tool_call', handler: BeforeToolCallHandler): void;
    on(event: 'after_tool_call', handler: AfterToolCallHandler): void;
    on(event: 'message_sending', handler: MessageSendingHandler): void;
    on(event: 'message_sent', handler: MessageSentHandler): void;
    registerHttpRoute(route: OpenClawRouteDefinition): void;
  }
}
