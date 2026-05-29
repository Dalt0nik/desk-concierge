#include <Arduino.h>
#include <WiFi.h>
#include "esp_wpa2.h"
#include "esp_wifi.h"
#include <ArduinoOTA.h>
#include <WebServer.h>
#include <PubSubClient.h>

const char* ssid = "DB-CTS-WORK";
const char* password = "jq87427@";
const char* mqtt_server  = "10.6.10.36";
const int   mqtt_port    = 1883;
const char* status_topic = "desk/1/status";
const char* led_topic    = "desk/1/led";

// Sensor & LED pins
#define SENSOR_PIN  14   // KY-032 OUT → LOW when obstacle (occupied)
#define LED_PIN_R   25
#define LED_PIN_Y   26
#define LED_PIN_G   27

// for wpa
#define EAP_IDENTITY "hakatonas.2026@devbridge.com"
#define EAP_USERNAME "hakatonas.2026@devbridge.com"
#define EAP_PASSWORD "H@katon@Devbridgge26"

extern "C" uint8_t temprature_sens_read();

WebServer server(80);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSensorRead = 0;
String lastPublished = "";
unsigned long lastOccupiedAt = 0;

const unsigned long FREE_DELAY_MS = 10UL * 1000UL; // 10 seconds

String logs = "";

void appendLog(String message) {
  logs += message + "\n";
  if (logs.length() > 4000) {
    logs = logs.substring(logs.length() - 4000);
  }
}

void setLed(const String& color) {
  digitalWrite(LED_PIN_R, color == "red"    ? HIGH : LOW);
  digitalWrite(LED_PIN_Y, color == "yellow" ? HIGH : LOW);
  digitalWrite(LED_PIN_G, color == "green"  ? HIGH : LOW);
  appendLog("LED -> " + color);
}

void reconnect();
void callback(char* topic, byte* payload, unsigned int length);

void setupWiFi() {
  Serial.begin(115200);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);

// enable below code for WPA:

  esp_wifi_sta_wpa2_ent_set_identity((uint8_t *)EAP_IDENTITY, strlen(EAP_IDENTITY));
  esp_wifi_sta_wpa2_ent_set_username((uint8_t *)EAP_USERNAME, strlen(EAP_USERNAME));
  esp_wifi_sta_wpa2_ent_set_password((uint8_t *)EAP_PASSWORD, strlen(EAP_PASSWORD));
  
  esp_wifi_sta_wpa2_ent_enable(); 
  WiFi.begin(ssid);

 // WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void setupOTA() {
  // Port defaults to 3232, but you can change it
  ArduinoOTA.setPort(3232);

  // Hostname defaults to esp3232-[MAC]
  ArduinoOTA.setHostname("esp32-hackaton_2");

  // No authentication by default (optional)
  // ArduinoOTA.setPassword("admin");

  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH)
      type = "sketch";
    else // U_SPIFFS
      type = "filesystem";
    Serial.println("Start updating " + type);
  });
  
  ArduinoOTA.onEnd([]() {
    Serial.println("\nEnd");
  });
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });

  ArduinoOTA.begin();
}

// Webserver to print log messages to.
void setUpWebServer() {
  server.on("/", [] (){
    server.send(200, "text/plain", logs);
  });
  server.begin();
}

void setup() {
  setupWiFi();
  setupOTA();
  setUpWebServer();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // Sensor input, LED outputs — start green (free)
  pinMode(SENSOR_PIN, INPUT);
  pinMode(LED_PIN_R, OUTPUT);
  pinMode(LED_PIN_Y, OUTPUT);
  pinMode(LED_PIN_G, OUTPUT);
  setLed("green");
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
  // Your other code goes here
  if (!client.connected()) {
    reconnect();
  }

  client.loop();

  // Read sensor every 2 s; occupied publishes immediately, free only after 2 min with no occupied reading
  if (millis() - lastSensorRead >= 2000) {
    lastSensorRead = millis();
    // KY-032: LOW = obstacle detected = occupied
    bool occupied = (digitalRead(SENSOR_PIN) == LOW);

    if (occupied) {
      lastOccupiedAt = millis();
      if (lastPublished != "occupied") {
        lastPublished = "occupied";
        client.publish(status_topic, "occupied", true);
        appendLog("Status -> occupied");
      }
    } else {
      unsigned long sinceOccupied = lastOccupiedAt == 0 ? FREE_DELAY_MS : millis() - lastOccupiedAt;
      if (lastPublished != "free" && sinceOccupied >= FREE_DELAY_MS) {
        lastPublished = "free";
        client.publish(status_topic, "free", true);
        appendLog("Status -> free");
      }
    }
  }

}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  if (String(topic) == led_topic) {
    setLed(msg);
  }
}


void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-1000";
    client.setBufferSize(512);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(led_topic);
      if (lastPublished.length() > 0) {
        client.publish(status_topic, lastPublished.c_str(), true);
      }
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}
