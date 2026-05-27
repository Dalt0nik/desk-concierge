#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_wpa2.h>
#include <WebServer.h>
#include <ArduinoOTA.h>
#include <esp_system.h>
#include <PubSubClient.h>
#include "config.h"

// ── Globals ───────────────────────────────────────────────────────────────────
WebServer    server(WEB_SERVER_PORT);
WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastMqttReconnect = 0;
unsigned long lastTempLog        = 0;

// ── Logger ────────────────────────────────────────────────────────────────────
// Circular buffer — oldest entry is silently overwritten when full.
// Usage:  logger.log("something happened");
//         logger.log("value: " + String(val));
// View:   http://<ip>/log  (auto-refreshes every 5 s)
// Clear:  http://<ip>/log/clear

#define LOG_MAX_ENTRIES  50
#define LOG_ENTRY_LEN    96   // max chars per message (truncated if longer)

struct LogEntry {
    unsigned long ms;
    char          msg[LOG_ENTRY_LEN];
};

class Logger {
public:
    void log(const String& msg) {
        LogEntry& e = _buf[_head];
        e.ms = millis();
        msg.substring(0, LOG_ENTRY_LEN - 1).toCharArray(e.msg, LOG_ENTRY_LEN);
        _head = (_head + 1) % LOG_MAX_ENTRIES;
        if (_count < LOG_MAX_ENTRIES) _count++;
        Serial.printf("[LOG] %s\n", e.msg);
    }

    // Write all entries oldest-first into a String for the web page
    String toHtml() const {
        String out;
        out.reserve(_count * (LOG_ENTRY_LEN + 40));
        int oldest = (_count < LOG_MAX_ENTRIES) ? 0 : _head;
        for (int i = 0; i < _count; i++) {
            const LogEntry& e = _buf[(oldest + i) % LOG_MAX_ENTRIES];
            unsigned long s  = e.ms / 1000;
            unsigned long ms = e.ms % 1000;
            out += "<tr><td>" + String(s) + "." + (ms < 100 ? "0" : "") + (ms < 10 ? "0" : "") + String(ms) + "s</td><td>";
            out += htmlEscape(e.msg);
            out += "</td></tr>\n";
        }
        return out;
    }

    void clear() { _head = 0; _count = 0; }
    int  count() const { return _count; }

private:
    static String htmlEscape(const char* s) {
        String out;
        while (*s) {
            switch (*s) {
                case '<': out += "&lt;";  break;
                case '>': out += "&gt;";  break;
                case '&': out += "&amp;"; break;
                default:  out += *s;
            }
            s++;
        }
        return out;
    }

    LogEntry _buf[LOG_MAX_ENTRIES];
    int      _head  = 0;
    int      _count = 0;
} logger;

// ── WiFi ──────────────────────────────────────────────────────────────────────
void connectWiFi() {
    Serial.printf("\n[WiFi] Connecting to %s (WPA2 Enterprise)\n", WIFI_SSID);
    WiFi.disconnect(true);
    WiFi.mode(WIFI_STA);
    WiFi.setHostname(WIFI_HOSTNAME);
/*
    esp_wifi_sta_wpa2_ent_set_identity((uint8_t *)WPA2_IDENTITY, strlen(WPA2_IDENTITY));
    esp_wifi_sta_wpa2_ent_set_username((uint8_t *)WPA2_USERNAME, strlen(WPA2_USERNAME));
    esp_wifi_sta_wpa2_ent_set_password((uint8_t *)WPA2_PASSWORD, strlen(WPA2_PASSWORD));
    esp_wifi_sta_wpa2_ent_enable();

    WiFi.begin(WIFI_SSID);
*/

    // ── WPA2 Personal / PSK alternative (comment out the block above and
    //    uncomment this line if your network uses a plain password instead) ───
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - start > WIFI_TIMEOUT_MS) {
            Serial.println("\n[WiFi] Timeout — restarting");
            ESP.restart();
        }
        delay(500);
        Serial.print(".");
    }
    Serial.printf("\n[WiFi] Connected | IP: %s\n", WiFi.localIP().toString().c_str());
    logger.log("WiFi connected, IP: " + WiFi.localIP().toString());
}

// ── ArduinoOTA ────────────────────────────────────────────────────────────────
void setupOTA() {
    ArduinoOTA.setHostname(WIFI_HOSTNAME);
   // ArduinoOTA.setPassword(OTA_PASSWORD);

    ArduinoOTA.onStart([]() {
        String type = (ArduinoOTA.getCommand() == U_FLASH) ? "firmware" : "filesystem";
        logger.log("OTA started: " + type + " update");
        mqtt.publish(MQTT_TOPIC_STATUS, "ota-start", true);
    });

    ArduinoOTA.onProgress([](unsigned int current, unsigned int total) {
        Serial.printf("[OTA] Progress: %u%%\r", (current * 100) / total);
    });

    ArduinoOTA.onEnd([]() {
        logger.log("OTA complete, rebooting");
        mqtt.publish(MQTT_TOPIC_STATUS, "ota-done", true);
    });

    ArduinoOTA.onError([](ota_error_t error) {
        const char* msg;
        switch (error) {
            case OTA_AUTH_ERROR:    msg = "Auth failed";    break;
            case OTA_BEGIN_ERROR:   msg = "Begin failed";   break;
            case OTA_CONNECT_ERROR: msg = "Connect failed"; break;
            case OTA_RECEIVE_ERROR: msg = "Receive failed"; break;
            case OTA_END_ERROR:     msg = "End failed";     break;
            default:                msg = "Unknown error";  break;
        }
        logger.log(String("OTA error: ") + msg);
        mqtt.publish(MQTT_TOPIC_STATUS, "ota-failed", true);
    });

    ArduinoOTA.begin();
    logger.log("OTA ready, hostname: " + String(WIFI_HOSTNAME));
}

// ── MQTT ──────────────────────────────────────────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
    String msg;
    msg.reserve(length);
    for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

    Serial.printf("[MQTT] <- [%s] %s\n", topic, msg.c_str());
    logger.log("MQTT <- [" + String(topic) + "] " + msg);

    // ── Add your command handling here ───────────────────────────────────────
    if (msg == "ping") {
        mqtt.publish(MQTT_TOPIC_STATUS, "pong");
    }
}

bool mqttConnect() {
    Serial.printf("[MQTT] Connecting to %s:%d ...\n", MQTT_BROKER, MQTT_PORT);

    bool ok = (strlen(MQTT_USER) > 0)
        ? mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD, MQTT_TOPIC_STATUS, 1, true, "offline")
        : mqtt.connect(MQTT_CLIENT_ID, nullptr, nullptr,          MQTT_TOPIC_STATUS, 1, true, "offline");

    if (ok) {
        logger.log("MQTT connected to " + String(MQTT_BROKER));
        mqtt.publish(MQTT_TOPIC_STATUS, "online", true);
        mqtt.subscribe(MQTT_TOPIC_SUB);
    } else {
        logger.log("MQTT failed, rc=" + String(mqtt.state()));
    }
    return ok;
}

void handleMqtt() {
    if (mqtt.connected()) {
        mqtt.loop();
        return;
    }
    if (millis() - lastMqttReconnect >= MQTT_RECONNECT_MS) {
        lastMqttReconnect = millis();
        mqttConnect();
    }
}

// ── Web Server ────────────────────────────────────────────────────────────────
static const char PAGE_STYLE[] = R"css(
  body{font-family:monospace;background:#111;color:#0f0;padding:2rem;max-width:700px;margin:auto}
  h1{letter-spacing:.1em}
  table{width:100%;border-collapse:collapse;margin:1rem 0}
  td{padding:.4rem .8rem;border:1px solid #0f04;vertical-align:top}
  td:first-child{color:#0f08;white-space:nowrap;width:7rem}
  a{color:#0f0;text-decoration:none;border:1px solid #0f0;padding:.3rem .8rem;display:inline-block;margin:.3rem}
  a:hover{background:#0f0;color:#111}
)css";

void handleRoot() {
    String html = String("<!DOCTYPE html><html><head>"
        "<meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>ESP32 Device</title><style>") + PAGE_STYLE + "</style></head><body>"
        "<h1>&#x2665; ESP32 Device</h1>"
        "<table>"
        "<tr><td>Hostname</td><td>" + WIFI_HOSTNAME + "</td></tr>"
        "<tr><td>IP</td><td>" + WiFi.localIP().toString() + "</td></tr>"
        "<tr><td>RSSI</td><td>" + String(WiFi.RSSI()) + " dBm</td></tr>"
        "<tr><td>Free Heap</td><td>" + String(ESP.getFreeHeap()) + " bytes</td></tr>"
        "<tr><td>Uptime</td><td>" + String(millis() / 1000) + " s</td></tr>"
        "<tr><td>MQTT</td><td>" + (mqtt.connected() ? "connected" : "disconnected") + "</td></tr>"
        "</table>"
        "<a href='/log'>&#x1F4CB; Log</a>"
        "<a href='/reset'>&#x21ba; Restart</a>"
        "</body></html>";
    server.send(200, "text/html", html);
}

void handleLog() {
    String html = String("<!DOCTYPE html><html><head>"
        "<meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<meta http-equiv='refresh' content='5'>"
        "<title>ESP32 Log</title><style>") + PAGE_STYLE + "</style></head><body>"
        "<h1>&#x1F4CB; Log <small style='font-size:.5em;color:#0f08'>(" + String(logger.count()) + "/" + String(LOG_MAX_ENTRIES) + " entries, auto-refresh 5s)</small></h1>"
        "<table>" + logger.toHtml() + "</table>"
        "<a href='/log/clear'>&#x2715; Clear</a>"
        "<a href='/'>&#x2190; Back</a>"
        "</body></html>";
    server.send(200, "text/html", html);
}

void handleLogClear() {
    logger.clear();
    logger.log("Log cleared");
    server.sendHeader("Location", "/log");
    server.send(302, "text/plain", "");
}

void handleReset() {
    logger.log("Restart requested via web");
    server.send(200, "text/plain", "Restarting...");
    delay(500);
    ESP.restart();
}

void handleNotFound() {
    server.send(404, "text/plain", "Not found");
}

void setupWebServer() {
    server.on("/",          handleRoot);
    server.on("/log",       handleLog);
    server.on("/log/clear", handleLogClear);
    server.on("/reset",     handleReset);
    server.onNotFound(handleNotFound);
    server.begin();
    Serial.printf("[Web] Server on port %d\n", WEB_SERVER_PORT);
}

// ── Arduino entry points ──────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);

    connectWiFi();
    setupOTA();

    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    mqtt.setCallback(onMqttMessage);
    mqttConnect();

    setupWebServer();
    logger.log("Boot complete");
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        logger.log("WiFi lost, reconnecting");
        connectWiFi();
    }

    // Log internal temperature every TEMP_LOG_INTERVAL_MS
    if (millis() - lastTempLog >= TEMP_LOG_INTERVAL_MS) {
        lastTempLog = millis();
        float tempC = temperatureRead();
        logger.log("CPU temp: " + String(tempC, 1) + " C  (" + String((tempC * 9.0f / 5.0f) + 32.0f, 1) + " F)");
    }

    ArduinoOTA.handle();
    handleMqtt();
    server.handleClient();
}