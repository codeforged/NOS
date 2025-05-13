
#include <noslib.h>

// === Konfigurasi ===
#define WIFI_SSID     "BabamGo"
#define WIFI_PASSWORD "bismillah"
// #define WIFI_SSID     "K1ngUn1c0rn"
// #define WIFI_PASSWORD "32321000"
#define MQTT_SERVER   "192.168.0.105"
// #define MQTT_SERVER   "62.72.31.252"
#define MQTT_PORT     1883

// Kunci enkripsi 256-bit (32 bytes)
char key[KEY_SIZE] = {
  0x81, 0xFF, 0x71, 0xED, 0x57, 0x4E, 0x54, 0x59,
  0x76, 0x90, 0xAE, 0x7B, 0x04, 0xE4, 0xEF, 0x5F,
  0xC8, 0x74, 0x97, 0xFE, 0x10, 0xB6, 0xB0, 0x37,
  0xCB, 0x03, 0x1A, 0xF7, 0xC7, 0xD6, 0x76, 0x19
};

// === Inisialisasi NOS ===
NOS nos("myESP2", 100, key, MQTT_SERVER, MQTT_PORT);

// === Fungsi: Handler pesan masuk ===
void messageReceived(const char* srcAddress, int srcPort, const char* payload) {
  Serial.printf("Message from %s:%d -> %s\r\n", srcAddress, srcPort, payload);
}

// === Fungsi: Koneksi ke WiFi ===
bool connectToWiFi() {
  Serial.print("WiFi connecting...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; ++i) {
    delay(1000);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("\nWiFi connection failed!");
  return false;
}

// === Setup ===
void setup() {
  Serial.begin(115200);
  delay(1000);

  if (connectToWiFi()) {
    nos.begin();  // Koneksi MQTT dan inisialisasi NOS
    nos.onMessage(messageReceived);
  }
}

// === Loop ===
void loop() {
  nos.loop();  // Harus dipanggil terus-menerus

  static uint32_t lastSent = 0;
  // Menyimpan nilai saat ini, mulai dari 10
  static int currentValue = 10;  

  if (millis() - lastSent >= 2500) {
    char data[64];
    // Menghasilkan delta acak antara -5 sampai +5
    int delta = random(-5, 6);  // random(-5, 6) menghasilkan nilai -5, -4, ..., 4, 5
    currentValue += delta;
    
    // Memastikan nilai tidak keluar dari batas 1 sampai 100
    if (currentValue < 1) {
      currentValue = 1;
    }
    if (currentValue > 100) {
      currentValue = 100;
    }
    
    sprintf(data, "02=%d", currentValue);
    nos.sendPacket("espiot", 1000, data);
    Serial.println("Packet sent.");
    lastSent = millis();
  }
}
