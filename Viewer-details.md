Summary
===================
ngOnInit(): Initializes event listeners, movement helpers, VR helper, and renderer.
ngOnDestroy(): Cleans up resources and event listeners when the component is destroyed.
ngOnChanges(): Handles GLB file changes, loading models into the scene, and alerting the user.
ngAfterViewInit(): Sets up the 3D scene, canvas, event listeners, fullscreen behavior, drag-and-drop functionality, and VR setup.
//
private initScene(): This block of code is responsible for initializing the 3D scene and setting up key components to render and interact with the scene using THREE.js.
//
updateModelTransform(): This method updates the transformation (scaling and positioning) of the model that is currently uploaded.
applyModelTransform(): This function is almost identical to updateModelTransform, with the additional functionality of logging the model's position and scale to the console.
clearScene(): This method is responsible for clearing the 3D scene, which includes saving the current state, prompting the user for confirmation, and resetting the component’s state.
//
updateAmbientLight(): This method adjusts the intensity of the ambient light in the 3D scene based on the ambientIntensity property. The ambientLight object is a standard THREE.js light that affects all objects in the scene equally, without a direction or cast shadow.
updateCameraHeight():This method updates the y position of the camera to a new height, defined by this.cameraHeight.
//
loadGLB(file: File): This method is responsible for loading a GLB (GL Transmission Format) model file into the scene. 
loadScene(): This method retrieves a saved scene from localStorage (or any other persistent storage service) and loads the models from that scene data. If no saved scene exists, it initializes a new empty scene.
loadModelsFromScene(sceneData: any): This method takes the sceneData object (which contains the saved models) and loads each model from the data. It parses the Base64-encoded GLB models, applies the appropriate transformations (position, rotation, scale), and adds them to the scene.



// ***********************************************************************************************

ngOnInit()
This method is part of Angular's lifecycle hooks and runs when the component is initialized. It sets up various event listeners and initializations necessary for rendering a 3D scene.

Actions performed here:
Event Listeners:

keydown & keyup: Adds event listeners to handle key presses and releases.

fullscreenchange: Sets up a listener to toggle the "ESC to exit fullscreen" hint when entering/exiting fullscreen mode.

Initialization:

this.canJump = true;: Allows the player character to jump (likely used in a 3D environment).

this.vrHelper.enabled = true;: Enables VR functionality (likely a VR helper to assist with 3D rendering).

this.movementHelper: Initializes a helper object for handling player movement, likely in 3D space (with speed, gravity, jump strength, and camera height parameters).

this.viewerRef: Initializes the WebGL renderer using a reference to the canvas element in the component (viewerCanvasRef.nativeElement).

this.loadScene();: Calls a function to load the scene (likely to load 3D models or environment).

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

ngOnDestroy()
This lifecycle hook runs when the component is destroyed (removed from the DOM). It handles cleanup tasks like removing event listeners and freeing resources used by the component.

Actions performed here:
Event Cleanup:

Removes the keydown, keyup, and resize event listeners.

VR and Animation Cleanup:

Stops the VR helper (this.vrHelper.stop();).

Cancels any ongoing animation frames (cancelAnimationFrame(this.animationId);).

Renderer and Scene Cleanup:

Disposes of the WebGL renderer and scene.

Disposes of any objects (geometries and materials) within the scene to free memory.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

ngOnChanges()
This lifecycle hook runs when one or more input properties of the component change. In this case, it’s specifically monitoring changes to the glbFile input property.

Actions performed here:
GLB File Handling:

If glbFile is updated, it asks the user whether to replace the existing model in the scene (if one exists).

If confirmed, it clears the existing scene and loads the new GLB model.

It logs success or failure of the model loading process.

Alerting User:

If no valid model file is provided or the scene is empty, an alert is shown to the user.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

ngAfterViewInit()
This lifecycle hook runs after Angular initializes the component’s view and child views. It sets up the 3D rendering context and configures additional settings for interactivity.

Actions performed here:
Scene and Animation Initialization:

Initializes the scene and starts animations (this.initScene() and this.animate()).

Canvas and Renderer Setup:

References the canvas where the WebGL content will be rendered (this.containerRef.nativeElement).

Sets styles for the canvas and the container (border styles, positioning, etc.).

Fullscreen and ESC Hint:

Adds a fullscreenchange event listener to toggle the display of an "ESC to exit fullscreen" hint when fullscreen mode is entered or exited.

Creates and appends an escHint DOM element to the container.

Handles visibility of the hint and updates it based on fullscreen state.

Drag-and-Drop Functionality:

Listens for dragover and drop events on the canvas. If a .glb file is dropped, it loads the model into the scene, replacing any existing model if necessary.

Canvas Click Handling:

When the canvas is clicked, it casts a ray from the camera to the clicked position to check for intersections with objects in the scene. If an object is clicked, it logs the object’s name or ID.

Control Locking:

Adds an event listener to lock and unlock the user's controls (likely the pointer lock for first-person navigation) when the canvas is clicked.

Grid Helper:

Adds a grid helper to the scene to visualize the ground/grid and toggles its visibility with a GUI control.

Stereo Effect (VR Mode):

Initializes a StereoEffect for 3D rendering (likely for VR/3D glasses compatibility).

Orientation Change Listener (for Mobile):

Listens for orientation changes to automatically enter or exit VR mode based on whether the device is in landscape or portrait mode.

Popstate Listener:

Handles back/forward navigation in the browser and exits VR mode if active.

Other Key Methods & Variables:
this.gridHelper = new THREE.GridHelper(10, 10);: Creates a grid to visualize the scene’s floor.

this.stereoEffect = new StereoEffect(this.renderer);: Sets up stereoscopic 3D effect for the renderer.

this.canvasRef = new ElementRef(canvas);: Creates a reference to the canvas for Angular’s change detection.

this.scene.add(this.gridHelper);: Adds the grid helper to the scene.

this.escHintSprite: Likely a 3D sprite that shows the "ESC to exit fullscreen" hint in the scene (used for VR).

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

1. Setting up the Scene (this.scene)

Creates a new scene: this.scene is initialized as a new THREE.js Scene. The scene is a container where objects, lights, cameras, and other components are added.

Sets the background color: The scene's background color is set to a very dark gray (#111111), which is close to black.

2. Setting up the Camera (this.camera)

Creates a Perspective Camera: The THREE.PerspectiveCamera is a camera that simulates human-like vision. It takes four parameters:

75: The field of view (FOV), in degrees.

container.clientWidth / container.clientHeight: The aspect ratio (width divided by height).

0.1: The near clipping plane, objects closer than this will not be rendered.

1000: The far clipping plane, objects farther than this will not be rendered.

Positions the camera: The camera is positioned at (0, this.cameraHeight, 10) where this.cameraHeight is likely a configurable height.

Sets the camera's orientation: The camera is looking at the point (0, this.cameraHeight, 0), ensuring it’s facing the center of the scene.

3. Setting up the WebGL Renderer (this.renderer)
Creates the WebGL renderer: this.renderer is initialized as a new THREE.WebGLRenderer.

antialias: false disables anti-aliasing for performance reasons (might be for mobile or lower-end devices).

Sets the renderer size: The renderer’s size is set to the dimensions of the container (the DOM element the WebGL content will be rendered to).

Sets pixel ratio: The pixel ratio is set to the minimum of the device's pixel ratio and 1. This ensures that high-DPI (retina) displays don’t cause excessive rendering overhead.

Disables shadow maps: Shadows are disabled for now, probably to improve performance.

Appends the renderer's DOM element: The renderer’s <canvas> element (this.renderer.domElement) is appended to the container DOM element.

4. Touch and Pointer Events for Canvas

Enables touch interactions: Ensures touch events (like scrolling, pinch zooming) are handled correctly.

Allows pointer events: Ensures that the canvas can respond to pointer events such as clicks or mouse movements.

5. Setting up the Container and ESC Hint

Sets container styles: The container is set to position: 'relative', which is necessary for positioning the child elements (e.g., the ESC hint) correctly.

Creates the ESC hint element: A new div is created that will display a message for the user about exiting fullscreen with the ESC key. Initially, it's hidden with style.display = 'none'.

Appends the ESC hint: The created escHint div is appended to the container element.

6. Adding Lights to the Scene

Ambient light: Adds an ambient light (THREE.AmbientLight), which provides uniform lighting throughout the scene, without any directionality. The color is white (0xffffff) and the intensity is 0.5.

Directional light: Adds a directional light (THREE.DirectionalLight), which simulates sunlight. It's positioned at (5, 10, 7.5) and will cast shadows.

7. Setting up the Controls (PointerLockControls)

Pointer lock controls: PointerLockControls is used to lock the mouse pointer for first-person-like navigation (typically used in 3D games). It takes:

The camera: to control the viewpoint.

The renderer’s DOM element: to track mouse movements.

Adds controls to the scene: this.controls.getObject() returns an object (likely a THREE.Object3D) that represents the player's "view" and is added to the scene.

8. Displaying Instructions for Mouse Lock

Instruction element: Creates an instruction div that informs users to click to start interacting with the 3D scene. It's styled to be centered on the screen with a semi-transparent background.

9. Locking the Pointer on Click

Mouse and touch interactions:

When the user clicks or touches the container, it locks the pointer for first-person navigation (this.controls.lock()).

It removes the instructions from the container after the user clicks or touches.

10. GUI Setup

GUI setup: Initializes a new GUI instance, likely using dat.GUI for controlling various parameters in the 3D scene (e.g., lights, camera settings). Initially, the GUI is hidden (display = 'none').

11. Adding a Floor to the Scene

Creates a floor:

A plane geometry (THREE.PlaneGeometry) of size 200x200 is created for the floor.

A mesh standard material (THREE.MeshStandardMaterial) with a dark gray color is used for the floor.

The floor is rotated so that it's flat on the ground (floor.rotation.x = -Math.PI / 2).

Enables shadows on the floor (floor.receiveShadow = true).

Adds the floor to the scene and stores it in the objects array.

12. Adding Helpers

Grid helper: Adds a grid helper to the scene. This is useful for visualizing the ground or floor in the scene with a grid of 200x200 units.

The grid lines are colored 0xd453ff (purple) and 0x444ddd (blue).

Axes helper: Adds an axes helper to the scene. This shows the X, Y, and Z axes

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

updateModelTransform()

This method updates the transformation (scaling and positioning) of the model that is currently uploaded.

Checks if this.uploadedModel exists: The code ensures that the model is loaded before attempting to transform it.

Scales the model: The scale.setScalar(this.modelScale) method scales the model uniformly in all directions by the value of this.modelScale. If this.modelScale is 2, for example, the model will be scaled to twice its original size.

Adjusts the Y-position: The this.uploadedModel.position.y = this.modelHeight; line sets the y position of the model to this.modelHeight. This will move the model up or down along the Y-axis in the 3D scene, possibly placing it on the ground or in a specified location above/below the ground.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

applyModelTransform()

This function is almost identical to updateModelTransform, with the additional functionality of logging the model's position and scale to the console.

Checks if this.uploadedModel exists: As with updateModelTransform(), this ensures that there's a model to transform.

Scales the model: this.uploadedModel.scale.setScalar(this.modelScale) scales the model uniformly by this.modelScale.

Adjusts the Y-position: The model’s y position is adjusted to this.modelHeight, moving it along the Y-axis.

Logging the position and scale:

console.log('Model position:', this.uploadedModel.position) logs the model’s current position (specifically, its x, y, and z values).

console.log('Model scale:', this.uploadedModel.scale) logs the current scale of the model.

This method provides more debug information and will be helpful for tracking the model’s transformations during development.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

clearScene()

This method is responsible for clearing the 3D scene, which includes saving the current state, prompting the user for confirmation, and resetting the component’s state.

Confirmation dialog:

The user is first asked to confirm if they really want to clear the scene (confirm('Are you sure you want to clear the scene?')).

If the user confirms, the process continues.

Saving the scene:

this.storageService.saveSceneAsJson() is called to save the current scene to some storage before clearing it. This could be a file, local storage, or a database.

A callback function logs the success or failure of the save operation (using msgKey).

Clearing the scene:

The sceneControls.clearScene() method is called to clear the actual scene. This function likely handles removing objects from the scene, resetting lights, and performing other necessary cleanup.

A second confirmation is used here in clearScene (as indicated by the callback function).

Another callback function logs the message after the scene is cleared.

Resetting the component state:

After clearing the scene, the model and objects list are reset.

this.uploadedModel = null: The uploaded model is set to null, indicating that no model is currently loaded.

this.objects = []: The objects array, which stores all objects in the scene, is emptied.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

updateAmbientLight()

 This method adjusts the intensity of the ambient light in the 3D scene based on the ambientIntensity property. The ambientLight object is a standard THREE.js light that affects all objects in the scene equally, without a direction or cast shadow.

this.ambientLight.intensity = this.ambientIntensity: The method sets the intensity of the ambient light to the value of this.ambientIntensity. This is typically a floating-point value where:

0 means no light.

1 is the default intensity.

Values greater than 1 can make the scene brighter.

This method is likely called when the ambientIntensity property is modified, and it instantly updates the scene's lighting based on that change.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

updateCameraHeight()

This method updates the y position of the camera to a new height, defined by this.cameraHeight.

this.camera.position.y = this.cameraHeight: The method sets the y position of the camera. The camera’s position.y controls the vertical location of the camera within the 3D scene. Adjusting this value could be useful to simulate different perspectives or move the camera up/down based on user input, or to set the initial camera height.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

loadGLB(file: File):{}

This method is responsible for loading a GLB (GL Transmission Format) model file into the scene. A GLB file is a binary format for 3D models (commonly used in WebGL, Three.js, and other 3D rendering engines). The loadGLB() method uses the GLTFLoader (a Three.js utility) to load the model, add it to the scene, and manage loading states.

Step-by-Step Breakdown:
this.isLoading = true;:

The method starts by setting the isLoading flag to true, indicating that a model is being loaded. This could be used to show a loading spinner or prevent further actions during loading.

const loader = new GLTFLoader();:

An instance of GLTFLoader is created, which will be used to parse and load the GLB file.

const url = URL.createObjectURL(file);:

The file, which is passed as a parameter, is converted into a URL using URL.createObjectURL(). This creates a temporary URL for the file that can be used in a web context. The file parameter is a File object (most likely from an <input type="file"> or drag-and-drop event).

loader.load(url, (gltf) => {...}, undefined, (error) => {...});:

loader.load() is called to load the GLB file. It accepts the following parameters:

URL of the file: This is the temporary URL created from the file.

Success callback: This function is triggered when the GLB file has been successfully loaded.

Progress callback: Not implemented here, but it could be used to track the loading progress.

Error callback: This function is triggered if there’s an error while loading the file.

In the success callback:

if (!gltf.scene): If the GLB is invalid or doesn't contain a scene, it logs an error and stops the loading process (this.isLoading = false;).

this.clearScene();: Clears the scene before loading a new model.

gltf.scene.position.set(0, 0, 0);: Resets the model's position to (0, 0, 0) so it appears in the center of the scene.

this.scene.add(gltf.scene);: Adds the loaded model to the Three.js scene.

this.uploadedModel = gltf.scene;: Stores the loaded model in the uploadedModel property for later reference.

this.camera.position.set(0, 1.6, 3);: Sets the camera's position so that the model is in view (e.g., the camera is set to a height of 1.6 and is positioned 3 units along the z-axis).

URL.revokeObjectURL(url);: Releases the temporary URL created for the file (this is good practice to avoid memory leaks).

this.isLoading = false;: Marks the loading process as complete.

In the error callback:

If there’s an error loading the file, it logs the error to the console, revokes the object URL, and sets isLoading to false.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

loadScene(): 

This method retrieves a saved scene from localStorage (or any other persistent storage service) and loads the models from that scene data. If no saved scene exists, it initializes a new empty scene.

const savedScene = this.storageService.load();:

This line calls this.storageService.load() to retrieve the saved scene data. The method load() is expected to return a scene's data (like models, positions, rotations, etc.) stored in a persistent location (e.g., localStorage, IndexedDB, or a custom database).

if (savedScene):

Checks if the savedScene object exists. If there is saved data, it proceeds to load the models from that scene.

this.loadModelsFromScene(savedScene);:

If the scene data is valid, this method is called to load the models from the saved scene data.

else { console.log("No saved scene found."); }:

If no saved scene is found, it logs a message saying that no saved scene was found, and the application will likely start with an empty scene.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

loadModelsFromScene(sceneData: any)

This method takes the sceneData object (which contains the saved models) and loads each model from the data. It parses the Base64-encoded GLB models, applies the appropriate transformations (position, rotation, scale), and adds them to the scene.

const models = sceneData.models || [];:

Retrieves the models array from the sceneData object. If no models are found, it defaults to an empty array.

const loader = new GLTFLoader();:

Initializes the GLTFLoader to load each GLB model from the Base64 data.

models.forEach((modelData: any) => { ... });:

Loops over each model in the models array. For each model:

const buffer = new Uint8Array(atob(modelData.glbBase64).split("").map(char => char.charCodeAt(0)));:

Decodes the Base64 string (modelData.glbBase64) into binary data and creates a Uint8Array buffer.

loader.parse(buffer.buffer, '', (gltf: GLTF) => { ... });:

Parses the binary buffer into a GLTF object using the loader.parse() method.

model.position.copy(modelData.position);:

Applies the saved position to the model.

model.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);:

Applies the saved rotation to the model.

model.scale.copy(modelData.scale);:

Applies the saved scale to the model.

this.scene.add(model);:

Adds the model to the Three.js scene.

*   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   *   

