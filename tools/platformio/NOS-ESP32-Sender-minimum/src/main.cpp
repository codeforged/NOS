#include <Arduino.h>
#include <noslib.h>

#define WIFI_SSID "BabamGo"
#define WIFI_PASSWORD "bismillah"
#define MQTT_SERVER "192.168.0.105"
#define MQTT_PORT 1883

char key[KEY_SIZE] = {0x81, 0xFF, 0x71, 0xED, 0x57, 0x4E, 0x54, 0x59,
                      0x76, 0x90, 0xAE, 0x7B, 0x04, 0xE4, 0xEF, 0x5F,
                      0xC8, 0x74, 0x97, 0xFE, 0x10, 0xB6, 0xB0, 0x37,
                      0xCB, 0x03, 0x1A, 0xF7, 0xC7, 0xD6, 0x76, 0x19};
NOS nos("ESP32MultiSensorDec", 100, key, MQTT_SERVER, MQTT_PORT);

const char *sensorIds[] = {"01", "02", "03", "04"};
int sensorVals[4] = {0, 0, 0, 0}; // Initial values for sensors
const int sensorCount = 4;
uint32_t lastSent = 0;

void setup()
{
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED)
    delay(500);
  nos.begin();
}

void loop()
{
  nos.loop();
  if (millis() - lastSent >= 5000)
  {
    for (int i = 0; i < sensorCount; i++)
    {
      int delta = random(-10, 11);
      sensorVals[i] = constrain(sensorVals[i] + delta, 1, 100);
    }
    char data[64];
    sprintf(data, "%s=%d;%s=%d;%s=%d;%s=%d",
            sensorIds[0], sensorVals[0],
            sensorIds[1], sensorVals[1],
            sensorIds[2], sensorVals[2],
            sensorIds[3], sensorVals[3]);
    nos.sendPacket("espiot", 1000, data);
    Serial.println(data);
    lastSent = millis();
  }
}