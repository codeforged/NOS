#include <Arduino.h>
#include <noslib.h>

#define WIFI_SSID "<YoutWiFiSSID>"
#define WIFI_PASSWORD "YourWiFiPassword"
#define MQTT_SERVER "192.168.0.105"
#define MQTT_PORT 1883

char key[KEY_SIZE] = {<Your 32 byte Chacha20 Key>};

// === Inisialisasi NOS ===
NOS nos("ESP32MultiSensorDec", 100, key, MQTT_SERVER, MQTT_PORT);

// === Fungsi: Koneksi ke WiFi ===
bool connectToWiFi()
{
  Serial.print("WiFi connecting...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("\nWiFi connection failed!");
  return false;
}

// === Setup ===
void setup()
{
  Serial.begin(115200);
  delay(1000);

  if (connectToWiFi())
  {
    nos.begin(); // Koneksi MQTT dan inisialisasi NOS
  }
}

enum sensorType
{
  TEMP_SENSOR,
  HUMID_SENSOR,
  LIGHT_SENSOR,
  SOIL_SENSOR,
  SENSOR_COUNT
};
static uint32_t lastSent = 0;
static int tempSensor = 10;
static int humidSensor = 10;
static int lightSensor = 10;
static int soilSensor = 10;
int randomWidth = 20;

// === Loop ===
void loop()
{
  nos.loop(); // Harus dipanggil terus-menerus

  if (millis() - lastSent >= 5000)
  {
    // Simulasi pembacaan semua sensor
    int deltaTemp = random(0 - randomWidth / 2, randomWidth / 2 + 1);
    tempSensor += deltaTemp;
    if (tempSensor < 1)
      tempSensor = 1;
    if (tempSensor > 100)
      tempSensor = 100;

    int deltaHumid = random(0 - randomWidth / 2, randomWidth / 2 + 1);
    humidSensor += deltaHumid;
    if (humidSensor < 1)
      humidSensor = 1;
    if (humidSensor > 100)
      humidSensor = 100;

    int deltaLight = random(0 - randomWidth / 2, randomWidth / 2 + 1);
    lightSensor += deltaLight;
    if (lightSensor < 1)
      lightSensor = 1;
    if (lightSensor > 100)
      lightSensor = 100;

    int deltaSoil = random(0 - randomWidth / 2, randomWidth / 2 + 1);
    soilSensor += deltaSoil;
    if (soilSensor < 1)
      soilSensor = 1;
    if (soilSensor > 100)
      soilSensor = 100;

    // Format data sebagai string
    char data[64];
    sprintf(data, "01=%d;02=%d;03=%d;04=%d", tempSensor, humidSensor, lightSensor, soilSensor);

    // Kirim paket data
    // nos.sendPacket("sens-receptor", 1000, data);
    nos.sendPacket("espiot", 1000, data);
    Serial.printf("Mengirim data: %s\r\n", data);

    lastSent = millis();
  }
}
