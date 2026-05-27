// WPA2 Enterprise credentials
#define WPA2_IDENTITY    "hakatonas.2026@devbridge.com"
#define WPA2_USERNAME    "hakatonas.2026@devbridge.com"
#define WPA2_PASSWORD    "H@katon@Devbridgge26"
// ── WiFi ─────────────────────────────────────────────────────────────────────
#define WIFI_SSID        "DB-CTS-WORK"
#define WIFI_PASSWORD    "jq87427@"
#define WIFI_HOSTNAME    "esp32-hackaton_2"
#define WIFI_TIMEOUT_MS  10000

// ── MQTT ─────────────────────────────────────────────────────────────────────
#define MQTT_BROKER      "10.6.10.36"
#define MQTT_PORT        1883
#define MQTT_USER        ""           // leave empty if no auth
#define MQTT_PASSWORD    ""
#define MQTT_CLIENT_ID   "esp32-device1"

#define MQTT_TOPIC_STATUS    "desk/1/status"
#define MQTT_TOPIC_SUB       "desk/1/led"
#define MQTT_RECONNECT_MS    5000

// ── OTA ──────────────────────────────────────────────────────────────────────
// Upload via: pio run -t upload --upload-port <ip>
// Or in platformio.ini: upload_port = <ip>  upload_protocol = espota
//#define OTA_PASSWORD     "your-ota-password"

// ── Web Server ───────────────────────────────────────────────────────────────
#define WEB_SERVER_PORT  80
// ── Temperature Logger ──────────────────────────────────────────────────────
#define TEMP_LOG_INTERVAL_MS  30000   // how often to log CPU temp (ms)
