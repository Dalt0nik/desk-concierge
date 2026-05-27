// WPA2 Enterprise credentials
#define WPA2_IDENTITY    "hakatonas.2026@db"   // often the same as username
#define WPA2_USERNAME    "hakatonas.2026@db"
#define WPA2_PASSWORD    "H"
// ── WiFi ─────────────────────────────────────────────────────────────────────
#define WIFI_SSID        "Esphub"
#define WIFI_PASSWORD    "jq87427@"
#define WIFI_HOSTNAME    "esp32-device1"
#define WIFI_TIMEOUT_MS  10000

// ── MQTT ─────────────────────────────────────────────────────────────────────
#define MQTT_BROKER      "10.250.251.10"
#define MQTT_PORT        1883
#define MQTT_USER        ""           // leave empty if no auth
#define MQTT_PASSWORD    ""
#define MQTT_CLIENT_ID   "esp32-device1"

#define MQTT_TOPIC_STATUS    "esp32/status"
#define MQTT_TOPIC_SUB       "esp32/cmd"
#define MQTT_RECONNECT_MS    5000

// ── OTA ──────────────────────────────────────────────────────────────────────
// Upload via: pio run -t upload --upload-port <ip>
// Or in platformio.ini: upload_port = <ip>  upload_protocol = espota
//#define OTA_PASSWORD     "your-ota-password"

// ── Web Server ───────────────────────────────────────────────────────────────
#define WEB_SERVER_PORT  80
// ── Temperature Logger ──────────────────────────────────────────────────────
#define TEMP_LOG_INTERVAL_MS  30000   // how often to log CPU temp (ms)
