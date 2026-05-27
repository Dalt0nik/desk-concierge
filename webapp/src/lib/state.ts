import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import { DESKS } from '@/config/desks';
import type { DeskStatus, DeskState } from '@/types';

const AUTO_RELEASE_MS = 2 * 60 * 60 * 1000; // 2 hours

interface StoredState {
  id: string;
  status: DeskStatus;
  updatedAt: string;
  releaseTimer?: ReturnType<typeof setTimeout>;
}

// Module-level globals survive Next.js hot-reload via the global object
const g = global as typeof global & {
  _mqttClient?: mqtt.MqttClient;
  _deskState?: Map<string, StoredState>;
  _sseEmitter?: EventEmitter;
};

export const sseEmitter: EventEmitter = (g._sseEmitter ??= new EventEmitter());
sseEmitter.setMaxListeners(200);

const state: Map<string, StoredState> = (g._deskState ??= new Map(
  DESKS.map(d => [d.id, { id: d.id, status: 'free', updatedAt: new Date().toISOString() }])
));

function strip(s: StoredState): DeskState {
  return { id: s.id, status: s.status, updatedAt: s.updatedAt };
}

export function getAllStates(): DeskState[] {
  return Array.from(state.values()).map(strip);
}

export function getState(id: string): DeskState | undefined {
  const s = state.get(id);
  return s ? strip(s) : undefined;
}

function applyStatus(id: string, status: DeskStatus) {
  const existing = state.get(id);
  if (existing?.releaseTimer) clearTimeout(existing.releaseTimer);
  const updated: StoredState = { id, status, updatedAt: new Date().toISOString() };
  state.set(id, updated);
  sseEmitter.emit('desk-update', strip(updated));
}

export function reserveDesk(id: string): { ok: boolean; reason?: string } {
  const s = state.get(id);
  if (!s) return { ok: false, reason: 'Desk not found' };
  if (s.status !== 'free') return { ok: false, reason: `Desk is ${s.status}` };

  const timer = setTimeout(() => {
    applyStatus(id, 'free');
    g._mqttClient?.publish(`desk/${id}/led`, 'green');
  }, AUTO_RELEASE_MS);

  state.set(id, { id, status: 'reserved', updatedAt: new Date().toISOString(), releaseTimer: timer });
  sseEmitter.emit('desk-update', getState(id));
  g._mqttClient?.publish(`desk/${id}/led`, 'yellow');
  return { ok: true };
}

export function releaseDesk(id: string): { ok: boolean; reason?: string } {
  const s = state.get(id);
  if (!s) return { ok: false, reason: 'Desk not found' };
  if (s.releaseTimer) clearTimeout(s.releaseTimer);
  applyStatus(id, 'free');
  g._mqttClient?.publish(`desk/${id}/led`, 'green');
  return { ok: true };
}

export function initMqtt() {
  if (g._mqttClient) return;

  const broker = process.env.MQTT_BROKER ?? 'mqtt://10.250.251.10:1883';
  const client = mqtt.connect(broker, { reconnectPeriod: 5_000, connectTimeout: 10_000 });
  g._mqttClient = client;

  client.on('connect', () => {
    console.log('[MQTT] Connected to', broker);
    client.subscribe('desk/+/status');
  });

  client.on('message', (topic, payload) => {
    const m = topic.match(/^desk\/(\w+)\/status$/);
    if (!m) return;
    const id = m[1];
    const raw = payload.toString();
    if (raw !== 'free' && raw !== 'occupied') return;

    // Sensor data never overrides a manual reservation
    const current = state.get(id);
    if (current?.status === 'reserved') return;

    applyStatus(id, raw as DeskStatus);
  });

  client.on('error', err => console.error('[MQTT]', err.message));
  client.on('offline', () => console.warn('[MQTT] offline'));
}

export function getMqttClient() {
  return g._mqttClient;
}
