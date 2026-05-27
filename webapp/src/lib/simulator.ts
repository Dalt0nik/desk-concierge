import { getMqttClient } from '@/lib/state';
import { DESKS } from '@/config/desks';

// Desks 2–10 are simulated. Each has a base probability of being occupied.
const ACTIVITY: Record<string, number> = {
  '2': 0.55, '3': 0.35, '4': 0.75, '5': 0.70,
  '6': 0.50, '7': 0.30, '8': 0.65, '9': 0.40, '10': 0.20,
};

const SIM_IDS = DESKS.filter(d => !d.physical).map(d => d.id);

const g = global as typeof global & { _simStarted?: boolean };

export function startSimulator() {
  if (g._simStarted) return;
  g._simStarted = true;

  // Publish initial states once MQTT is connected
  setTimeout(() => {
    const client = getMqttClient();
    if (!client?.connected) return;
    for (const id of SIM_IDS) {
      const status = Math.random() < (ACTIVITY[id] ?? 0.5) ? 'occupied' : 'free';
      client.publish(`desk/${id}/status`, status, { retain: true });
    }
  }, 3_000);

  // Random flip every ~20 s to simulate people arriving / leaving
  setInterval(() => {
    const client = getMqttClient();
    if (!client?.connected) return;
    const id = SIM_IDS[Math.floor(Math.random() * SIM_IDS.length)];
    const status = Math.random() < (ACTIVITY[id] ?? 0.5) ? 'occupied' : 'free';
    client.publish(`desk/${id}/status`, status);
  }, 20_000);
}
