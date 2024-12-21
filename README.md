# Rugby Scoreboard

Welcome to the Rugby Scoreboard project! This DIY scoreboard is perfect for keeping track of rugby games and brings your matches to life. Let's dive in and get started!

---

## Parts
We’re still working on the parts list—stay tuned for updates!

---

## Code
Uploading the code to your ESP is simple. Just run the following command:

```bash
./gradlew uploadFilesystem uploadCode -Pport=COM1
```

This command will build the entire project and upload it to your connected ESP device through the specified serial port (in this example, `COM1`).

### Setting the Target Board
Before your first upload, you'll need to set up the target board:
1. Run the following command to list all available boards:

   ```bash
   build/arduino-cli/arduino-cli board listall
   ```

2. Find the correct board name from the list and set it in `gradle.properties` using the `fqbn` property.

### Finding Connected Boards
To identify the correct serial port for your ESP, connect the device and run one of the following commands:

```bash
./gradlew boards
```

or

```bash
build/arduino-cli/arduino-cli board list
```

---

## Tested Software Versions
Want to check the versions of the tools you’re using? Just run:

```bash
./gradlew version
```

Here’s an example output for reference:

```
> Task :versionOs
OS: name=windows 11, arch=amd64, version=10.0

> Task :versionMklittlefs
mklittlefs ver. cc32c94
Build configuration name: arduino
LittleFS ver. v2.9.3
Extra build flags: (none)
LittleFS configuration:
  LFS_NAME_MAX: 255
  LFS_FILE_MAX: 2147483647
  LFS_ATTR_MAX: 1022

> Task :versionArduino
arduino-cli  Version: 1.1.1 Commit: fa6eafcb Date: 2024-11-22T09:31:38Z

> Task :versionPython
Python 3.10.11

> Task :versionEsptool
esptool.py v4.8.1
4.8.1

> Task :version
App version=1.0.0
```

---

## WiFi Access Point
By default, the AP SSID is set to `rugby`, and the password is randomly generated. If you prefer to use your own SSID and password, you can pass these as properties in the command line. For example:

```bash
./gradlew saveWifiConfig -Pwifi.ssid=my_ssid -Pwifi.password=my_password
./gradlew uploadCode -Pwifi.ssid=my_ssid -Pwifi.password=my_password
```

This will ensure that your preferred settings are saved and used for the upload.

---

Happy coding and enjoy your Rugby Scoreboard project!

