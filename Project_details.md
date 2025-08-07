## Folder Structure

The folder structure of the app is organized as follows:
/app
  /components
    /scene-manager       - Manages scene loading and customization
    /viewer              - Core 3D model viewer component
  /helpers
    /fullscreen.helper.ts - Fullscreen functionality
    /player-movement.helper.ts - Movement helper for WASD/arrow keys
    /stereoscope.helper.ts - Helper for stereoscopic view (VR)
    /vr-controller.helper.ts - VR controller functionality
  /pages
    /bug-report          - Page for users to report bugs
    /contact             - Contact page
    /panorama-viewer     - Displays 360° panorama view
    /viewer-page         - Page for the main 3D viewer
  /services
    /scene-controls.service.ts - Service to control scene actions
    /storage.service.ts - Service for managing scene storage

/assets
  /i18n                - Language JSON files for localization
  /icons               - Icons used in the app
  /sounds              - Sound assets used in the app

--------------------------------------------------------------------------------------
  /components
Scene Manager
===================
This SceneManagerComponent is an Angular standalone component that sets up and manages a Three.js 3D scene with first‑person controls and optional VR/stereoscopic rendering. On initialization, it creates a full‑screen <div> container, a PerspectiveCamera at a configurable height, a WebGLRenderer, ambient and directional lights, and a floor grid for spatial context. It installs PointerLockControls for keyboard/mouse navigation via a PlayerMovementHelper, displays an “ESC to exit fullscreen” hint sprite, and provides on‑screen buttons to toggle a stereoscope mode (via StereoscopeHelper) when entering fullscreen (managed by FullscreenHelper). It listens for click/touch to lock pointer controls, updates movement or VR controller input each frame in its animate loop, and renders either stereo or mono views. The component also supports loading GLTF/JSON models through GLTFLoader, adding them dynamically into the scene, and cleans up event listeners on destroy.

--------------------------------------------------------------------------------------
  /components
Viewer Component
===================
This ViewerComponent is an Angular standalone component that embeds a Three.js–based 3D scene manager to load, display, and interact with glTF models in both desktop and mobile VR contexts. It listens for model‐file inputs (GLB/GLTF or JSON), loads or replaces models via the GLTFLoader, and applies user‐controlled transforms (scale, position, height) and lighting adjustments. It hooks into keyboard and touch/mouse events (including fullscreen toggling and orientation locking) to enable first‐person movement via a PlayerMovementHelper, supports stereo rendering for VR devices through StereoEffect, and delegates core rendering, camera setup, and scene management to an injected SceneManagerComponent. The component also persists scene data, registers with a storage service for console logging and change detection, and gracefully cleans up event listeners, animation frames, and WebGL resources on destruction.

--------------------------------------------------------------------------------------
  /helpers
Fullscreen helper
===================
The FullscreenHelper class provides a convenient way to manage fullscreen mode on a given HTML element, including fallback behavior when native fullscreen APIs are unavailable. It listens for native fullscreen changes and keeps track of listeners to notify about fullscreen state changes. The class supports entering and exiting fullscreen, optionally locking screen orientation to landscape, and toggling fullscreen mode. When native fullscreen is not supported or fails, it applies a CSS class as a pseudo-fullscreen fallback. Additionally, a standalone toggleFullscreen function offers a simple way to toggle fullscreen on any element, handling browser-specific fullscreen methods and orientation locking, and dispatching a resize event afterward to update UI layouts accordingly.

--------------------------------------------------------------------------------------
  /helpers
Player Movement helper
===================
This PlayerMovementHelper class manages player movement in a 3D environment using Three.js. It handles keyboard input and optional VR joystick input to calculate velocity and direction, applying gravity, friction, and jump mechanics. The class detects if the player is grounded using raycasting and enforces collision constraints during movement to prevent walking through objects. Movement updates take into account the player’s orientation via camera rotation and combine inputs for smooth control. It also provides methods to track key presses for movement and jumping, updates the player’s position accordingly, and ensures the player stays above the ground level. Overall, it offers a comprehensive system for first-person style navigation with collision and physics considerations.

--------------------------------------------------------------------------------------
  /helpers
Stereoscope helper
===================
The StereoscopeHelper class provides an easy way to toggle and manage stereoscopic (3D) rendering using Three.js’s StereoEffect. It wraps a WebGL renderer, scene, and camera to switch between normal and stereo rendering modes. The class tracks whether stereoscopic mode is active, handles window resize events to adjust the stereo effect, and offers methods to enable, disable, or toggle stereo rendering. It also allows external code to subscribe to changes in stereo mode through callbacks. When active, it renders the scene with the stereo effect; otherwise, it uses the standard renderer. The class includes cleanup functionality to clear listeners and disable stereo mode when disposed. Overall, it simplifies integrating and controlling stereoscopic rendering in a Three.js application.

--------------------------------------------------------------------------------------
  /helpers
VR Controller helper
===================
The VrControllerHelper class manages VR device orientation and gamepad input to control movement and rotation in a Three.js scene. It listens for device orientation events (requesting permission if needed) to track the device’s alpha, beta, and gamma angles, converting them into a quaternion representing the device’s rotation. The class also polls the first connected gamepad’s joystick axes to derive a movement vector, applying a deadzone filter to avoid drift. Its update method refreshes these inputs, while applyRotation smoothly applies the device’s orientation to a camera using spherical linear interpolation. The helper can start and stop event listeners and provides a simple API to enable VR interactions by combining sensor and gamepad inputs for immersive navigation.

--------------------------------------------------------------------------------------
  /pages
Bug Report page
===================
Page for users to report bugs

--------------------------------------------------------------------------------------
  /pages
Contact page
===================
Page for users to contact the web admin

--------------------------------------------------------------------------------------
  /pages
Panorama Viewer page
===================
This Angular component implements a 3D panoramic viewer using Three.js, allowing users to explore a spherical environment by clicking and dragging or using keyboard arrows to look around. It initializes a large inverted sphere as the panorama surface, renders it with WebGL, and manages camera rotation based on user input (mouse, touch, keyboard). The component supports interactive "notes" placed inside the panorama at specific 3D points, which users can create by double-clicking or other gestures; these notes are displayed as HTML elements projected into 2D screen space and are editable and removable. Notes persist by saving to and loading from local storage. The component also handles file input to load new panorama textures dynamically. Overall, it combines 3D rendering with interactive annotations for an immersive panoramic experience.

--------------------------------------------------------------------------------------
  /pages
Viewer Page
===================
This ViewerPageComponent is an Angular standalone page that wraps and orchestrates the ViewerComponent—a Three.js‑powered 3D model viewer—alongside UI controls, file inputs, and a guided tutorial. It captures references to the viewer’s canvas and component, wires up fullscreen handling via a FullscreenHelper, and resizes the scene on window or fullscreen changes. It provides sidebar and console toggles, language switching (English/Spanish) backed by ngx-translate, and file‐upload handlers for both GLTF/GLB and JSON scene formats, forwarding those files to the ViewerComponent for loading. The component also exposes model controls—size, height, movement speed, eye level, lighting intensity/color, wireframe toggle, and camera reset—delegating actual transformations to a shared SceneControlsService and persisting logs through a StorageService. Finally, it integrates a multi‐step, localized Shepherd.js tutorial overlay that highlights UI elements and marks onboarding completion in local storage.

--------------------------------------------------------------------------------------
  /services
Scene Controls service
===================
This Angular service provides various controls and utilities to manage a 3D scene rendered with Three.js, primarily designed to interact with a viewer component. It offers functions to toggle wireframe mode on 3D models, switch light visibility, and adjust properties of ambient and directional lights such as color and intensity. The service includes methods to reset the camera's position and rotation to defaults, and update model size, height, and camera movement speed based on slider inputs or user interaction. It maintains references to key scene elements like lights and the viewer component to apply these changes and logs relevant updates for debugging or user feedback. Overall, this service centralizes scene control logic, making it easier to modify and animate visual and camera properties in a Three.js-powered application.

--------------------------------------------------------------------------------------
  /services
Storage service
===================
This Angular service manages the loading, saving, and storage of 3D scene data for a Three.js viewer application. It supports loading 3D models and entire scenes from GLTF/GLB files or JSON scene files, parsing and reconstructing cameras, lights, and models into the Three.js scene. The service handles storing project data in local storage with expiration and clearing old data. It provides methods to clear the current scene safely, load new models, and export the current scene (including models encoded as Base64 GLB data) into JSON files for download. It also integrates with Angular's change detection and translation services to log user-friendly console messages. Overall, it encapsulates file handling, scene serialization, and persistence, facilitating import/export workflows and scene management within the viewer component.

--------------------------------------------------------------------------------------
