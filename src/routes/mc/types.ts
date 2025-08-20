// Constantes globales para acciones permitidas en el servidor manager
export const READ_ONLY_ACTIONS = ['info', 'status', 'metrics', 'logs'] as const;
export const MODIFYING_ACTIONS = ['start', 'stop', 'restart', 'kill', 'send', 'command', 'commands'] as const;
export const SERVER_CONTROL_ACTIONS = ['start', 'stop', 'restart', 'kill'] as const;
export const COMMAND_ACTIONS = ['send', 'command', 'commands'] as const;
export const LOG_ACTIONS = ['logs'] as const;

// Tipos derivados de las constantes
export type ReadOnlyAction = typeof READ_ONLY_ACTIONS[number];
export type ModifyingAction = typeof MODIFYING_ACTIONS[number];
export type ServerControlAction = typeof SERVER_CONTROL_ACTIONS[number];
export type CommandActionType = typeof COMMAND_ACTIONS[number];
export type LogAction = typeof LOG_ACTIONS[number];
export type AllowedAction = ReadOnlyAction | ModifyingAction;

// Tipos para respuestas estandarizadas del API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string | any;
  error?: string | any;
  timestamp?: string;
  action?: string;
  server?: string;
}

// Tipos para acciones del servidor
export interface ServerAction {
  type: ServerControlAction;
}

export interface SingleCommandAction {
  command: string;
}

export interface MultipleCommandsAction {
  commands: string[];
}

export interface LogsAction {
  lines?: number;
  format?: 'array' | 'string';
}

// Tipo unión para todas las acciones posibles
export type ActionPayload = ServerAction | SingleCommandAction | MultipleCommandsAction | LogsAction;

// Validadores de tipos
export function isReadOnlyAction(action: string): action is ReadOnlyAction {
  return READ_ONLY_ACTIONS.includes(action as ReadOnlyAction);
}

export function isModifyingAction(action: string): action is ModifyingAction {
  return MODIFYING_ACTIONS.includes(action as ModifyingAction);
}

export function isServerControlAction(action: string): action is ServerControlAction {
  return SERVER_CONTROL_ACTIONS.includes(action as ServerControlAction);
}

export function isCommandAction(action: string): action is CommandActionType {
  return COMMAND_ACTIONS.includes(action as CommandActionType);
}

export function isLogAction(action: string): action is LogAction {
  return LOG_ACTIONS.includes(action as LogAction);
}