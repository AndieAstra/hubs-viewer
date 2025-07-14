# Virtual Farming System Viewer

An educational, mobile-friendly 3D scene editor and viewer built with **Angular**, **Three.js**, and **WebXR**. It allows for model uploads, panorama viewing, note annotations, lighting customization, and Google Cardboard-style VR support.

---

## Technology Stack

* **Frontend Framework**: [Angular 17+](https://angular.io/)
* **3D Graphics**: [Three.js](https://threejs.org/)
* **Panorama Viewer**: Custom + [Marzipano-like](http://www.marzipano.net/)
* **File Uploads**: Supports `.glb`/`.gltf` file formats via drag-and-drop and uploader UI
* **Offline Storage**: Local scene saving/loading
* **User Interface**: Mobile-first design with responsive support for tablets and desktops
* **VR Mode**: Cardboard-style split screen with `deviceorientation`, fullscreen, and stereo rendering

---

## Features

* **3D Model Support**: Load `.glb` and `.gltf` files
* **Custom Lighting**: Adjust sunlight and room lighting
* **Interactive Tutorial**: Tour the simulator using Shephard.js integration
* **Scene Save/Load**: Save 3D scenes as JSON files; preserve lighting, size, and axis positions when re-uploaded
* **Intuitive UI**: User-friendly interface with large buttons and sliders
* **First-Person Navigation**: WASD controls and pointer lock support for immersive movement
* **VR Mode**: Fullscreen stereo rendering with orientation lock on mobile devices
* **Panorama Viewer**: 360° static scene viewer
* **Mobile-Friendly**: Optimized for mobile devices with responsive layout

---

## Installed Libraries

| Library                                           | Purpose                          | Link                                             |
| ------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| `three`                                           | 3D rendering                     | [Three.js](https://threejs.org/)                 |
| `@angular/core`                                   | Application framework            | [Angular](https://angular.io/)                   |
| `three/examples/jsm/controls/OrbitControls`       | Camera controls                  | Included via Three.js                            |
| `three/examples/jsm/controls/PointerLockControls` | First-person movement            | Included via Three.js                            |
| `@angular/material`                               | UI components (dialogs, snackbars)| [Angular Material](https://material.angular.io/) |
| `uuid`                                            | Generate unique IDs for assets   | [UUID](https://www.npmjs.com/package/uuid)       |

---

## Updates as of 7/7/25:

- Load JSON scenes w/lighting
- Save JSON scenes w/lighting
- Upload GLTF/GLB/JSON models and scenes
- Modals notifications as you change models/scenes
- Modal notification when the model fails to load/scene is empty
- Capability to use WSAD keys to move around the scene
- Capability to change light color, intensity, and camera height
- VR split screen added
- Language selection added
- Docker container added
- User Tutorial added
- Error messages to user console to teach users dev troubleshooting

---

## Expansion for future versions:

- Allow users to modify the size and height (y-axis) of the model
- Update UI to match National 4-H brand
- Fix sunlight slider max and min
- Fix acceleration, min too slow
- Expand language selection
- Add screen reader capability for text
- Remove "auto VR mode" capability in landscape mobile mode
- Fix fullscreen on mobile so "exit VR" button fits to upper corner landscape or portrait
- Connect bug report to database
- Connect contact form to database
- Make a mobile VR viewer for the Panorama screen for mobile and tablet
- Add Pano Notes to the 3D viewer
- Update Pano Notes so users can upload and look at multiple Panoramic scenes as users upload images


##### VR Integration
[WebGPU Stereo Display Example](https://threejs.org/examples/#webgpu_display_stereo)

##### AR Integration
[AR.js in future builds, compatibility with older devices.](https://ar-js-org.github.io/AR.js-Docs/)

---

## Bug List:
- Need to reinstate console log
- Pano Notes: When user clicks to generate a note they keep going back to the center of the sphere. Take a look at the complete script to see why it is not generating a note where the user places it.

---
## Challenges & Notes

* **GLB/GLTF Model Size**: Large models may result in long load times.
* **Physics**: Balancing performance with realistic collisions.
* **Local-only**: No cross-device synchronization (no cloud or backups).
* **Three.js & Angular Integration**: Use `ngAfterViewInit` for initializing Three.js (since the canvas needs to be ready).
* **File Storage**: Models can be stored as binary blobs in IndexedDB or prompt re-upload if data is too large.

---
## Contact
https://github.com/AndieAstra
