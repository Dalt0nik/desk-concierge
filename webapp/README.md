# Desk Concierge — Web App

Next.js front-end for the Desk Concierge system. Connects to the MQTT broker, streams live desk status to the browser via SSE, and exposes an Azure OpenAI chat agent that can answer availability questions and reserve desks.

## Prerequisites

- Node.js 20+
- An Azure OpenAI deployment (key + endpoint)
- MQTT broker reachable at the configured address (app still works without it — desks default to `free`)

## Setup

```bash
# 1. Install dependencies
cd webapp
npm install

# 2. Create your local env file
cp .env.local.example .env.local
```

Open `.env.local` and fill in the values:

| Variable | Description |
|---|---|
| `AZURE_OPENAI_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | Deployment endpoint URL |
| `AZURE_OPENAI_MODEL` | Model deployment name (default: `gpt-5.4-nano`) |
| `MQTT_BROKER` | MQTT broker URL, e.g. `mqtt://10.250.251.10:1883` |

```bash
# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- **Desk 1 (A1)** — physical ESP32 with KY-032 sensor. Status comes from the real device via MQTT topic `desk/1/status`.
- **Desks 2–10** — simulated. The server publishes randomised `occupied`/`free` states every ~20 s so the map looks live without extra hardware.
- **Reserve** — sets the desk LED to yellow (publishes `yellow` to `desk/N/led`). Auto-releases after 2 hours.
- **Chat** — Azure OpenAI (gpt-5.4-nano) has a live snapshot of all desk states and can reserve or release desks on your behalf via function calling.

## Project structure

```
src/
  config/desks.ts        desk metadata (zone, features, label)
  lib/state.ts           MQTT singleton + in-memory state + SSE broadcaster
  lib/simulator.ts       fake occupancy publisher for desks 2–10
  instrumentation.ts     Next.js server startup hook
  app/
    page.tsx             desk map + chat layout (SSE client)
    api/sse/             real-time event stream
    api/desks/           REST snapshot + reserve/release
    api/chat/            Claude Haiku agent endpoint
  components/
    DeskMap.tsx
    ChatPanel.tsx
```
