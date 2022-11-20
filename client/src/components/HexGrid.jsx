import { Color3, DirectionalLight, FreeCamera, MeshBuilder, NodeMaterial, Texture, Vector2, Vector3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, Checkbox, Control, Grid, Slider, TextBlock } from '@babylonjs/gui';
import React from 'react'
import SceneComponent from './SceneComponent'

export default function HexGrid() {
  const onSceneReady = (scene) => {
    const canvas = scene.getEngine().getRenderingCanvas()
    // static top-down camera
    var camera = new FreeCamera('camera', new Vector3(0, 12, -10), scene)
    camera.setTarget(Vector3.Zero())
    camera.attachControl(canvas, true)
    
    camera.keysUp.push(87)
    camera.keysDown.push(83)
    camera.keysLeft.push(65)
    camera.keysRight.push(68)

    camera.inputs.addMouseWheel()
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
    })
    
    camera.angularSensibility = 500
    camera.inertia = 0

    scene.clearColor = new Color3(0.26, 0.19, 0.49);

    var dirlight = new DirectionalLight("dirLight", new Vector3(1, -1, 0));
    dirlight.intensity = 0.8;

    var hexTerrainMat = new NodeMaterial("hexTerrainMat", scene, { emitComments: false });
    // var diffuseTex;
    // var specularTex;
    // var normalTex;
    // var heightTex;
    var maskTex;
    var hexXCount = 13;
    var hexYCount = 7;
    var hexOffset = [];
    var initalPosition = new Vector2(-0.07, 0.04);
    var loadTextureAsync = function(url) {
        return new Promise((resolve, reject) => {
            var texture = new Texture(url, scene, false, false);
            texture.onLoadObservable.addOnce(() => resolve(texture));
        });
    };

    var promises = [];
    // promises.push(loadTextureAsync("https://models.babylonjs.com/Demos/hexGrid/hexMap_diffuse.png").then(texture => diffuseTex = texture));
    // promises.push(loadTextureAsync("https://models.babylonjs.com/Demos/hexGrid/hexMap_specularMixed.png").then(texture => specularTex = texture));
    // promises.push(loadTextureAsync("https://models.babylonjs.com/Demos/hexGrid/hexMap_normal.png").then(texture => normalTex = texture));
    // promises.push(loadTextureAsync("https://models.babylonjs.com/Demos/hexGrid/hexMap_height.png").then(texture => heightTex = texture));
    promises.push(loadTextureAsync("https://models.babylonjs.com/Demos/hexGrid/hexMap_hexMask.png").then(texture => maskTex = texture));
    promises.push(hexTerrainMat.loadAsync("https://models.babylonjs.com/Demos/hexGrid/hexTerrainMat.json"));

    Promise.all(promises).then(function() {

      // terrain mesh
      var terrainMesh = MeshBuilder.CreateGround("terrain", {width: 20, height: 20});

      // build node material
      hexTerrainMat.build(false);
      terrainMesh.material = hexTerrainMat;

      // get inputs from node material
      var diffuseNode = hexTerrainMat.getBlockByName("diffuse");
      var specularNode = hexTerrainMat.getBlockByName("specular");
      var normalNode = hexTerrainMat.getBlockByName("normalTexture");
      var heightNode = hexTerrainMat.getBlockByName("height");
      var maskNode = hexTerrainMat.getBlockByName("mask");
      var activeHexOffset = hexTerrainMat.getBlockByName("activeHexOffset");
      var dest1Visible = hexTerrainMat.getBlockByName("dest1Visible");
      var dest2Visible = hexTerrainMat.getBlockByName("dest2Visible");
      var dest3Visible = hexTerrainMat.getBlockByName("dest3Visible");
      var dest4Visible = hexTerrainMat.getBlockByName("dest4Visible");
      var dest5Visible = hexTerrainMat.getBlockByName("dest5Visible");
      var dest6Visible = hexTerrainMat.getBlockByName("dest6Visible");

      // to compensate for ground mesh UV layout
      maskTex.uScale = -1.0;

      // offset hex mask to initial position
      activeHexOffset.value = initalPosition;

      // assign textures to node material
      // diffuseNode.texture = diffuseTex;
      // specularNode.texture = specularTex;
      // normalNode.texture = normalTex;
      // heightNode.texture = heightTex;
      maskNode.texture = maskTex;

      // create array of uv offsets to be drived by GUI slider
      var isEven = true;
      var yOffset;
      var currentY = 0;
      var currentX = 0;

      for (var y = 0; y < hexYCount; y++) {
        currentY = initalPosition.y - (0.1208 * y);
        for (var x = 0; x < hexXCount; x++) {
          currentX = initalPosition.x + (0.0698 * x);
          yOffset = (isEven) ? 0 : 0.04;
          hexOffset[x + (hexXCount * y)] = new Vector2(currentX, currentY + yOffset);
          isEven = !isEven;  
        }
      }

      // gui texture
      var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

      // main grid
      var uiGrid = new Grid("guiGrid");
      uiGrid.width = "850px";
      uiGrid.height = "150px";
      uiGrid.addColumnDefinition(100, false);
      uiGrid.addRowDefinition(30, true);
      uiGrid.addRowDefinition(40, true);
      uiGrid.addRowDefinition(40, true);
      uiGrid.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
      guiTexture.addControl(uiGrid);

      // slider label
      var header = new TextBlock("sliderHeader");
      header.text = "Active Hex: 0";
      header.height = "30px";
      header.color = "white";
      uiGrid.addControl(header, 0, 0);

      // hex position slider
      var slider = new Slider("activeHex");
      slider.isThumbCircle = true;
      slider.minimum = 0;
      slider.maximum = (hexXCount * hexYCount) - 1;
      slider.value = 0;
      slider.height = "20px";
      slider.width = "800px";
      slider.background = "#3f3461";
      slider.color = "#9379e6";
      slider.onValueChangedObservable.add(function(value) {
          header.text = "Active Hex:  " + Math.floor(value);
          activeHexOffset.value = hexOffset[Math.floor(value)];
      });
      uiGrid.addControl(slider, 1, 0);

      // hex visibility grid
      var checkboxGrid = new Grid("checkboxGrid");
      checkboxGrid.width = "420px";
      checkboxGrid.height = "40px";
      checkboxGrid.addColumnDefinition(180, true);
      checkboxGrid.addColumnDefinition(40, true);
      checkboxGrid.addColumnDefinition(40, true);
      checkboxGrid.addColumnDefinition(40, true);
      checkboxGrid.addColumnDefinition(40, true);
      checkboxGrid.addColumnDefinition(40, true);
      checkboxGrid.addColumnDefinition(40, true);
      checkboxGrid.addRowDefinition(40, true);
      uiGrid.addControl(checkboxGrid, 2, 0);

      // checkbox header
      var checkboxHeader = new TextBlock("checkboxHeader");
      checkboxHeader.text = "Enable Hex Visbility";
      checkboxHeader.height = "30px";
      checkboxHeader.color = "white";
      checkboxGrid.addControl(checkboxHeader, 0, 0);

      // visibility checkboxes
      var checkbox1 = new Checkbox("hex1Visible");
      checkbox1.width = "20px";
      checkbox1.height = "20px";
      checkbox1.isChecked = true;
      checkbox1.color = "#9379e6";
      checkbox1.onIsCheckedChangedObservable.add(function(value) {
          dest1Visible.value = value;
      });
      checkboxGrid.addControl(checkbox1, 0, 1);    
  
      var checkbox2 = new Checkbox();
      checkbox2.width = "20px";
      checkbox2.height = "20px";
      checkbox2.isChecked = true;
      checkbox2.color = "#9379e6";
      checkbox2.onIsCheckedChangedObservable.add(function(value) {
          dest2Visible.value = value;
      });
      checkboxGrid.addControl(checkbox2, 0, 2);    

      var checkbox3 = new Checkbox();
      checkbox3.width = "20px";
      checkbox3.height = "20px";
      checkbox3.isChecked = true;
      checkbox3.color = "#9379e6";
      checkbox3.onIsCheckedChangedObservable.add(function(value) {
          dest3Visible.value = value;
      });
      checkboxGrid.addControl(checkbox3, 0, 3);    

      var checkbox4 = new Checkbox();
      checkbox4.width = "20px";
      checkbox4.height = "20px";
      checkbox4.isChecked = true;
      checkbox4.color = "#9379e6";
      checkbox4.onIsCheckedChangedObservable.add(function(value) {
          dest4Visible.value = value;
      });
      checkboxGrid.addControl(checkbox4, 0, 4);    

      var checkbox5 = new Checkbox();
      checkbox5.width = "20px";
      checkbox5.height = "20px";
      checkbox5.isChecked = true;
      checkbox5.color = "#9379e6";
      checkbox5.onIsCheckedChangedObservable.add(function(value) {
          dest5Visible.value = value;
      });
      checkboxGrid.addControl(checkbox5, 0, 5);    

      var checkbox6 = new Checkbox();
      checkbox6.width = "20px";
      checkbox6.height = "20px";
      checkbox6.isChecked = true;
      checkbox6.color = "#9379e6";
      checkbox6.onIsCheckedChangedObservable.add(function(value) {
          dest6Visible.value = value;
      });
      checkboxGrid.addControl(checkbox6, 0, 6);
    });
  }

  return (
    <SceneComponent onSceneReady={onSceneReady}>
    </SceneComponent>
  )
}