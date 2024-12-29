#include <Arduino.h>
#include <WiFi.h>           // For Wi-Fi functionality
#include <WebServer.h>      // Built-in library for HTTP server
#include <LittleFS.h>       // File system library for serving files
#include <ArduinoJson.h>    // For JSON handling
#include <uri/UriRegex.h>
// #include <Adafruit_NeoPixel.h>

// Create an instance of the WebServer on port 80
WebServer server(80);

int LED_PIN      =  11;
int NUM_LEDS     =  30;
int COLOR_RED    = 255;
int COLOR_GREEN  =  0;
int COLOR_BLUE   =  0;

int TIME_LED_PIN      =  12;
int TIME_NUM_LEDS     =  30;
int TIME_COLOR_RED    = 255;
int TIME_COLOR_GREEN  =  0;
int TIME_COLOR_BLUE   =  0;

int MAX_SCORE_VALUE = 99;

// Adafruit_NeoPixel strip;
int NUM_SEGMENTS = 7;
int MASKS[]  = {
        /* 0 */ 0b1110111,
        /* 1 */ 0b1000100,
        /* 2 */ 0b0111110,
        /* 3 */ 0b1101110,
        /* 4 */ 0b1001101,
        /* 5 */ 0b1101011,
        /* 6 */ 0b1111011,
        /* 7 */ 0b1000110,
        /* 8 */ 0b1111111,
        /* 9 */ 0b1101111
    };


// Internal score state
struct Score {
  int home = 0;
  int away = 0;
} score;

// Timer variables
uint ONE_MINUTE = 60000;
unsigned long startTime = 0;
bool isRunning = false;

// Wi-Fi AP credentials
String ssid;
String password;

// Helper function to serve gzipped files
void serveGzipFile(const String &path, const String &contentType) {
  if (LittleFS.exists(path)) {
    File file = LittleFS.open(path, "r");
    server.streamFile(file, contentType);
    file.close();
  } else {
    server.send(404, "text/plain", "File Not Found");
  }
}

// Handle root request ("/")
void handleRoot() {
  serveGzipFile("/index.min.html.gz", "text/html; charset=utf-8");
}

// Handle CSS file requests
void handleCSS() {
  String filename = "/" + server.pathArg(0) + ".css.gz";
  serveGzipFile(filename, "text/css; charset=utf-8");
}

// Handle JS file requests
void handleJS() {
  String filename = "/" + server.pathArg(0) + ".js.gz";
  serveGzipFile(filename, "application/javascript; charset=utf-8");
}

// Common function to handle score updates
void handleUpdateScore(int& teamScore) {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));
  if (error) {
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }

  if (doc.containsKey("points")) {
    int points = doc["points"].as<int>();
    if (teamScore + points < 0) {
      server.send(400, "application/json", "{\"error\":\"Cannot go below 0 points!\"}");
      return;
    }
    teamScore += points;
    if(teamScore > MAX_SCORE_VALUE) {
        teamScore = MAX_SCORE_VALUE;
    }
    handleGetScore();
    updateScoreLeds();
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing 'points' key\"}");
  }
}

// Handler for home team score
void handleUpdateHome() {
  handleUpdateScore(score.home);
}

// Handler for away team score
void handleUpdateAway() {
  handleUpdateScore(score.away);
}

void handleCleanScore() {
    score.home = 0;
    score.away = 0;
    handleGetScore();
}

// Handle GET requests to "/score"
void handleGetScore() {
  DynamicJsonDocument doc(256);
  doc["home"] = score.home;
  doc["away"] = score.away;

  String jsonResponse;
  serializeJson(doc, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

// handle GET request to "/refresh"
void handleRefresh() {
    handleGetScore();
    updateScoreLeds();
}

// handle POST request to "/time/start"
void handleTimeStart() {
    if (server.method() != HTTP_POST) {
        server.send(405, "text/plain", "Method Not Allowed");
        return;
    }

    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, server.arg("plain"));
    if (error) {
        server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
    }

    int startFrom = doc["startFrom"].as<int>();
    if (startFrom < 0) {
        server.send(400, "application/json", "{\"error\":\"Start from cannot be lower than 0!\"}");
        return;
    }

    isRunning = true;
    startTime = millis() - (startFrom * ONE_MINUTE);
    handleTimeStatus();
}

// handle POST request to "/time/stop"
void handleTimeStop() {
    if (server.method() != HTTP_POST) {
        server.send(405, "text/plain", "Method Not Allowed");
        return;
    }
    isRunning = false;
    startTime = 0;
    handleTimeStatus();
}

// handle GET request to "/time/status"
void handleTimeStatus() {
  DynamicJsonDocument doc(256);
  if(isRunning) {
    doc["elapsedMins"] = ((millis() - startTime + ONE_MINUTE) / ONE_MINUTE);
  }
  doc["isRunning"] = isRunning;
  String jsonResponse;
  serializeJson(doc, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

// Redirect unknown routes to "/"
void handleNotFound() {
  server.sendHeader("Location", "/", true); // Redirect to "/"
  server.send(302, "text/plain", "");
}

// Read Wi-Fi credentials from file system
bool readWiFiCredentials() {
  File file = LittleFS.open("/wifi_config.txt", "r");
  if (!file) {
    Serial.println("Failed to open Wi-Fi credentials file!");
    return false;
  }

  // Read the SSID and password from the file
  ssid = file.readStringUntil('\n');
  password = file.readStringUntil('\n');

  // Remove any trailing newline characters
  ssid.trim();
  password.trim();

  file.close();
  return true;
}

void setup() {
  Serial.begin(115200);

  // Initialize LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("Failed to mount LittleFS!");
    return;
  }

  // Read Wi-Fi credentials from file
  if (!readWiFiCredentials()) {
    Serial.println("Failed to read Wi-Fi credentials.");
    return;
  }

  // Configure Wi-Fi as an access point with the read credentials
  WiFi.softAP(ssid.c_str(), password.c_str());

  // Print the IP address
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  // Define routes
  server.on("/", HTTP_GET, handleRoot);
  server.on(UriRegex("^\\/([a-zA-Z0-9_.-]+)\\.css$"), HTTP_GET, handleCSS);
  server.on(UriRegex("^\\/([a-zA-Z0-9_.-]+)\\.js"), HTTP_GET, handleJS);
  server.on("/score/home", HTTP_POST, handleUpdateHome);
  server.on("/score/away", HTTP_POST, handleUpdateAway);
  server.on("/score/clean", HTTP_POST, handleCleanScore);
  server.on("/score", HTTP_GET, handleGetScore);
  server.on("/refresh", HTTP_GET, handleRefresh);
  // time endpoints
  server.on("/time/start", HTTP_POST, handleTimeStart);
  server.on("/time/stop", HTTP_POST, handleTimeStop);
  server.on("/time/status", HTTP_GET, handleTimeStatus);

  // Handle unknown routes
  server.onNotFound(handleNotFound);

  if (!loadConfig()) {
    Serial.println("Failed to load configuration, using default values.");
  }

//   strip.updateType(NEO_GRB + NEO_KHZ800);
//   strip.updateLength(NUM_LEDS);
//   strip.setPin(LED_PIN);
//   strip.begin();
//   updateScoreLeds();

  // Start the server
  server.begin();
  Serial.println("Server started!");
}

void loop() {
  server.handleClient(); // Handle incoming client requests
}

void updateScoreLeds() {
//     strip.clear();

    {
        int firstDigit = 0, secondDigit = 0;
        getDigits(score.home, firstDigit, secondDigit);
        if(firstDigit != 0) setDigit(firstDigit, 3);
        setDigit(secondDigit, 2);
    }

    {
        int firstDigit = 0, secondDigit = 0;
        getDigits(score.away, firstDigit, secondDigit);
        if(firstDigit != 0) setDigit(firstDigit, 1);
        setDigit(secondDigit, 0);
    }

//     strip.show(); // Update the strip to display the changes
}

void setDigit(int digit, int order) {
    if (digit >= sizeof(MASKS) / sizeof(int)) return;
    int mask = MASKS[digit];

    int offset = order * NUM_SEGMENTS * NUM_LEDS;
    int value = 1;
    for (int idx = 0; idx < NUM_SEGMENTS; idx++) {
        int masked = mask & value;
        if (masked == 0) continue;

//         int color = strip.Color(COLOR_RED, COLOR_GREEN, COLOR_BLUE);
//         for (int jdx = 0; jdx < NUM_LEDS; jdx++) {
//             strip.setPixelColor(offset + idx * NUM_LEDS + jdx, color);
//         }

        value = value << 1;
    }
}

// Function to extract the first and second digits from an integer
void getDigits(int number, int &firstDigit, int &secondDigit) {
  // Extract the first digit
  firstDigit = number;
  while (firstDigit >= 10) {
    firstDigit /= 10;
  }

  // Extract the second digit
  int divisor = 1;
  while (number / divisor >= 100) {
    divisor *= 10;
  }
  secondDigit = (number / divisor) % 10;
}

// Function to load the configuration file
bool loadConfig() {
  File configFile = LittleFS.open("/config.json", "r");
  if (!configFile) {
    Serial.println("Failed to open config file.");
    return false;
  }

  size_t size = configFile.size();
  if (size > 1024) {
    Serial.println("Config file size is too large.");
    return false;
  }

  // Read file into a string
  String configData = configFile.readString();
  configFile.close();

  // Parse JSON
  StaticJsonDocument<256> jsonDoc;
  DeserializationError error = deserializeJson(jsonDoc, configData);

  if (error) {
    Serial.println("Failed to parse config file.");
    return false;
  }

  // Load values
  LED_PIN = jsonDoc["led_pin"] | LED_PIN;  // Use default if not found
  NUM_LEDS = jsonDoc["num_leds"] | NUM_LEDS;  // Use default if not found
  COLOR_RED = jsonDoc["color_red"] | COLOR_RED;  // Use default if not found
  COLOR_GREEN = jsonDoc["color_green"] | COLOR_GREEN;  // Use default if not found
  COLOR_BLUE = jsonDoc["color_blue"] | COLOR_BLUE;  // Use default if not found

  // Load time values
  // Check if the "time" object exists
  if (jsonDoc.containsKey("time")) {
    JsonObject timeObject = jsonDoc["time"].as<JsonObject>();

    // Load time-specific values
    TIME_LED_PIN = timeObject["led_pin"] | TIME_LED_PIN;  // Use default if not found
    TIME_NUM_LEDS = timeObject["num_leds"] | TIME_NUM_LEDS;  // Use default if not found
    TIME_COLOR_RED = timeObject["color_red"] | TIME_COLOR_RED;  // Use default if not found
    TIME_COLOR_GREEN = timeObject["color_green"] | TIME_COLOR_GREEN;  // Use default if not found
    TIME_COLOR_BLUE = timeObject["color_blue"] | TIME_COLOR_BLUE;  // Use default if not found
  }

  Serial.printf("Config loaded: LED_PIN=%d, NUM_LEDS=%d\n", LED_PIN, NUM_LEDS);
  return true;
}
