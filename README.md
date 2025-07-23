# Virtual Farming System Viewer

An educational, mobile-friendly 3D scene editor and viewer built with **Angular**, **Three.js**, and **WebXR**. It allows for model uploads, panorama viewing, note annotations, lighting customization, and Google Cardboard-style VR support.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Technology Stack](#technology-stack)
* [Features](#features)
* [Updates](#updates-as-of-71725)
* [Expansion Plans](#expansion-for-future-versions)
* [Bug List](#bug-list)
* [Challenges & Notes](#challenges--notes)
* [Deployment Instructions](#deployment-instructions)
* [Start Instructions](#start-instructions)
* [Folder Structure](#folder-structure)
* [Branching Strategy](#branching-strategy)
* [Contact](#contact)

---

## Project Overview

Virtual Farming System Viewer is an educational tool designed to help users upload and visualize 3D models in a virtual environment. The app supports various features such as interactive lighting, note annotations, panoramic scene viewing, and VR integration. It is built with **Angular 17**, **Three.js**, and **WebXR**, ensuring compatibility with mobile and desktop platforms.

---

## Technology Stack

* **Frontend Framework**: [Angular 17+](https://angular.io/)
* **3D Graphics**: [Three.js](https://threejs.org/)
* **Panorama Viewer**: Custom + [Marzipano-like](http://www.marzipano.net/)
* **File Uploads**: Supports `.glb`/`.gltf` file formats via drag-and-drop and uploader UI
* **Offline Storage**: Local scene saving/loading
* **User Interface**: Mobile-first design with responsive support for tablets and desktops
* **VR Mode**: Cardboard-style split screen with `deviceorientation`, fullscreen, and stereo rendering

## Folder Structure

[Read more here](Project_details.md)

#### Helpful tools:

* [JSON Validator](https://codebeautify.org/jsonvalidator)
* [GLTF Validator](https://github.khronos.org/glTF-Validator/)
* [GLB Validator](https://gltf-viewer.donmccurdy.com/)
* [Gyroscope Test](https://www.checkadevice.com/gyroscope_test.html)

---

## Features

* **3D Model Support**: Load `.glb` and `.gltf` files
* **Custom Lighting**: Adjust sunlight and room lighting
* **Interactive Tutorial**: Tour the simulator using Shepherd.js integration
* **Scene Save/Load**: Save 3D scenes as JSON files; preserve lighting, size, and axis positions when re-uploaded
* **Intuitive UI**: User-friendly interface with large buttons and sliders
* **First-Person Navigation**: WASD controls and pointer lock support for immersive movement
* **VR Mode**: Fullscreen stereo rendering with orientation lock on mobile devices
* **Panorama Viewer**: 360° static scene viewer
* **Mobile-Friendly**: Optimized for mobile devices with responsive layout

---

## Updates as of 7/17/25

* Upload GLTF/GLB models
* Capability to use WASD + arrow keys to move around the scene
* Capability to change light color, intensity, and camera height
* Stereoscopic split screen added
* Language selection added
* Docker container added
* User tutorial added
* Error messages to user console to help users with troubleshooting

---

## Expansion for Future Versions

* Allow users to modify the size and height (y-axis) of the model
* Update UI to match National 4-H brand
* Expand language selection
* Add screen reader capability for text
* Connect bug report to database
* Connect contact form to database
* Make a mobile VR viewer for the Panorama screen for mobile and tablet
* Add Pano Notes to the 3D viewer
* Update Pano Notes so users can upload and look at multiple panoramic scenes as users upload images

##### VR Integration

[WebGPU Stereo Display Example](https://threejs.org/examples/#webgpu_display_stereo)

##### AR Integration

[AR.js in future builds, compatibility with older devices](https://ar-js-org.github.io/AR.js-Docs/)

---

## Bug List

* Stereoscope button sometimes sticks; requires multiple presses to activate
* Fullscreen button sometimes sticks; requires multiple presses to activate
* WASD + arrow keys are tied to axis, need to allow user rotation (turning)
* Stereoscopic view: left side appears darker
* Error loading saved JSON scenes
* Pano Notes: When user clicks to generate a note, it resets to the center of the sphere; needs fixing to spawn at the user’s clicked position

---

## Challenges & Notes

* **GLB/GLTF Model Size**: Large models may result in long load times.
* **Physics**: Balancing performance with realistic collisions.
* **Local-only**: No cross-device synchronization (no cloud or backups).
* **Three.js & Angular Integration**: Use `ngAfterViewInit` for initializing Three.js (since the canvas needs to be ready).
* **File Storage**: Models can be stored as binary blobs in IndexedDB or prompt re-upload if data is too large.

---

## Deployment Instructions

### Build the Project for Production

Build the Angular project for production:

```bash
ng build --prod
```

### Serve the Application

You can use any web server to serve the files from the `/dist` directory generated in the previous step. Here's an example using the `http-server` package:

```bash
npx http-server ./dist
```

---

## Start Instructions

### Clone the repository

```bash
git clone https://github.com/AndieAstra/virtual-farming-system-viewer.git
```

### Navigate to the project folder

```bash
cd virtual-farming-system-viewer
```

### Install the necessary dependencies

```bash
npm install
```

### Run the application locally

```bash
ng serve
```

Open your browser and go to [http://localhost:4200/](http://localhost:4200/) to see the app running.

---

## Folder Structure

[For more details](Project_details.md)

```bash
/app
  /components
    /scene-manager             - Manages scene loading and customization
    /viewer                    - Core 3D model viewer component
  /helpers
    /fullscreen.helper.ts      - Fullscreen functionality
    /player-movement.helper.ts - Movement helper for WASD/arrow keys
    /stereoscope.helper.ts     - Helper for stereoscopic view (VR)
    /vr-controller.helper.ts   - VR controller functionality
  /pages
    /bug-report                - Page for users to report bugs
    /contact                   - Contact page
    /panorama-viewer           - Displays 360° panorama view
    /viewer-page               - Page for the main 3D viewer
  /services
    /scene-controls.service.ts - Service to control scene actions
    /storage.service.ts        - Service for managing scene storage

/assets
  /i18n                        - Language JSON files for localization
  /icons                       - Icons used in the app
  /sounds                      - Sound assets used in the app
```

---

## Branching Strategy

We follow a simplified Git branching model:

* `main` - Production-ready stable code
* `develop` - Active development integration branch
* **Feature branches** - Named `feature/<feature-name>`, branched off `develop` for individual features
* **Bugfix branches** - Named `bugfix/<bug-description>`, branched off `develop` or `main` depending on urgency
* **Release branches** - Created from `develop` when preparing for a release, merged into `main` and `develop` after QA

Merge strategy uses Pull Requests with mandatory code review.

---

## Contact

For questions, support, or bug reporting:

* **GitHub Issues**: [https://github.com/AndieAstra/virtual-farming-system-viewer/issues](https://github.com/AndieAstra/virtual-farming-system-viewer/issues)
* **In-App Contact Page**: Available under `/contact` page

---
