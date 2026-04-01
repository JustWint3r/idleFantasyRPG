# Idle Fantasy RPG

A mobile idle RPG built with React Native and Expo. Deploy heroes to farm zones, collect loot, and earn resources — even while offline.

## Features

- **Idle farming** — heroes farm automatically and accumulate loot while the app is closed, up to a configurable offline cap
- **Weighted loot tables** — zone-specific tables drop gold, XP books, craft materials, summon scrolls, and gear items
- **Hero deployment** — assign heroes to zones based on Combat Power requirements
- **Live & offline ticks** — the same deterministic engine drives both real-time ticks and offline catch-up calculations
- **Farm zones** — multiple zones with unique loot pools, tick rates, and CP thresholds

## Tech Stack

- [Expo](https://expo.dev) (SDK 54) with [Expo Router](https://expo.github.io/router/) for file-based navigation
- React Native 0.81 / React 19
- TypeScript
- AsyncStorage for persistence

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Yarn](https://yarnpkg.com) (recommended) or npm
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) — install globally if you haven't:

```bash
npm install -g expo-cli
```

- For iOS: Xcode (Mac only)
- For Android: Android Studio with an emulator, or a physical device with the [Expo Go](https://expo.dev/client) app

---

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/JustWint3r/idleFantasyRPG.git
cd idleFantasyRPG
```

2. **Install dependencies**

```bash
yarn install
```

---

### Running the App

**Start the Expo dev server:**

```bash
yarn start
```

Then choose your target:

| Platform | Command | Notes |
|---|---|---|
| Android (emulator/device) | `yarn android` | Requires Android Studio or USB-connected device |
| iOS (simulator) | `yarn ios` | Mac + Xcode required |
| Expo Go (any device) | Scan QR code from `yarn start` | Quickest way to test on a physical device |

---

## Project Structure

```
src/
├── engine/         # Pure game logic (farmEngine.ts) — no React deps
├── types/          # Shared TypeScript types
├── data/           # Loot tables and static game data
├── components/     # Reusable UI components
├── screens/        # Screen-level components
├── hooks/          # Custom React hooks (farm loop, theme, etc.)
└── constants/      # Theme and app-wide constants
app/                # Expo Router file-based routes
```

---

## Running Tests

```bash
yarn test
```

The farm engine (`src/engine/farmEngine.ts`) is fully unit-tested with deterministic inputs.
