
import { parseDefines } from './parseDefines.js';
import * as Cesium from 'cesium';

const _shadersSeparableBlur = "\n\
in vec2 v_textureCoordinates;\n\
uniform sampler2D colorTexture;\n\
uniform vec2 colorTextureDimensions;\n\
uniform vec2 direction;\n\
\n\
float gaussianPdf(in float x, in float sigma) {\n\
    return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;\n\
}\n\
void main() {\
    vec2 invSize = 1.0 / colorTextureDimensions;\
    float fSigma = float(SIGMA);\
    float weightSum = gaussianPdf(0.0, fSigma);\
    vec3 diffuseSum = texture( colorTexture, v_textureCoordinates).rgb * weightSum;\
    for( int i = 1; i < KERNEL_RADIUS; i ++ ) {\
        float x = float(i);\
        float w = gaussianPdf(x, fSigma);\
        vec2 uvOffset = direction * invSize * x;\
        vec3 sample1 = texture( colorTexture, v_textureCoordinates + uvOffset).rgb;\
        vec3 sample2 = texture( colorTexture, v_textureCoordinates - uvOffset).rgb;\
        diffuseSum += (sample1 + sample2) * w;\
        weightSum += 2.0 * w;\
    }\
    out_FragColor = vec4(diffuseSum/weightSum, 1.0);\
}";

/**
 * 
 * @param {string} name 
 * @param {number} sigma 
 * @param {number} kernelRadius 
 */
export default function createBlurStage(name, sigma, kernelRadius,blurDirection) {

    const { PostProcessStage, PostProcessStageSampleMode } = Cesium;


    let separableBlurShader = {
        defines: {
            "KERNEL_RADIUS": kernelRadius,
            "SIGMA":sigma
        },
        fragmentShader: _shadersSeparableBlur
    };
    parseDefines(separableBlurShader);

    let separableBlur = new PostProcessStage({
        name: name + "direction",
        fragmentShader: separableBlurShader.fragmentShader,
        forcePowerOfTwo: true,
        uniforms: {
            kernelRadius: kernelRadius,
            sigma:sigma,
            direction: blurDirection
        },
        sampleMode: PostProcessStageSampleMode.LINEAR
    });

    return separableBlur;
}