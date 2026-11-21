# Desk Concierge

**Cognizant Vilnius — Internal IoT Hackathon**

A hot-desk management system built in a single day. Physical ESP32 sensors detect real occupancy at desks; a Next.js web app shows the whole floor in real time; and an AI concierge (Azure OpenAI) can answer availability questions and reserve desks on your behalf via natural language.

---

## What was built

| Piece | Description |
|---|---|
| **Web app** | Next.js 15 dashboard with a live desk map (SSE) and an AI chat panel |
| **Desk map** | 40 desks across 8 named pods — real-time status (free / occupied / reserved), feature-tag filters, reserve/release buttons |
| **AI concierge** | Azure OpenAI agentic loop with tool use — recommends desks by preference and can reserve or release them directly |
| **IoT firmware** | ESP32 (PlatformIO / Arduino) with a KY-032 IR sensor, RGB LED, OTA update, and an HTTP log server |
| **MQTT backbone** | Broker bridges the physical device, the simulator, and the web app |
| **Simulator** | Server-side module that publishes realistic random occupancy for the 39 non-physical desks |

## Architecture

See [`architecture.html`](architecture.html) for the full system diagram (open in a browser).

```
Browser (SSE + REST)
  └─ Next.js 15
       ├─ GET  /api/sse          real-time push to all clients
       ├─ GET  /api/desks        JSON snapshot
       ├─ POST /api/desks/[id]/reserve|release
       ├─ POST /api/chat         Azure OpenAI agentic loop
       └─ lib/state.ts           in-memory state · MQTT client · SSE emitter

MQTT broker (10.6.10.36:1883)
  ├─ desk/+/status   ← ESP32 sensor events + simulator
  └─ desk/+/led      → RGB LED colour commands

ESP32 — Desk A1
  ├─ KY-032 IR sensor  (occupied/free, polled every 2 s)
  ├─ RGB LED           (green=free, yellow=reserved, red=occupied)
  ├─ OTA update        (port 3232)
  └─ HTTP log server   (port 80)
```

## Repo layout

```
desk-concierge/
├── webapp/                 Next.js web app
│   └── src/
│       ├── app/
│       │   ├── page.tsx              main layout (desk map + chat)
│       │   └── api/
│       │       ├── sse/              Server-Sent Events stream
│       │       ├── desks/            REST snapshot + reserve/release
│       │       └── chat/             Azure OpenAI endpoint
│       ├── components/
│       │   ├── DeskMap.tsx           pod grid with feature-tag highlighting
│       │   └── ChatPanel.tsx         chat UI
│       ├── config/desks.ts           pod/desk metadata (zone, features, label)
│       ├── lib/
│       │   ├── state.ts              MQTT singleton · in-memory state · SSE emitter
│       │   └── simulator.ts          fake occupancy publisher for non-physical desks
│       └── instrumentation.ts        Next.js server startup hook
├── device/                 ESP32 firmware (PlatformIO)
│   ├── platformio.ini
│   └── src/config.h        WiFi / MQTT / OTA config template (credentials stripped)
├── architecture.html       system architecture diagram
└── ai-activity-logs/       notes on how AI tooling was used during the hackathon
```

## Running the web app

See [`webapp/README.md`](webapp/README.md) for full setup instructions.

The short version:

```bash
cd webapp
npm install
cp .env.local.example .env.local   # fill in AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT, MQTT_BROKER
npm run dev
```

The app works without a live MQTT broker — desks fall back to `free` and the simulator keeps the map animated.

## Tech stack

- **Next.js 15** · React 19 · TypeScript
- **Azure OpenAI** (gpt-5.4-nano, function calling)
- **MQTT** via `mqtt` npm package (broker: Mosquitto or equivalent)
- **ESP32** · PlatformIO · Arduino framework · PubSubClient · ArduinoJson
- **KY-032 IR proximity sensor** · common-cathode RGB LED

## Desk layout

8 pods (Alpha → Hotel), 40 desks total. Zones:

| Zone | Pods | Character |
|---|---|---|
| Quiet | Alpha, Echo | window seats, standing desks |
| Collaborative | Bravo, Charlie, Golf | dual monitors, near printer |
| Open | Delta, Foxtrot, Hotel | near kitchen, standing desks |

Desk **A1** is the only physical sensor. All others were simulated during the hackathon.

---

*Built at the Cognizant Vilnius Internal IoT Hackathon.*
