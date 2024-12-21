#include <Arduino.h>
#include <WiFi.h>           // For Wi-Fi functionality
#include <WebServer.h>      // Built-in library for HTTP server
#include <LittleFS.h>       // File system library for serving files
#include <ArduinoJson.h>    // For JSON handling
#include <uri/UriRegex.h>

// Create an instance of the WebServer on port 80
WebServer server(80);

// Internal score state
struct Score {
  int home = 0;
  int away = 0;
} score;

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
    handleGetScore();
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

// Handle GET requests to "/score"
void handleGetScore() {
  DynamicJsonDocument doc(256);
  doc["home"] = score.home;
  doc["away"] = score.away;

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
  server.on("/score", HTTP_GET, handleGetScore);

  // Handle unknown routes
  server.onNotFound(handleNotFound);

  // Start the server
  server.begin();
  Serial.println("Server started!");
}

void loop() {
  server.handleClient(); // Handle incoming client requests
}
