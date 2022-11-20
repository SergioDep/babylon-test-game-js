import React from 'react'
import SceneComponent from './SceneComponent'
// import * as PIXI from 'pixi.js'
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders'

// Customizing Camera Inputs: https://doc.babylonjs.com/divingDeeper/cameras/customizingCameraInputs
// Create a Tiled Plane: https://doc.babylonjs.com/divingDeeper/mesh/creation/set/tiled_plane
// Creating Chess Top-Down game: https://babylonjs.medium.com/looking-at-custom-camera-inputs-becb492f09fc
// Demo: https://playground.babylonjs.com/#AH85PF#53
// Creating a procedural hex grid: https://github.com/HextoryWorld/ProceduralHexTerrainGenerator

// These are the vectors for the camera's position and target
var nextCameraPos;
var nextCameraTarget;

// Bools to keep track of states
var enableAnim = false;
var zoomEnabled = false;
// var boardMove = false;
var buttonDown = false;

// Keep track of previous locations for movement
var previousX = 0;
var previousY = 0;

// Camera Rotation Offset
var camAngleOffsetZ = Math.PI / 4; // Default: Math.PI / 4

var camKeyboardSpeed = 10; // Default: 10
var camHeight = 50; // Default: 50
var camMaxHeight = 200; // Default: 200

// When we select a mesh, keep track of it here
var selectedMesh = null;

let configureCameraControls = function (camera, canvas) {
  // Attach controls
  camera.attachControl(canvas, true);
  // Remove original keyboard controls
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
  camera.inputs.removeByType("ArcRotateCameraPointersInput");
  // camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
  
  // We need an input object to attach to the camera and some arrays to store what keycodes we care about
  let ArcRotateCameraKeyboardPanInput = function () {
    // Array with pressed keys
    this._keys = [];
    // Arrays with keycodes we care about and what input they should be considered for
    this.keysLeft = [37, 65];
    this.keysRight = [39, 68];
    this.keysUp = [38, 87];
    this.keysDown = [40, 83];
  };
  
  // We're adding additional booleans to track conditional behavior that the standard ArcRotateCamera can't usually do
  ArcRotateCameraKeyboardPanInput.prototype.activeMove = true;
  ArcRotateCameraKeyboardPanInput.prototype.activeRotate = false;
  
  // attachControl: Our first required function
  ArcRotateCameraKeyboardPanInput.prototype.attachControl = function (noPreventDefault) {
    // For the JS code, we NEED the element to configure what HTMLElement should be listening for our input
    // We want the canvas, in this case
    let _this = this;
    let engine = this.camera.getEngine();
    let element = engine.getInputElement();
    
    // Some of this code leverages existing variables from other related classes to the ArcRotateCamera
    // Because of the traits shared amongst the cameras, we can reuse code from other camera without reinventing
    // too much of the wheel.  Because we want to pan with the keyboard, the FreeCamera was gracious enough to 
    // volunteer some of its code for this.
    if (!this._onKeyDown) {
      element.tabIndex = 1;
      this._onKeyDown = function (evt) {
        if (_this.keysLeft.indexOf(evt.keyCode) !== -1 ||
        _this.keysRight.indexOf(evt.keyCode) !== -1 ||
        _this.keysUp.indexOf(evt.keyCode) !== -1 ||
        _this.keysDown.indexOf(evt.keyCode) !== -1) {
          let index = _this._keys.indexOf(evt.keyCode);
          if (index === -1) {
            _this._keys.push(evt.keyCode);
          }
          if (!noPreventDefault) {
            evt.preventDefault();
          }
        }
      };
      this._onKeyUp = function (evt) {
        if (_this.keysLeft.indexOf(evt.keyCode) !== -1 ||
        _this.keysRight.indexOf(evt.keyCode) !== -1 ||
        _this.keysUp.indexOf(evt.keyCode) !== -1 ||
        _this.keysDown.indexOf(evt.keyCode) !== -1) {
          let index = _this._keys.indexOf(evt.keyCode);
          if (index >= 0) {
            _this._keys.splice(index, 1);
          }
          if (!noPreventDefault) {
            evt.preventDefault();
          }
        }
      };
      
      element.addEventListener("keydown", this._onKeyDown, false);
      element.addEventListener("keyup", this._onKeyUp, false);
      BABYLON.Tools.RegisterTopRootEvents(canvas, [
        { name: "blur", handler: this._onLostFocus }
      ]);
    }
  };
  
  // checkInputs: This isn't required to create for custom inputs but it really depends on how you write your input object.
  // This function will run with each frame
  // I wrote it to handle whatever buttons are pressed and update the camera position just a bit with each tick
  ArcRotateCameraKeyboardPanInput.prototype.checkInputs = function () {
    if (this._onKeyDown) {
      // This boolean should be true for the overhead view and will pan
      if (this.activeMove) {
        if (this._keys.length === 0) return;
        let speed = camKeyboardSpeed * camera._computeLocalCameraSpeed();
        // let transformMatrix = BABYLON.Matrix.Zero();
        // let localDirection = BABYLON.Vector3.Zero();
        let transformedDirection = BABYLON.Vector3.Zero();
        // Keyboard
        for (let index = 0; index < this._keys.length; index++) {
          let keyCode = this._keys[index];
          if (this.keysLeft.indexOf(keyCode) !== -1) {
            transformedDirection.copyFromFloats(speed, 0, 0);
          }
          else if (this.keysRight.indexOf(keyCode) !== -1) {
            transformedDirection.copyFromFloats(-speed, 0, 0);
          }
          else if (this.keysUp.indexOf(keyCode) !== -1) {
            transformedDirection.copyFromFloats(0, 0, -speed);
          }
          else if (this.keysDown.indexOf(keyCode) !== -1) {
            transformedDirection.copyFromFloats(0, 0, speed);
          }
          
          // While we don't need this complex of a solution to pan on the X and Z axis, this is a good
          // way to handle movement when the camera angle isn't fixed like ours is.
          // camera.getViewMatrix().invertToRef(transformMatrix);
          // BABYLON.Vector3.TransformNormalToRef(localDirection, transformMatrix, transformedDirection);
          camera.position.addInPlace(transformedDirection);
          camera.target.addInPlace(transformedDirection);
        }
      }
      // This should only be active when zoomed in, it uses the existing camera rotation code to rotate with keyboard input
      else if (this.activeRotate) {
        for (let index = 0; index < this._keys.length; index++) {
          let keyCode = this._keys[index];
          if (this.keysLeft.indexOf(keyCode) !== -1) {
            camera.inertialAlphaOffset -= 3 / 1000;
          }
          else if (this.keysRight.indexOf(keyCode) !== -1) {
            camera.inertialAlphaOffset -= -3 / 1000;
          }
          else if (this.keysUp.indexOf(keyCode) !== -1) {
            camera.inertialBetaOffset -= 3 / 1000;
          }
          else if (this.keysDown.indexOf(keyCode) !== -1) {
            camera.inertialBetaOffset -= -3 / 1000;
          }
        }
      }
    }
  };
  
  // getClassName - String used as a reference name for your input object
  ArcRotateCameraKeyboardPanInput.prototype.getClassName = function () {
    return "ArcRotateCameraKeyboardPanInput";
  };
  
  // getClassName - String used as a reference name for your input object, simpler version
  ArcRotateCameraKeyboardPanInput.prototype.getSimpleName = function () {
    return "KeyboardPan";
  };
  
  // detachControl - The last required function.  We need this to undo our listeners if this input object is removed
  // or if the camera is disposed of.
  ArcRotateCameraKeyboardPanInput.prototype.detachControl = function () {
    if (this._onKeyDown) {
      var engine = this.camera.getEngine();
      var element = engine.getInputElement();
      element.removeEventListener("keydown", this._onKeyDown);
      element.removeEventListener("keyup", this._onKeyUp);
      BABYLON.Tools.UnregisterTopRootEvents(canvas, [
        { name: "blur", handler: this._onLostFocus }
      ]);
      this._keys = [];
      this._onKeyDown = null;
      this._onKeyUp = null;
    }
  };
  
  // Add completed keyboard input
  camera.inputs.add(new ArcRotateCameraKeyboardPanInput());
};

var createCheckerboard = function (scene, size, length) {
  // Create the board material
  const mat = new BABYLON.StandardMaterial("");
  mat.diffuseTexture = new BABYLON.Texture("https://d2gg9evh47fn9z.cloudfront.net/800px_COLOURBOX15889333.jpg");
  // mat.diffuseTexture = new BABYLON.Texture("https://assets.babylonjs.com/materials/checkerboard/checkerboard_basecolor.png");
  // mat.bumpTexture = new BABYLON.Texture("https://assets.babylonjs.com/materials/checkerboard/checkerboard_normal.png");
  
  const pat = BABYLON.Mesh.NO_FLIP;
  const av = BABYLON.Mesh.TOP;
  const ah =BABYLON.Mesh.LEFT;
  
  const f = new BABYLON.Vector4(0,0, 1, 1);
  
  const options = {
    sideOrientation: BABYLON.Mesh.FRONTSIDE,
    frontUVs: f,
    pattern: pat,
    alignVertical: av,
    alignHorizontal: ah,
    width: size * length,
    height: size * length,
    tileSize: size * 2,
    tileWidth: size * 2
  }
  
  // Create Tiled Plane and apply our provided tile settings
  let board = BABYLON.MeshBuilder.CreateTiledPlane("square", options);
  board.material = mat;
  board.position.x += length * 2 + 1.5;
  board.position.z += length * 2 + 1.5;
  board.rotation = new BABYLON.Vector3(Math.PI/2, 0, 0);
  
  // Create the materials for our meshes and put them on the board at random
  // Make sure that black meshes are on white squares and vise versa
  let blackSquare = true;
  let blackMat = new BABYLON.StandardMaterial("black", scene);
  let whiteMat = new BABYLON.StandardMaterial("white", scene);
  blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  whiteMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  
  for (let i = 0; i < length * length; i++) {
    let x = Math.floor(i / length);
    let z = Math.floor(i % length);
    
    if (z === 0 && length % 2 === 0) {
      blackSquare = !blackSquare;
    }
    
    if (Math.random() > 0.8) {
      let piece = (Math.random() > 0.5) ? BABYLON.MeshBuilder.CreateBox("box", {size: 3}, scene) : BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 3, segments: 32}, scene);
      piece.position = new BABYLON.Vector3(x * size, 1.5, z * size);
      piece.material = (blackSquare ? blackMat : whiteMat);
      if (z === 0) {
        let redMat = new BABYLON.StandardMaterial("red", scene);
        redMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        piece.material = redMat;
      }
      piece.outlineWidth = 0.04;
    }
    
    blackSquare = !blackSquare;
  }
  
  return board;
};

var GameAssets = {};

var loadMissileAssets = async function () {
  GameAssets = GameAssets || {};
  GameAssets.Missile = GameAssets.Missile || {};
  var spellL = await BABYLON.SceneLoader.LoadAssetContainerAsync("https://models.babylonjs.com/TrailMeshSpell/spellDisk.glb");
  GameAssets.Missile.spellL = spellL;
  
  var spellR = await BABYLON.SceneLoader.LoadAssetContainerAsync("https://models.babylonjs.com/TrailMeshSpell/spellDisk.glb");
  GameAssets.Missile.spellR = spellR;
  
  GameAssets.Missile.spellR.meshes[0].scaling.z = 1;
  spellL.animationGroups[0].speedRatio = 1
  spellR.animationGroups[0].speedRatio = -1
  
  // var orbR = await BABYLON.SceneLoader.LoadAssetContainerAsync("https://models.babylonjs.com/TrailMeshSpell/pinkEnergyBall.glb");
  // var orbG = await BABYLON.SceneLoader.LoadAssetContainerAsync("https://models.babylonjs.com/TrailMeshSpell/greenEnergyBall.glb");
  // var orbY = await BABYLON.SceneLoader.LoadAssetContainerAsync("https://models.babylonjs.com/TrailMeshSpell/yellowEnergyBall.glb");
  // const assetArrayBuffer = await BABYLON.Tools.LoadFileAsync("models/rocket_ship.glb", true);
  // const assetBlob = new Blob([assetArrayBuffer]);
  // const assetUrl = URL.createObjectURL(assetBlob);
  // const missile = await BABYLON.SceneLoader.LoadAssetContainerAsync(assetUrl, undefined, undefined, undefined, ".glb");
  const missile = await BABYLON.SceneLoader.LoadAssetContainerAsync("https://models.babylonjs.com/TrailMeshSpell/yellowEnergyBall.glb");
  
  GameAssets.Missile.missile = missile;
  
  GameAssets.Missile = {
    animationGroupL: spellL.animationGroups[0],
    animationGroupR: spellR.animationGroups[0],
    spellL: spellL.meshes[0],
    spellR: spellR.meshes[0],
    missiles: [missile.meshes[0]]
  };
  GameAssets.Missile.spellL.scaling.scaleInPlace(0);
  GameAssets.Missile.spellR.scaling.scaleInPlace(0);
};

var spawnMissile = (scene, attacker, victim) => {
  const startpos = attacker.position.clone();
  const endpos = victim.position.clone();
  // I don't know why I'm cloning everything, but it works
  let assets = {
    animationGroupL: GameAssets.Missile.animationGroupL,
    animationGroupR: GameAssets.Missile.animationGroupR,
    spellL: GameAssets.Missile.spellL,
    spellR: GameAssets.Missile.spellR,
    missiles: GameAssets.Missile.missiles.map(m => m.clone()),
    lights: []
  };
  
  // Setup Missiles Animation
  const distance = BABYLON.Vector3.Distance(startpos, endpos);
  // should depend on distance
  const missileSpeed = Math.max(0.15, distance/200) * 10;
  const missileTopHeight = 20;
  const missileFPS = 24;
  const anim = new BABYLON.Animation("anim", "position", missileFPS, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  const animation_steps = missileFPS;
  let keys = [];
  for (let i = 0; i < animation_steps; i++) {
    let t = i / (animation_steps - 1);
    let pos = BABYLON.Vector3.Lerp(startpos, endpos, t);
    pos.y += missileTopHeight * Math.sin(Math.PI * t);
    keys.push({
      frame: missileFPS * t,
      value: pos
    });
  }
  anim.setKeys(keys);
  
  // Perform the animation
  assets.missiles = assets.missiles.map((o, i) => {
    // Create lights
    let color;
    switch(i) {
      case 1:
      color = new BABYLON.Color3(0, 1, 0);
      break;
      case 2:
      color = new BABYLON.Color3(1, 1, 0);
      break;
      default:
      color = new BABYLON.Color3(1, 0, 0);
    }
    // TODO: fix errors when lights are removed
    // let pointLight = new BABYLON.PointLight("light1", startpos, scene);
    // pointLight.intensity = 0.3;
    // assets.lights.push(pointLight);
    // assets.lights[i].diffuse = color.scale(0.5);
    // assets.lights[i].specular = color.scale(0.5);
    
    let missile = BABYLON.MeshBuilder.CreateSphere("s", {segments: 16, diameter: 0.7}, scene);
    missile.isVisible = false;
    missile.position = startpos;
    o.setParent(missile);
    o.position = new BABYLON.Vector3(0, 0, 0);
    missile.scaling.scaleInPlace(2);
    o.scaling.scaleInPlace(0.03);
    o.rotation.set(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI)
    o.scaling.z *= Math.random() > 0.5 ? -1 : 1;
    scene.addMesh(o, true);
    
    // Add trail to missiles
    let trail = new BABYLON.TrailMesh('missile trail', missile, scene, 0.2, 30, true);
    let sourceMat = new BABYLON.StandardMaterial('sourceMat', scene);
    sourceMat.emissiveColor =
    sourceMat.diffuseColor = color;
    sourceMat.specularColor = new BABYLON.Color3(0, 0, 0);
    trail.material = sourceMat;
    
    // Lanuch the missile
    missile.animations.push(anim);
    scene.beginAnimation(missile, 0, missileFPS, false, missileSpeed, () => {
      // dispose everything
      missile.dispose();
      assets.missiles.forEach(m => m.dispose());
      // assets.lights.forEach(l => {
      //   scene.removeLight(l); // this one works
      //   // l.dispose(); // this one causes blinking
      // });
      assets.animationGroupL.dispose();
      assets.animationGroupR.dispose();
      assets.spellL.dispose();
      assets.spellR.dispose();
      trail.dispose();
      
      createNuke(scene, victim.position, {speed: 0.5, radius: 10, strength: 1000}, () => {
        victim.dispose();
      });
    });
    
    return missile
  });
};

// custom particle emitter
var HemisphericDirectedParticleEmitter = (function() {
  function HemisphericDirectedParticleEmitter(radius, height, direction1, direction2) {
    if (radius === void 0) { radius = 1; };
    if (height === void 0) { height = 1; };
    if (direction1 === void 0) { direction1 = new BABYLON.Vector3(0, 0, 0); };
    if (direction2 === void 0) { direction2 = new BABYLON.Vector3(0, 1, 0); };
    this.radius = radius;
    this.height = height;
    this.direction1 = direction1;
    this.direction2 = direction2;
  }

  HemisphericDirectedParticleEmitter.prototype.startPositionFunction = function(worldMatrix, positionToUpdate, particle, isLocal) {
    const randRadius = this.radius - BABYLON.Scalar.RandomRange(0, this.radius * this.height);
    const v = BABYLON.Scalar.RandomRange(0, 1.0);
    const phi = BABYLON.Scalar.RandomRange(0, 2 * Math.PI);
    const theta = Math.acos(2 * v - 1);
    const randX = randRadius * Math.cos(phi) * Math.sin(theta);
    const randY = randRadius * Math.cos(theta);
    const randZ = randRadius * Math.sin(phi) * Math.sin(theta);
    
    if (isLocal) {
      positionToUpdate.copyFromFloats(randX, Math.abs(randY), randZ);
      return;
    }
    
    BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(randX, Math.abs(randY), Math.abs(randZ), worldMatrix, positionToUpdate);
  };

  HemisphericDirectedParticleEmitter.prototype.startDirectionFunction = function(worldMatrix, directionToUpdate) {
    const randX = BABYLON.Scalar.RandomRange(this.direction1.x, this.direction2.x);
    const randY = BABYLON.Scalar.RandomRange(this.direction1.y, this.direction2.y);
    const randZ = BABYLON.Scalar.RandomRange(this.direction1.z, this.direction2.z);

    // 
    // BABYLON.Vector3.TransformNormalFromFloatsToRef(randX, randY, randZ, worldMatrix, directionToUpdate);
  };
  return HemisphericDirectedParticleEmitter;
}());

const createNuke = (scene, position, options = {speed: 1.0, radius: 5, strength: 100}, callback = undefined) => {
  // flame particle
  // let particle_flame = new BABYLON.ParticleSystem("fireball", 1000, scene);
  // particle_flame.emitter = position.clone();
  // particle_flame.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/particles/textures/explosion/Smoke_SpriteSheet_8x8.png", scene);
  // particle_flame.isAnimationSheetEnabled = true;
  // particle_flame.spriteCellLoop = true;
  // particle_flame.spriteCellWidth = 128;
  // particle_flame.spriteCellHeight = 128;
  // particle_flame.spriteRandomStartCell = true;
  // particle_flame.endSpriteCellID = 63;
  // particle_flame.particleEmitterType = new HemisphericDirectedParticleEmitter(0.2, 1, new BABYLON.Vector3(0, 5, 0));
  // particle_flame.color1 = new BABYLON.Color4(1, 0.5, 0.5, 1);
  // particle_flame.color2 = new BABYLON.Color4(1, 0.5, 0.5, 1);
  // particle_flame.colorDead = new BABYLON.Color4(0, 0, 0, 0);
  // particle_flame.addColorRemapGradient(0, 0, 0.8);
  // particle_flame.addColorRemapGradient(0.2, 0.1, 0.8);
  // particle_flame.addColorRemapGradient(0.3, 0.2, 0.85);
  // particle_flame.addColorRemapGradient(0.35, 0.4, 0.85);
  // particle_flame.addColorRemapGradient(0.4, 0.5, 0.9);
  // particle_flame.addColorRemapGradient(0.5, 0.95, 1);
  // particle_flame.addColorRemapGradient(1, 0.95, 1);
  // particle_flame.useRampGradients = true;
  // particle_flame.addRampGradient(0, new BABYLON.Color3(1, 1, 1));
  // particle_flame.addRampGradient(0.09, new BABYLON.Color3(0.8196078431372549, 0.8, 0.058823529411764705));
  // particle_flame.addRampGradient(0.18, new BABYLON.Color3(0.8666666666666667, 0.47058823529411764, 0.054901960784313725));
  // particle_flame.addRampGradient(0.28, new BABYLON.Color3(0.7843137254901961, 0.16862745098039217, 0.07058823529411765));
  // particle_flame.addRampGradient(0.47, new BABYLON.Color3(0.45098039215686275, 0.08627450980392157, 0.058823529411764705));
  // particle_flame.addRampGradient(0.88, new BABYLON.Color3(0.054901960784313725, 0.054901960784313725, 0.054901960784313725));
  // particle_flame.addRampGradient(1, new BABYLON.Color3(0.054901960784313725, 0.054901960784313725, 0.054901960784313725));
  // // particle_flame.direction1 = new BABYLON.Vector3(0, 1, 0);
  // particle_flame.emitRate = 500;
  // particle_flame.blendMode = 4;
  // particle_flame.minEmitPower = 0.1;
  // particle_flame.maxEmitPower = 0.1;
  // particle_flame.minLifeTime = 180;
  // particle_flame.maxLifeTime = 240;
  // particle_flame.maxScaleX = 1;
  // particle_flame.maxScaleY = 1;
  // particle_flame.minAngularSpeed = 0;
  // particle_flame.maxAngularSpeed = 0;
  // particle_flame.maxInitialRotation = 0;
  // particle_flame.minInitialRotation = 0;
  // particle_flame.minSize = 2;
  // particle_flame.maxSize = 6;
  // particle_flame.preWarmCycles = 0;
  // particle_flame.preWarmStepOffset = 1;
  // particle_flame.preventAutoStart = true;
  // particle_flame.updateSpeed = 0.1;
  
  // particle_flame.beginAnimationFrom = 0;
  // particle_flame.beginAnimationLoop = false;
  // particle_flame.beginAnimationOnStart = true;
  // particle_flame.beginAnimationTo = 1;
  // particle_flame.start();
  
  // return;/*
  
  // flame particle
  let particle_flame = new BABYLON.ParticleSystem("fireball", 1000, scene);
  particle_flame.emitter = position.clone();
  particle_flame.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/particles/textures/explosion/Smoke_SpriteSheet_8x8.png", scene);
  particle_flame.isAnimationSheetEnabled = true;
  particle_flame.spriteCellLoop = true;
  particle_flame.colorDead = new BABYLON.Color4(0, 0, 0, 0);
  particle_flame.spriteCellWidth = 128;
  particle_flame.spriteCellHeight = 128;
  particle_flame.spriteRandomStartCell = true;
  particle_flame.endSpriteCellID = 63;
  particle_flame.particleEmitterType = new BABYLON.HemisphericParticleEmitter(0.2, 1, 0);
  particle_flame.color1 = new BABYLON.Color4(1, 0.5, 1, 1);
  particle_flame.color2 = new BABYLON.Color4(1, 0.5, 1, 1);
  particle_flame.useRampGradients = true;
  particle_flame.addColorRemapGradient(0, 0, 0.8);
  particle_flame.addColorRemapGradient(0.2, 0.1, 0.8);
  particle_flame.addColorRemapGradient(0.3, 0.2, 0.85);
  particle_flame.addColorRemapGradient(0.35, 0.4, 0.85);
  particle_flame.addColorRemapGradient(0.4, 0.5, 0.9);
  particle_flame.addColorRemapGradient(0.5, 0.95, 1);
  particle_flame.addColorRemapGradient(1, 0.95, 1);
  particle_flame.addRampGradient(0, new BABYLON.Color3(1, 1, 1));
  particle_flame.addRampGradient(0.09, new BABYLON.Color3(0.8196078431372549, 0.8, 0.058823529411764705));
  particle_flame.addRampGradient(0.18, new BABYLON.Color3(0.8666666666666667, 0.47058823529411764, 0.054901960784313725));
  particle_flame.addRampGradient(0.28, new BABYLON.Color3(0.7843137254901961, 0.16862745098039217, 0.07058823529411765));
  particle_flame.addRampGradient(0.47, new BABYLON.Color3(0.45098039215686275, 0.08627450980392157, 0.058823529411764705));
  particle_flame.addRampGradient(0.88, new BABYLON.Color3(0.054901960784313725, 0.054901960784313725, 0.054901960784313725));
  particle_flame.addRampGradient(1, new BABYLON.Color3(0.054901960784313725, 0.054901960784313725, 0.054901960784313725));
  // scaled direction
  particle_flame.direction1 = new BABYLON.Vector3(-0.4597073593247793, 0.8738101425392586, -0.4507254147385998);
  particle_flame.emitRate = 500;
  particle_flame.blendMode = 4;
  particle_flame.minEmitPower = 0.1;
  particle_flame.maxEmitPower = 0.1;
  particle_flame.minLifeTime = 180;
  particle_flame.maxLifeTime = 240;
  particle_flame.maxScaleX = 1;
  particle_flame.maxScaleY = 1;
  particle_flame.minAngularSpeed = 0;
  particle_flame.maxAngularSpeed = 0;
  particle_flame.maxInitialRotation = 0;
  particle_flame.minInitialRotation = 0;
  particle_flame.minSize = 2;
  particle_flame.maxSize = 6;
  particle_flame.preWarmCycles = 0;
  particle_flame.targetStopDuration = 1;
  particle_flame.preWarmStepOffset = 1;
  particle_flame.preventAutoStart = true;
  particle_flame.updateSpeed = 0.01;
  particle_flame.limitVelocityDamping = 0.7;
  let moveanim = new BABYLON.Animation("plumeAnimationMove", "emitter.y", 1, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  moveanim.setKeys([ { frame: 0, value: 0 }, { frame: 0.4, value: 8 }, { frame: 1, value: 10} ]);
  particle_flame.animations.push(moveanim);
  
  let emitrateanim = new BABYLON.Animation("plumeAnimationEmitRate", "emitRate", 1, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  emitrateanim.setKeys([ { frame: 0, value: 500 }, { frame: 0.5, value: 500 }, { frame: 0.9, value: 500 }, { frame: 1, value: 1000 } ]);
  particle_flame.animations.push(emitrateanim);
  
  let minemitpoweranim = new BABYLON.Animation("plumeAnimationEmitPower", "minEmitPower", 1, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  minemitpoweranim.setKeys([ { frame: 0, value: 0.1 }, { frame: 0.5, value: 0.1 }, { frame: 0.9, value: 0.1 }, { frame: 1, value: 1 } ]);
  particle_flame.animations.push(minemitpoweranim);
  
  let maxemitpoweranim = new BABYLON.Animation("plumeAnimationEmitPower", "maxEmitPower", 1, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  maxemitpoweranim.setKeys([ { frame: 0, value: 0.1 }, { frame: 0.5, value: 0.1 }, { frame: 0.9, value: 0.1 }, { frame: 1, value: 1 } ]);
  particle_flame.animations.push(maxemitpoweranim);
  
  particle_flame.beginAnimationFrom = 0;
  particle_flame.beginAnimationLoop = false;
  particle_flame.beginAnimationOnStart = true;
  particle_flame.beginAnimationTo = 1;
  particle_flame.start();
  
  // return;
  
  // shockwave ground particle
  let particle_shockwave_ground = new BABYLON.ParticleSystem("shockwaveground", 500, scene);
  particle_shockwave_ground.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/particles/textures/explosion/Smoke_SpriteSheet_8x8.png", scene);
  particle_shockwave_ground.particleEmitterType = new BABYLON.CylinderParticleEmitter(1, 0.5, 0, 0);
  particle_shockwave_ground.isAnimationSheetEnabled = true;
  particle_shockwave_ground.spriteCellLoop = true;
  particle_shockwave_ground.spriteCellWidth = 128;
  particle_shockwave_ground.spriteCellHeight = 128;
  particle_shockwave_ground.spriteRandomStartCell = true;
  particle_shockwave_ground.endSpriteCellID = 63;
  particle_shockwave_ground.blendMode = 4;
  particle_shockwave_ground.emitRate = 3000;
  particle_shockwave_ground.updateSpeed = 0.001;
  particle_shockwave_ground.addColorGradient(0, new BABYLON.Color4(0.1, 0.05, 0, 1));
  particle_shockwave_ground.addColorGradient(0.2, new BABYLON.Color4(0, 0, 0, 1));
  particle_shockwave_ground.addColorGradient(0.8, new BABYLON.Color4(0.1, 0.1, 0.1, 0.6));
  particle_shockwave_ground.addColorGradient(1, new BABYLON.Color4(0.1, 0.1, 0.1, 0));
  particle_shockwave_ground.emitter = new BABYLON.Vector3(position.x, 2, position.z); // height of 2 + start Y
  particle_shockwave_ground.minEmitPower = 40;
  particle_shockwave_ground.maxEmitPower = 40;
  particle_shockwave_ground.minSize = 4;
  particle_shockwave_ground.maxSize = 4;
  // particle_shockwave_ground.minLifeTime = 0.4;
  // particle_shockwave_ground.maxLifeTime = 0.4;
  particle_shockwave_ground.maxInitialRotation = 1.5707963267948966;
  particle_shockwave_ground.minInitialRotation = -1.5707963267948966;
  particle_shockwave_ground.targetStopDuration = 0.1;
  particle_shockwave_ground.start();
  
  // shockwave air particle
  let particle_shockwave_air = new BABYLON.ParticleSystem("shockwaveair", 500, scene);
  particle_shockwave_air.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/particles/textures/explosion/Smoke_SpriteSheet_8x8.png", scene);
  particle_shockwave_air.particleEmitterType = new BABYLON.CylinderParticleEmitter(1, 0.5, 0, 0);
  particle_shockwave_air.isAnimationSheetEnabled = true;
  particle_shockwave_air.spriteCellLoop = true;
  particle_shockwave_air.spriteCellWidth = 128;
  particle_shockwave_air.spriteCellHeight = 128;
  particle_shockwave_air.spriteRandomStartCell = true;
  particle_shockwave_air.endSpriteCellID = 63;
  particle_shockwave_air.blendMode = 2;
  particle_shockwave_air.emitRate = 2000;
  particle_shockwave_air.updateSpeed = 0.01;
  particle_shockwave_air.addColorGradient(0, new BABYLON.Color4(0.4, 0.4, 0.4, 1));
  particle_shockwave_air.addColorGradient(0.5, new BABYLON.Color4(0.7, 0.7, 0.7, 1));
  particle_shockwave_air.addColorGradient(1, new BABYLON.Color4(0.7, 0.7, 0.7, 0));
  particle_shockwave_air.emitter = new BABYLON.Vector3(position.x, 2+10, position.z); // height of 2 + start Y
  particle_shockwave_air.minEmitPower = 10;
  particle_shockwave_air.maxEmitPower = 10;
  particle_shockwave_air.minSize = 2;
  particle_shockwave_air.maxSize = 2;
  particle_shockwave_air.minLifeTime = 3;
  particle_shockwave_air.maxLifeTime = 3;
  particle_shockwave_air.maxInitialRotation = 1.5707963267948966;
  particle_shockwave_air.minInitialRotation = -1.5707963267948966;
  particle_shockwave_air.targetStopDuration = 0.1;
  particle_shockwave_air.start();
  
  // flash particle
  let particle_flash = new BABYLON.ParticleSystem("flash", 40, scene);
  particle_flash.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/particles/textures/explosion/FlashParticle.png", scene);
  particle_flash.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  particle_flash.emitRate = 2000;
  particle_flash.updateSpeed = 0.03;
  particle_flash.addColorGradient(0, new BABYLON.Color4(1, 1, 1, 1));
  particle_flash.addColorGradient(0.4, new BABYLON.Color4(0.7547, 0.1219, 0.0391, 1));
  particle_flash.addColorGradient(0.8, new BABYLON.Color4(1, 1, 1, 0));
  particle_flash.emitter = new BABYLON.Vector3(position.x, 2, position.z);
  particle_flash.gravity = new BABYLON.Vector3(0, 0, 0);
  particle_flash.maxScaleX = 100000;
  particle_flash.maxScaleY = 100000;
  particle_flash.minSize = 0.1;
  particle_flash.maxSize = 0.1;
  particle_flash.minLifeTime = 0.2;
  particle_flash.maxLifeTime = 0.4;
  particle_flash.targetStopDuration = 0.1;
  particle_flash.start();
  
  // sound
  // normal https://cdn.freesound.org/previews/110/110818_1518221-lq.mp3
  // scary https://cdn.freesound.org/previews/451/451289_8698658-lq.mp3
  // long explosion: https://cdn.freesound.org/previews/86/86027_1275452-lq.mp3
  let sound = new BABYLON.Sound("explosion", "https://cdn.freesound.org/previews/86/86027_1275452-lq.mp3", scene, null, { loop: false, autoplay: true });
  sound.setVolume(0.1);
  // sound.setPosition(position);
  // return;
  
  // Let's start with the mushroom cloud, it should start at the position of the explosion and move up
  let cloud = {};
  cloud.mesh = BABYLON.MeshBuilder.CreateSphere("cloud", {segments: 16, diameter: 1, diameterY: 0.5}, scene);
  cloud.mesh.position = position.clone();
  cloud.mesh.scaling.scaleInPlace(0.1);
  cloud.mesh.material = new BABYLON.StandardMaterial("cloud", scene);
  // explosion texture https://stock.adobe.com/pe/images/red-fire-explosion-texture/2684324 from https://stock.adobe.com/pe/contributor/110952/chaoss?load_type=author&prev_url=detail
  cloud.mesh.material.diffuseTexture = new BABYLON.Texture("https://as2.ftcdn.net/v2/jpg/00/02/68/43/1000_F_2684324_1KqrNgq002CL0ApUIwblQ5blP4aF34.jpg", scene);
  cloud.mesh.material.diffuseTexture.uScale = 1.0;
  cloud.mesh.material.diffuseTexture.vScale = 1.0;
  cloud.mesh.material.diffuseTexture.hasAlpha = false;
  cloud.mesh.material.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  cloud.mesh.material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  cloud.mesh.material.backFaceCulling = false;
  cloud.mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
  cloud.mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
  cloud.mesh.material.ambientColor = new BABYLON.Color3(0, 0, 0);
  cloud.mesh.material.alpha = 0.75;
  cloud.mesh.material.freeze();
  
  // Mushroom cloud move up animation
  cloud.anim_move = {
    start: 0,
    fps: 24,
    steps: 24,
    speed: 0.5,
    maxHeight: 10,
    keys: []
  };
  cloud.anim_move.anim = new BABYLON.Animation("anim", "position.y", cloud.anim_move.fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  for (let i = 0; i < cloud.anim_move.steps; i++) {
    let t = i / (cloud.anim_move.steps - 1);
    let pos_Y = BABYLON.Scalar.Lerp(position.y, position.y + cloud.anim_move.maxHeight, t);
    cloud.anim_move.keys.push({
      frame: cloud.anim_move.fps * t,
      value: pos_Y
    });
  }
  cloud.anim_move.anim.setKeys(cloud.anim_move.keys);
  cloud.mesh.animations.push(cloud.anim_move.anim);
  
  // Mushroom cloud expand animation
  cloud.anim_expand = {
    start: cloud.anim_move.fps * (cloud.anim_move.steps - 1) / cloud.anim_move.speed,
    fps: 24,
    steps: 24,
    maxScale: 10,
    keys: []
  };
  cloud.anim_expand.anim = new BABYLON.Animation("anim", "scaling", cloud.anim_expand.fps, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  for (let i = 0; i < cloud.anim_expand.steps; i++) {
    let t = i / (cloud.anim_expand.steps - 1);
    let scale = BABYLON.Scalar.Lerp(0.1, cloud.anim_expand.maxScale, t);
    cloud.anim_expand.keys.push({
      frame: cloud.anim_expand.fps * t,
      value: new BABYLON.Vector3(scale, scale, scale)
    });
  }
  cloud.anim_expand.anim.setKeys(cloud.anim_expand.keys);
  cloud.mesh.animations.push(cloud.anim_expand.anim);
  
  // Mushroom cloud rotation animation
  cloud.anim_rotate = {
    start: cloud.anim_move.fps * (cloud.anim_move.steps - 1) / cloud.anim_move.speed,
    fps: 24,
    steps: 24,
    maxAngle: 2 * Math.PI,
    keys: []
  };
  cloud.anim_rotate.anim = new BABYLON.Animation("anim", "rotation.y", cloud.anim_rotate.fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  for (let i = 0; i < cloud.anim_rotate.steps; i++) {
    let t = i / (cloud.anim_rotate.steps - 1);
    let angle = BABYLON.Scalar.Lerp(0, cloud.anim_rotate.maxAngle, t);
    cloud.anim_rotate.keys.push({
      frame: cloud.anim_rotate.fps * t,
      value: angle
    });
  }
  cloud.anim_rotate.anim.setKeys(cloud.anim_rotate.keys);
  cloud.mesh.animations.push(cloud.anim_rotate.anim);
  
  // First, lets make a light that will light up all the scene
  cloud.light = new BABYLON.PointLight("cloudlight", position, scene);
  cloud.light.intensity = 1;
  cloud.light.diffuse = new BABYLON.Color3(1, 0.5, 0);
  cloud.light.specular = new BABYLON.Color3(1, 0.5, 0);
  cloud.light.range = 50;
  
  scene.beginAnimation(cloud.mesh, cloud.anim_move.start, cloud.anim_move.start + cloud.anim_move.fps, false, 0.5, () => {
    cloud.mesh.animations = [cloud.anim_rotate.anim];
    scene.beginAnimation(cloud.mesh, cloud.anim_rotate.start, cloud.anim_rotate.start + cloud.anim_rotate.fps, false, 0.25, () => {
      scene.beginAnimation(cloud.mesh, cloud.anim_rotate.start, cloud.anim_rotate.start + cloud.anim_rotate.fps, false, 0.05, () => {
        scene.removeLight(cloud.light);
        cloud.mesh.dispose();
      });
    });
  });
  
  // Stem of the mushroom  
  let stem = {};
  stem.curveSteps = 200;
  stem.curveHeight = 20;
  stem.curveHeightOffset = 5;
  stem.curveMinRadius = 2.5;
  stem.curveMaxRadius = 5;
  stem.curveRadiusChange = (index, distance) => {
    let t = Math.abs(stem.curveSteps / 2 - index) / stem.curveSteps * 2;
    // between 0.5 and 0.9 when index > 50 moves the curve
    // if (index < 50) {
    //   t = t * 3;
    // }
    let cos = Math.cos(t * Math.PI);
    let radius = stem.curveMinRadius + Math.pow(cos, 2 * 3) * (stem.curveMaxRadius - stem.curveMinRadius);
    return radius;
  };
  stem.curvePath = (function ____getCurvePath() {
    let path = [];
    let stepSize = stem.curveHeight / stem.curveSteps;
    for (let i = 0; i < stem.curveHeight - stem.curveHeightOffset; i += stepSize) {
      path.push(new BABYLON.Vector3(0, i, 0));
    }
    return path;
  })();
  
  stem.mesh = BABYLON.MeshBuilder.CreateTube("tube", { path: stem.curvePath, radiusFunction: stem.curveRadiusChange, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
  stem.mesh.position = position.clone();
  stem.mesh.position.y = -5;
  stem.mesh.scaling.scaleInPlace(0.05);
  stem.mesh.material = new BABYLON.StandardMaterial("stem", scene);
  // explosion texture https://stock.adobe.com/pe/images/red-fire-explosion-texture/2684324 from https://stock.adobe.com/pe/contributor/110952/chaoss?load_type=author&prev_url=detail
  stem.mesh.material.diffuseTexture = new BABYLON.Texture("https://as2.ftcdn.net/v2/jpg/00/02/68/43/1000_F_2684324_1KqrNgq002CL0ApUIwblQ5blP4aF34.jpg", scene);
  stem.mesh.material.diffuseTexture.uScale = 1.0;
  stem.mesh.material.diffuseTexture.vScale = 1.0;
  stem.mesh.material.diffuseTexture.hasAlpha = false;
  stem.mesh.material.diffuseTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  stem.mesh.material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  stem.mesh.material.backFaceCulling = false;
  stem.mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
  stem.mesh.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
  stem.mesh.material.ambientColor = new BABYLON.Color3(0, 0, 0);
  stem.mesh.material.alpha = 0.75;
  stem.mesh.material.freeze();
  
  // Stem move up animation
  stem.anim_move = {
    start: 0,
    fps: 24,
    steps: 24,
    speed: 0.5,
    maxHeight: 0,
    keys: []
  };
  stem.anim_move.anim = new BABYLON.Animation("anim", "position.y", stem.anim_move.fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  for (let i = 0; i < stem.anim_move.steps; i++) {
    let t = i / (stem.anim_move.steps - 1);
    let pos_Y = BABYLON.Scalar.Lerp(position.y - 5, position.y, t);
    stem.anim_move.keys.push({
      frame: stem.anim_move.fps * t,
      value: pos_Y
    });
  }
  stem.anim_move.anim.setKeys(stem.anim_move.keys);
  stem.mesh.animations.push(stem.anim_move.anim);
  
  // Stem expand animation
  stem.anim_expand = {
    start: 0,
    fps: 24,
    steps: 24,
    maxScale: 0.5,
    keys: []
  };
  stem.anim_expand.anim = new BABYLON.Animation("anim", "scaling", stem.anim_expand.fps, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  for (let i = 0; i < stem.anim_expand.steps; i++) {
    let t = i / (stem.anim_expand.steps - 1);
    let scale = BABYLON.Scalar.Lerp(0.1, stem.anim_expand.maxScale, t);
    stem.anim_expand.keys.push({
      frame: stem.anim_expand.fps * t,
      value: new BABYLON.Vector3(scale, scale, scale)
    });
  }
  stem.anim_expand.anim.setKeys(stem.anim_expand.keys);
  stem.mesh.animations.push(stem.anim_expand.anim);
  
  // Stem rotation animation
  stem.anim_rotate = {
    start: 0,
    fps: 24,
    steps: 24,
    maxAngle: 2 * Math.PI,
    keys: []
  };
  stem.anim_rotate.anim = new BABYLON.Animation("anim", "rotation.y", stem.anim_rotate.fps, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  for (let i = 0; i < stem.anim_rotate.steps; i++) {
    let t = i / (stem.anim_rotate.steps - 1);
    let angle = BABYLON.Scalar.Lerp(0, stem.anim_rotate.maxAngle, t);
    stem.anim_rotate.keys.push({
      frame: stem.anim_rotate.fps * t,
      value: angle
    });
  }
  stem.anim_rotate.anim.setKeys(stem.anim_rotate.keys);
  stem.mesh.animations.push(stem.anim_rotate.anim);
  scene.beginAnimation(stem.mesh, stem.anim_move.start, stem.anim_move.start + stem.anim_move.fps, false, 0.5, () => {
    stem.mesh.animations = [stem.anim_rotate.anim];
    scene.beginAnimation(stem.mesh, stem.anim_rotate.start, stem.anim_rotate.start + stem.anim_rotate.fps, false, 0.25, () => {
      scene.beginAnimation(stem.mesh, stem.anim_rotate.start, stem.anim_rotate.start + stem.anim_rotate.fps, false, 0.05, () => {
        stem.mesh.dispose();
      });
    });
  });
  
  // Create particles in the ground
  stem.particleSystem2 = new BABYLON.ParticleSystem("particles", 2000, scene);
  stem.particleSystem2.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/cloud.png", scene);
  stem.particleSystem2.emitter = stem.mesh;
  stem.particleSystem2.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
  stem.particleSystem2.maxEmitBox = new BABYLON.Vector3(1, 0, 1);
  stem.particleSystem2.color1 = new BABYLON.Color4(0, 0, 0, 0.5);
  stem.particleSystem2.color2 = new BABYLON.Color4(0, 0, 0, 0.5);
  stem.particleSystem2.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
  stem.particleSystem2.minSize = 0.5;
  stem.particleSystem2.maxSize = 5.0;
  stem.particleSystem2.minLifeTime = 0.3;
  stem.particleSystem2.maxLifeTime = 1.5;
  stem.particleSystem2.emitRate = 1500;
  stem.particleSystem2.blendMode = BABYLON.ParticleSystem.BLENDMODE_MULTIPLY;
  // should only be on the ground
  stem.particleSystem2.direction1 = new BABYLON.Vector3(-50, 4, -50);
  stem.particleSystem2.direction2 = new BABYLON.Vector3(50, 4, 50);
  // stem.particleSystem2.direction2 = new BABYLON.Vector3(1, 8, 1);
  stem.particleSystem2.minAngularSpeed = 0;
  stem.particleSystem2.maxAngularSpeed = Math.PI;
  stem.particleSystem2.minEmitPower = 0.5;
  stem.particleSystem2.maxEmitPower = 1;
  stem.particleSystem2.updateSpeed = 0.005;
  stem.particleSystem2.start();
  //*/
};

function GameComponent() {
  const onSceneReady = async (scene) => {
    console.log('scene ready')
    const engine = scene.getEngine();
    const canvas = engine.getRenderingCanvas();
    var squareSize = 5;
    var squareLength =  8;
    // scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
    // var borderRadius = squareSize * squareLength * 1.25;
    
    // This is where we initialize and configure our camera target position (middle of the board)
    var boardCenterPos = squareSize * ((squareLength - 1) / 2);
    nextCameraTarget = new BABYLON.Vector3(boardCenterPos, 0, boardCenterPos);
    nextCameraPos = new BABYLON.Vector3(boardCenterPos, camHeight, boardCenterPos + camHeight / Math.tan(camAngleOffsetZ));
    var camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, camHeight, nextCameraTarget, scene);
    camera.setPosition(nextCameraPos);
    configureCameraControls(camera, canvas);
    camera.wheelPrecision = 9;
    camera.upperBetaLimit = Math.PI / 2;
    
    // Load assets
    console.log("Downloading assets...");
    await loadMissileAssets();
    console.log("Assets downloaded!");
    
    // Camera zoom limits
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = camMaxHeight;
    
    // Bounce effect when camera zoom reaches limi
    camera.useBouncingBehavior = true;
    camera.bouncingBehavior.lowerRadiusTransitionRange = 10;
    camera.bouncingBehavior.upperRadiusTransitionRange = -10;
    
    // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, camHeight, 0), scene);
    
    // Default intensity is 1. Let's dim the light a small amount
    light.intensity = 0.7;
    
    // Chessboard made up of squares
    var chessboard = createCheckerboard(scene, squareSize, squareLength);
    
    /**
    * Pointer Input: First we check for a drag behavior, if we don't find that we check for a double-tap (exit zoom).
    * Finally, we check if a mesh has been tapped on
    */
    scene.onPointerObservable.add((eventData) => {
      // Only allow pointer input when we're not moving, because we could get stuck in a camera target
      if (enableAnim) return;
      if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN && !zoomEnabled) {
        previousX = eventData.event.clientX;
        previousY = eventData.event.clientY;
        buttonDown = true;
      }
      else if (eventData.type === BABYLON.PointerEventTypes.POINTERUP && !zoomEnabled) {
        buttonDown = false;
      }
      // Normally, we could just use the PointerEvent's movementX/Y but since iOS doesn' support that
      // We have to be a bit more creative and calculate the movement delta ourselves.
      else if (eventData.type === BABYLON.PointerEventTypes.POINTERMOVE && buttonDown) {
        let moveX = 0;
        let moveZ = 0;
        
        if (previousX - eventData.event.clientX !== 0) {
          moveX = eventData.event.clientX - previousX;
        }
        
        if (previousY - eventData.event.clientY !== 0) {
          moveZ = eventData.event.clientY - previousY;
        }
        
        // speed depending on its height
        let _speed = (camera.position.y/camMaxHeight) * 0.2; // 0.2 is just a mult
        camera.position.x += moveX * _speed;
        camera.position.z -= moveZ * _speed;
        camera.target.x += moveX * _speed;
        camera.target.z -= moveZ * _speed;
        
        previousX = eventData.event.clientX;
        previousY = eventData.event.clientY;
      }
      else if (eventData.type === BABYLON.PointerEventTypes.POINTERDOUBLETAP) {
        // if its left click
        if (eventData.event.button === 0) {
          // If selected a valid unit
          if (eventData.pickInfo.pickedMesh && eventData.pickInfo.pickedMesh.name.search("square") === -1) {
            if (zoomEnabled && eventData.pickInfo.pickedMesh === selectedMesh) {
              switchCameraFocus(camera, null, true);
            } else {
              buttonDown = false;
              startZoomedView(camera, eventData.pickInfo.pickedMesh, true);
            }
          } else if (zoomEnabled) {
            switchCameraFocus(camera, null, true);
          }
        }
      }
      // We only care if a non-plane object has been picked.
      else if (eventData.type === BABYLON.PointerEventTypes.POINTERPICK) {
        buttonDown = false;
        // Left Click
        if (eventData.event.button === 0) {
          if (eventData.pickInfo.pickedMesh.name.search("square") === -1 && eventData.pickInfo.pickedMesh !== selectedMesh) {
            selectObject(eventData.pickInfo.pickedMesh);
            if (zoomEnabled) {
              startZoomedView(camera, eventData.pickInfo.pickedMesh);
            }
          }
        } 
        //Right Click
        else if (eventData.event.button === 2) {
          if (selectedMesh) {
            if (eventData.pickInfo.pickedMesh.name.search("square") === -1) {
              // spawn a missile
              spawnMissile(scene, selectedMesh, eventData.pickInfo.pickedMesh);
            }
          }
        }
      }
    });
    
    // This allows the Escape key or Space key to be an additional way to exit the zoomed in view
    scene.onKeyboardObservable.add((eventData) => {
      if (eventData.type === BABYLON.KeyboardEventTypes.KEYUP && (eventData.event.keyCode === 27 || eventData.event.keyCode === 32) && zoomEnabled) {
        switchCameraFocus(camera, null, true);
      }
    });
    
    // Our "game loop".  If we have new position to move the camera and enableAnim is true, "gracefully" move to
    // that position using a lerp
    scene.onBeforeRenderObservable.add(() => {
      if (enableAnim) {
        let deltaX = Math.abs(nextCameraPos.x - camera.position.x);
        let deltaY = Math.abs(nextCameraPos.y - camera.position.y);
        let deltaZ = Math.abs(nextCameraPos.z - camera.position.z);
        
        if (deltaX > 0.01 || deltaY > 0.01 || deltaZ > 0.01) {
          camera.setPosition(BABYLON.Vector3.Lerp(camera.position, nextCameraPos, 0.05));
          camera.setTarget(BABYLON.Vector3.Lerp(camera.target, nextCameraTarget, 0.05));
        }
        // If we're close enough, finalize movement and disable animation
        else if (camera.target !== nextCameraTarget) {
          camera.position = nextCameraPos;
          camera.target = nextCameraTarget;
          enableAnim = false;
          
          if (!zoomEnabled) {
            camera.inputs.attached["KeyboardPan"].activeMove = true;
          }
          else if (!camera.inputs.attached["KeyboardPan"].activeRotate) {
            camera.inputs.add(new BABYLON.ArcRotateCameraPointersInput());
            camera.panningSensibility = 0;
            camera.inputs.attached["KeyboardPan"].activeRotate = true;
          }
        }
      }
    });
    
    const selectObject = (pickedMesh) => {
      if (selectedMesh) selectedMesh.renderOutline = false;
      if (pickedMesh) pickedMesh.renderOutline = true;
      selectedMesh = pickedMesh;
    };
    
    const switchCameraFocus = (camera, pickedMesh, select) => {
      camera.inputs.removeByType("ArcRotateCameraPointersInput");
      camera.inputs.attached["KeyboardPan"].activeRotate = false;
      nextCameraTarget = (pickedMesh) ? pickedMesh.position : new BABYLON.Vector3(nextCameraTarget.x, 0, nextCameraTarget.z);
      nextCameraPos = new BABYLON.Vector3(nextCameraTarget.x, camHeight, nextCameraTarget.z + camHeight / Math.tan(camAngleOffsetZ));
      enableAnim = true;
      zoomEnabled = false;
      
      if (select) selectObject(pickedMesh);
    };
    
    const startZoomedView = (camera, pickedMesh, select) => {
      camera.inputs.attached["KeyboardPan"].activeMove = false;
      nextCameraTarget = pickedMesh.position;
      let vectorfromCameraToTarget = new BABYLON.Vector3(nextCameraTarget.x - camera.position.x, 1, nextCameraTarget.z - camera.position.z).normalize().scale(squareSize*2);
      nextCameraPos = new BABYLON.Vector3(nextCameraTarget.x - vectorfromCameraToTarget.x, squareSize, nextCameraTarget.z - vectorfromCameraToTarget.z);
      enableAnim = true;
      zoomEnabled = true;
      
      if (select) selectObject(pickedMesh);
    };
    
    document.onkeydown = function (e) {
      e = e || window.event;//Get event
      
      if (!e.ctrlKey) return;
      
      var code = e.which || e.keyCode;//Get key code
      
      switch (code) {
        case 83://Block Ctrl+S
        case 87://Block Ctrl+W -- Not work in Chrome and new Firefox
        e.preventDefault();
        e.stopPropagation();
        break;
      }
    };
    
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }
  
  return (
    <SceneComponent id='GameScene' onSceneReady={onSceneReady}/>
    )
  }
  
  export default GameComponent