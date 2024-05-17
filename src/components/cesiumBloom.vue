<script>
import * as Cesium from 'cesium';
import { defineComponent, onMounted } from 'vue'
import createUnrealBloom from "./createUnrealBloom";

var viewer;

export default defineComponent({
    setup() {

        onMounted(async () => {
            viewer = new Cesium.Viewer('cesiumContainer');

            var bloomStage = createUnrealBloom('bloom', 0.5)
            bloomStage.selected = []
            bloomStage.enabled = false
            viewer.postProcessStages.add(bloomStage);
            console.log(Cesium.Color.RED);
            var cesiumStage = Cesium.PostProcessStageLibrary.createSilhouetteStage()
            cesiumStage.enabled = false;
            viewer.postProcessStages.add(cesiumStage);
            
            const initialPosition = Cesium.Cartesian3.fromDegrees(
                -74.01881302800248,
                40.69114333714821,
                753
            );
            const initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(
                21.27879878293835,
                -21.34390550872461,
                0.0716951918898415
            );
            viewer.scene.camera.setView({
                destination: initialPosition,
                orientation: initialOrientation,
            });

            viewer.postProcessStages.fxaa.enabled = true;
            viewer.scene.globe.depthTestAgainstTerrain = true;

            //entities
            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(-74.01801102800248,
                    40.70514333714821,
                    110),
                box: {
                    dimensions: new Cesium.Cartesian3(100, 100, 100),
                    material: Cesium.Color.GREY
                }
            })
            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(-74.01701102800248,
                    40.70414333714821,
                    110),
                ellipsoid: {
                    radii: new Cesium.Cartesian3(50, 50, 50),
                    material: Cesium.Color.AQUAMARINE
                }
            })

            //鼠标点击，拾取对象并高亮显示
            viewer.screenSpaceEventHandler.setInputAction((e) => {
                var mousePosition = e.position;
                var picked = viewer.scene.pick(mousePosition)
                bloomStage.selected = []
                bloomStage.enabled = false

                if (picked && picked.primitive) {

                    let primitive = picked.primitive
                    let pickIds = primitive._pickIds;
                    let pickId = picked.pickId;

                    if (!pickId && !pickIds && picked.content) {
                        pickIds = picked.content._model._pickIds;
                    }

                    if (!pickId) {
                        if (picked.id) {
                            pickId = pickIds.find(pickId => {
                                return pickId.object == picked;
                            })
                        } else if (pickIds) {
                            pickId = pickIds[0]
                        }
                    }

                    if (pickId) {
                        let pickObject = {
                            pickId: pickId
                        }

                        
                        bloomStage.selected = [pickObject]
                        cesiumStage.selected = [pickObject]
                        bloomStage.enabled = !cesiumStage.enabled
                    } else {
                        $message.alert('未找到pickId')
                    }

                }

            }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        })

        return {

        }
    }
})

</script> 

<template>
    <div id="cesiumContainer" class="fullSize"></div>
</template>

<style scoped>
#cesiumContainer {
    width: 100%;
    height: 100%;
}
</style>
