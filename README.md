# Robo Runner

An original 3D endless-runner game for kids aged 10 and up, built for Android and Google Play.

Bolt the robot races down a neon city street, switching lanes, jumping barriers, sliding under bars, running across hover-tram roofs and collecting gears, while a security drone gives chase.

## Controls

| Action | Phone | Keyboard |
| --- | --- | --- |
| Switch lane | Swipe left or right | Left and right arrows, A and D |
| Jump | Swipe up | Up arrow, W, Space |
| Slide | Swipe down | Down arrow, S |
| Pause | Pause button | Esc or P |

## Power-ups

- **Magnet:** pulls nearby gears in for 10 seconds.
- **Rocket boots:** fly above the traffic along a trail of gears for 7 seconds.
- **Shield:** survives one crash.
- **Double gears:** every gear counts twice for 12 seconds.

## Project layout

- `src/main.js`: game loop, player, spawning, collisions, controls, menus.
- `src/models.js`: procedural 3D models (hover-trams, barriers, ramps, gears, drone, city).
- `src/audio.js`: synthesized sound effects.
- `src/assets/robot.glb`: the robot character, "RobotExpressive" by Tomás Laulhé (Quaternius), CC0 1.0, with modifications by Don McCurdy.

Built with [three.js](https://threejs.org), [Vite](https://vite.dev) and [Capacitor](https://capacitorjs.com).

## Running it locally

```sh
npm install
npm run dev        # play in the browser
npm run build      # app bundle for Android, in dist/
npm run build:web  # single-page web preview, in dist-web/
```

## Android builds

Every push to `main` runs the **Build Android app** workflow in GitHub Actions:

1. It builds the game and creates the Android project with Capacitor (target SDK 36).
2. It uploads a **test APK** (`robo-runner-test-apk`) you can install on a phone.
3. If the signing secrets below are set, it also uploads a **signed AAB** (`robo-runner-play-store-aab`) for Google Play.

To download a build, open the repository's **Actions** tab, pick the latest run, and scroll to **Artifacts**.

### Signing secrets for Google Play

Add these under **Settings > Secrets and variables > Actions**:

| Secret | What it is |
| --- | --- |
| `KEYSTORE_BASE64` | Your upload keystore file, base64-encoded |
| `KEYSTORE_PASSWORD` | The keystore password |
| `KEY_ALIAS` | The key alias inside the keystore |
| `KEY_PASSWORD` | The key password |

Keep a safe backup of the keystore and passwords. Google Play needs the same upload key for every update.
