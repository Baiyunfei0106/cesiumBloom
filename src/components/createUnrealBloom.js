

import CesiumRenderPass from './CesiumRenderPass.js'
import createBlurStage from './createBlurStage.js'
import * as Cesium from 'cesium';

export default function createEdgeStage(name,bloomStrength) {
    name = name || 'UnrealBloomEffect'
    const { PostProcessStage, PostProcessStageComposite, defined,Sampler,TextureMagnificationFilter,TextureMinificationFilter,Cartesian2 } = Cesium

    let bloomTintColors = [ Cesium.Color.PINK, 
                            Cesium.Color.BLUE, 
                            Cesium.Color.RED, 
                            Cesium.Color.GREEN, 
                            Cesium.Color.YELLOW ]

    let normalDepthPass = new CesiumRenderPass({
        name: name + 'Pass',
        vertexShader: `
        out vec3 vOutlineNormal;
        void main(){
            #ifdef HAS_NORMAL
                vOutlineNormal = normal;
            #else
                #ifdef HAS_V_NORMAL
                    vOutlineNormal = v_normal;
                #else
                    vOutlineNormal=vec3(0.);
                #endif
            #endif
        }
        `,
        fragmentShader: `
        in vec3 vOutlineNormal;
        void main(){
            if(!czm_selected())discard; 
            if(length(vOutlineNormal)>0.)out_FragColor=vec4( vOutlineNormal ,out_FragColor.a); 
        }
        `,
        sampler:new Sampler({
            minificationFilter:TextureMinificationFilter.LINEAR,
            magnificationFilter:TextureMagnificationFilter.LINEAR
        })
    })
    const maskStage = new PostProcessStage({
        name: name + 'Mask',
        uniforms: {

            maskTexture() {
                return normalDepthPass.texture
            },
            smoothWidth:0.51,
            luminosityThreshold:0.1,
            defaultColor:Cesium.Color.fromCssColorString('#000000'),
            defaultOpacity:1.0,
        },
        fragmentShader: `

            uniform sampler2D maskTexture;
            uniform sampler2D colorTexture;
            uniform vec3 defaultColor;
            uniform float defaultOpacity;
            uniform float luminosityThreshold;
            uniform float smoothWidth;

            in vec2 v_textureCoordinates;


            void main() {

                vec4 color = texture( colorTexture, v_textureCoordinates); 
                vec4 maskColor = texture( maskTexture, v_textureCoordinates);

                vec4 texel = texture(colorTexture, v_textureCoordinates);

                if( maskColor.a < 0.0001){
                    // out_FragColor =color;
                    discard;
                    return;
                }

                #ifdef CZM_SELECTED_FEATURE
                    if(!czm_selected()) {
                        texel = vec4(0.);
                    }
                #endif

                vec3 luma = vec3(0.299, 0.587, 0.114);
                float v = dot(texel.xyz, luma);
                vec4 outputColor = vec4(defaultColor.rgb, defaultOpacity);
                float alpha = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v);
                out_FragColor = mix(outputColor, texel, alpha);
            }

        `
    })
    normalDepthPass.stage = maskStage;

    const blurStage1 = createBlurStage(name + 'Blur1', 3, 3,new Cartesian2(1.0, 0.0));
    const blurStage2 = createBlurStage(name + 'Blur2', 5, 5,new Cartesian2(0.0, 1.0));
    const blurStage3 = createBlurStage(name + 'Blur3', 7, 7,new Cartesian2(1.0, 0.0));
    const blurStage4 = createBlurStage(name + 'Blur4', 9, 9,new Cartesian2(0.0, 1.0));
    const blurStage5 = createBlurStage(name + 'Blur5', 11, 11,new Cartesian2(1.0, 0.0));

    const blurCompositeStage = new PostProcessStageComposite({
        name: name + "BlurComposite",
        stages: [maskStage,blurStage1,blurStage2,blurStage3,blurStage4,blurStage5],
        inputPreviousStageTexture: true
    })

    const addStage = new PostProcessStage({
        name: name + "Additive",
        uniforms: {
            maskTexture(){
                return normalDepthPass.texture
            },

            lineTexture: maskStage.name,
            blurTexture1: blurStage1.name,
            blurTexture2: blurStage2.name,
            blurTexture3: blurStage3.name,
            blurTexture4: blurStage4.name,
            blurTexture5: blurStage5.name,
            bloomStrength: 0.8,
            bloomRadius: 1.5,

            

            bloomFactors: [ 1.0, 0.8, 0.6, 0.4, 0.2 ],
            bloomTintColors: bloomTintColors,
        },
        fragmentShader: `

            #define NUM_MIPS 5

            in vec2 v_textureCoordinates;
            uniform sampler2D blurTexture1;
            uniform sampler2D blurTexture2;
            uniform sampler2D blurTexture3;
            uniform sampler2D blurTexture4;
            uniform sampler2D blurTexture5;
            uniform sampler2D colorTexture;
            uniform float bloomStrength;
            uniform float bloomRadius;
            uniform float bloomFactors[NUM_MIPS];
            uniform vec3 bloomTintColors[NUM_MIPS];
            uniform bool glowOnly;

            float lerpBloomFactor(const in float factor) {
                float mirrorFactor = 1.2 - factor;
                return mix(factor, mirrorFactor, bloomRadius);
            }

            void main() {

                vec4 color = texture(colorTexture, v_textureCoordinates);
                vec4 bloomColor = bloomStrength * (
                    lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.) * texture(blurTexture1, v_textureCoordinates) 
                    +
                    lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.) * texture(blurTexture2, v_textureCoordinates) +
                    lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.) * texture(blurTexture3, v_textureCoordinates) +
                    lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.) * texture(blurTexture4, v_textureCoordinates) +
                    lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.) * texture(blurTexture5, v_textureCoordinates)
                );

                out_FragColor = bloomColor + color;
            }
        `
    })

    const compositeStage = new PostProcessStageComposite({
        name: name + "Composite",
        stages: [blurCompositeStage,addStage],
        inputPreviousStageTexture: false
    })

    function defUniforms(obj) {
        Object.defineProperties(obj, {
            bloomTintColors: {
                get() {
                    return bloomTintColors;
                },
                set(val) {
                    bloomTintColors = val
                }
            },
            bloomStrength: {
                get() {
                    return bloomStrength
                },
                set(val) {
                    bloomStrength = val
                }
            },
            defaultColor: {
                get() {
                    return defaultColor;
                },
                set(val) {
                    defaultColor = val
                }
            }
        })
    }

    defUniforms(compositeStage)
    compositeStage._uniforms = compositeStage._uniforms || {};
    defUniforms(compositeStage._uniforms)
    return compositeStage;
}

