# 📦 Virtual Farming System XR Viewer

An educational, mobile-friendly 3D scene editor and viewer built with **Angular**, **Three.js**, and **WebXR**. It supports model uploads, panorama viewers, note annotations, lighting customization, and Google Cardboard-style VR support.

---

## 🧬 Stack

* **Frontend Framework**: [Angular 17+](https://angular.io/)
* **3D Graphics**: [Three.js](https://threejs.org/)
* **Panorama Viewer**: Custom + [Marzipano-like](http://www.marzipano.net/)
* **File Uploads**: Supports `.glb`/`.gltf` via drag-and-drop and uploader UI
* **Offline Storage**: Local scene saving/loading
* **UI**: Mobile-first CSS with responsive support for tablets/desktops
* **VR Mode**: Cardboard-style split screen with `deviceorientation`, fullscreen, and stereo rendering

---

## 📂 Project Structure

```
src/
 ├── app/
 │    ├── components/
 │    │     ├── uploader/           # Upload .glb/.gltf files
 │    │     ├── viewer/             # Main Three.js scene viewer & controls
 │    │     ├── lighting/           # Scene lighting settings
 │    │     ├── notes/              # 3D in-scene notes ("pano notes")
 │    │     ├── project-manager/    # Save/load project, timers
 │    │     └── panorama-viewer/    # 360° image viewer (panoramas)
 │    ├── pages/
 │    │     ├── bug-report/         # UI for bug submission
 │    │     ├── contact/            # Contact form
 │    │     ├── viewer-page/        # Main experience entry point
 │    ├── models/
 │    │     └── project-data.model.ts # Defines scene data structure
 │    ├── services/
 │    │     └── controls.service.ts # Shared logic for keyboard & device control
 │    ├── app.component.ts
 ├── assets/                        # Icons, models, textures
 ├── styles.scss                   # Global styles
 ├── index.html
 └── main.ts
```

---

## 🚀 Features

* 🧱 **3D Model Support**: Load `.glb` and `.gltf` files
* 🔆 **Custom Lighting**: Adjust sunlight and room light
* 📝 **Pano Notes**: Drop interactive info notes in 3D space
* 📀 **Project Save/Load**: Serialize and reload scene data
* 🎓 **Kid-Friendly UI**: Large, colorful buttons and sliders
* 🎮 **WASD + Pointer Lock**: First-person navigation support
* 🕶 **VR Support**: Mobile fullscreen stereo rendering with orientation lock
* 🌄 **Panorama Viewer**: For viewing 360° static scenes
* 📱 **Mobile-First**: Fully responsive layout with mobile-focused UX

---

## 🛠️ Installed Libraries

| Library                                           | Purpose                          | Link                                             |
| ------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| `three`                                           | 3D rendering                     | [Three.js](https://threejs.org/)                 |
| `@angular/core`                                   | Application framework            | [Angular](https://angular.io/)                   |
| `three/examples/jsm/controls/OrbitControls`       | Camera movement                  | Included via Three.js                            |
| `three/examples/jsm/controls/PointerLockControls` | FPS movement                     | Included via Three.js                            |
| `@angular/material`                               | UI feedback (snackbars, dialogs) | [Angular Material](https://material.angular.io/) |
| `uuid`                                            | Unique IDs for notes/assets      | [uuid](https://www.npmjs.com/package/uuid)       |

---

## 📦 Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run the Dev Server**

   ```bash
   ng serve
   ```

   Open your browser at `http://localhost:4200`.

---

## 📄 Deployment

To build the project for production:

```bash
ng build --configuration=production
```

The output will be in `dist/`.

---

## ✅ Offboarding Notes

* Mobile VR is handled through screen orientation and fullscreen API—test thoroughly on physical devices.
* Custom 3D notes are saved as JSON with scene data—extend `project-data.model.ts` for new types.
* Use `@HostListener` in viewer component for orientation change or resize events.
* For any panorama changes, check `panorama-viewer` and ensure `transform` is tied to spherical camera logic.

---
