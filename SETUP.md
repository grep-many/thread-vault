# 📱 Cross-Platform Android Dev Setup
## Wireless ADB + scrcpy Development Environment

A complete cross-platform Android development setup using:

- Wireless ADB
- scrcpy
- Low-latency mirroring
- Physical phone screen OFF
- Persistent always-awake Android session

Supports:

- Windows
- Linux
- macOS

Ideal for:

- React Native
- Android Studio
- Flutter
- Expo
- Mobile debugging workflows

---

# 📦 Requirements

Install:

## Android Platform Tools (ADB)

Download:
- https://developer.android.com/tools/releases/platform-tools

Ensure `adb` is added to PATH.

---

## scrcpy

Official:
- https://github.com/Genymobile/scrcpy

### Windows

Using Scoop:

```powershell
scoop install scrcpy
```

OR

Using Chocolatey:

```powershell
choco install scrcpy
```

---

### Linux (Ubuntu/Debian)

```bash
sudo apt install scrcpy
```

---

### macOS

```bash
brew install scrcpy
```

---

# 📱 Android Device Setup

Enable Developer Options:

```text
Settings → About Phone → Tap Build Number 7 times
```

Then enable:

```text
Settings → Developer Options
```

Enable:

- USB Debugging
- Wireless Debugging

---

# 📡 Wireless ADB Setup

---

# ✅ Method 1 — Android 11+ Wireless Debugging (Recommended)

## Step 1 — Pair Device

On Android:

```text
Developer Options → Wireless Debugging
```

Tap:

```text
Pair device with pairing code
```

You will see:

- IP Address
- Pairing Port
- Pairing Code

---

## Step 2 — Pair From PC

### Windows / Linux / macOS

```bash
adb pair IP_ADDRESS:PAIR_PORT
```

Example:

```bash
adb pair 192.168.1.5:42671
```

Enter pairing code when prompted.

---

## Step 3 — Connect Device

```bash
adb connect IP_ADDRESS:PORT
```

Example:

```bash
adb connect 192.168.1.5:37219
```

---

## Step 4 — Verify

```bash
adb devices
```

Expected:

```text
List of devices attached
192.168.1.5:37219 device
```

---

# ✅ Method 2 — Legacy TCP/IP Setup (USB Required Initially)

Useful for older Android versions.

---

## Step 1 — Connect USB

Verify:

```bash
adb devices
```

---

## Step 2 — Enable TCP/IP Mode

```bash
adb tcpip 5555
```

Expected:

```text
restarting in TCP mode port: 5555
```

---

## Step 3 — Find Device IP

### Linux/macOS

```bash
adb shell ip route
```

### Windows

```powershell
adb shell ip route
```

Example output:

```text
192.168.1.1 dev wlan0 proto kernel scope link src 192.168.1.5
```

Device IP:

```text
192.168.1.5
```

---

## Step 4 — Disconnect USB

Remove cable.

---

## Step 5 — Connect Wirelessly

```bash
adb connect DEVICE_IP:5555
```

Example:

```bash
adb connect 192.168.1.5:5555
```

---

## Step 6 — Verify

```bash
adb devices
```

Expected:

```text
192.168.1.5:5555 device
```

---

# 🖥️ scrcpy Dev Environment

---

# 🚀 Recommended Command

## Windows (CMD)

```bat
scrcpy ^
--shortcut-mod=lctrl ^
--stay-awake ^
--turn-screen-off ^
--max-size 720 ^
--video-bit-rate 2M ^
--max-fps 30 ^
--window-borderless ^
--always-on-top ^
--window-x 0 ^
--window-y 0 ^
--window-height 730
```

---

## Linux / macOS

```bash
scrcpy \
--shortcut-mod=lctrl \
--stay-awake \
--turn-screen-off \
--max-size 720 \
--video-bit-rate 2M \
--max-fps 30 \
--window-borderless \
--always-on-top \
--window-x 0 \
--window-y 0 \
--window-height 730
```

---

# ⚡ What This Setup Does

| Feature | Purpose |
|---|---|
| `--stay-awake` | Prevents Android sleep |
| `--turn-screen-off` | Turns OFF physical display |
| `--shortcut-mod=lctrl` | Uses Left Ctrl shortcuts |
| `--always-on-top` | Keeps mirror over IDE |
| `--window-borderless` | Frameless clean window |
| `--max-size 720` | Reduced wireless latency |
| `--video-bit-rate 2M` | Stable Wi-Fi streaming |
| `--max-fps 30` | Lower bandwidth usage |

---

# 🔋 Final Workflow Result

✅ Android stays awake internally  
✅ Physical screen stays OFF  
✅ PC mirror stays active  
✅ Reduced battery usage  
✅ Cleaner desk setup  
✅ Better multitasking during development

---

# ⌨️ scrcpy Shortcuts
## Modifier = Left Ctrl

---

# Navigation

| Action | Shortcut |
|---|---|
| Home | `L-Ctrl + h` |
| Back | `L-Ctrl + b` |
| App Switcher | `L-Ctrl + s` |
| Menu | `L-Ctrl + m` |

---

# Device Controls

| Action | Shortcut |
|---|---|
| Toggle Screen | `L-Ctrl + p` |
| Rotate Screen | `L-Ctrl + r` |
| Fullscreen | `L-Ctrl + f` |
| Volume Up | `L-Ctrl + ↑` |
| Volume Down | `L-Ctrl + ↓` |

---

# Clipboard

| Action | Shortcut |
|---|---|
| Copy to PC | `L-Ctrl + c` |
| Paste to Phone | `L-Ctrl + v` |
| Cut | `L-Ctrl + x` |
| Sync Clipboard | `L-Ctrl + Shift + v` |

---

# Notifications

| Action | Shortcut |
|---|---|
| Expand Notifications | `L-Ctrl + n` |
| Collapse Notifications | `L-Ctrl + Shift + n` |

---

# Utility

| Action | Shortcut |
|---|---|
| Screenshot | `L-Ctrl + Shift + s` |
| Show Touches | `L-Ctrl + t` |

---

# 📂 Automation Scripts

---

# Windows Script
## `scripts/dev-mirror.bat`

```bat
@echo off

adb connect 192.168.1.5:5555

scrcpy ^
--shortcut-mod=lctrl ^
--stay-awake ^
--turn-screen-off ^
--max-size 720 ^
--video-bit-rate 2M ^
--max-fps 30 ^
--window-borderless ^
--always-on-top ^
--window-x 0 ^
--window-y 0 ^
--window-height 730
```

Run:

```bat
dev-mirror.bat
```

---

# Linux/macOS Script
## `scripts/dev-mirror.sh`

```bash
#!/bin/bash

adb connect 192.168.1.5:5555

scrcpy \
--shortcut-mod=lctrl \
--stay-awake \
--turn-screen-off \
--max-size 720 \
--video-bit-rate 2M \
--max-fps 30 \
--window-borderless \
--always-on-top \
--window-x 0 \
--window-y 0 \
--window-height 730
```

Make executable:

```bash
chmod +x scripts/dev-mirror.sh
```

Run:

```bash
./scripts/dev-mirror.sh
```

---

# 📁 Recommended Project Structure

```text
project-root/
│
├── docs/
│   └── DEV_SETUP.md
│
├── scripts/
│   ├── dev-mirror.bat
│   └── dev-mirror.sh
│
└── README.md
```

---

# 🧠 Recommended Workspace Layout

```text
┌───────────────────────────────┬─────────────┐
│                               │             │
│        VS Code / IDE          │   scrcpy    │
│                               │   Mirror    │
│                               │             │
└───────────────────────────────┴─────────────┘
```

---

# 🛠 Troubleshooting

---

# Device Not Found

```bash
adb kill-server
adb start-server
adb devices
```

Reconnect device.

---

# Black Screen on PC

Press:

```text
L-Ctrl + p
```

to toggle display state.

---

# Laggy Stream

Lower resolution:

```bash
--max-size 480
```

OR reduce bitrate:

```bash
--video-bit-rate 1M
```

---

# Frequent Disconnects

Use:

- 5GHz Wi-Fi
- Disable battery optimization for:
  - Wireless Debugging
  - Developer Services
  - Settings app

---

# 🏁 Final Recommended Command

```bash
scrcpy --shortcut-mod=lctrl --stay-awake --turn-screen-off --max-size 720 --video-bit-rate 2M --max-fps 30 --window-borderless --always-on-top --window-x 0 --window-y 0 --window-height 730
```