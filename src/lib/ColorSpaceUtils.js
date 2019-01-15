import { divStrict } from "@tensorflow/tfjs";
var cs = require("color-space");


export function bmpToHSLWorking(src, width, height, colorBuffer, colorPos, scaleFactor) {
    let srcidx = 0

    while(srcidx < width * height * 4) {
        let r = src[srcidx + 3]
        let g = src[srcidx + 2]
        let b = src[srcidx + 1]
        // let a = src[srcidx]

        let hsl = cs.rgb.hsl([r, g, b])

        colorBuffer[colorPos] = hsl[0] / 360
        colorBuffer[colorPos + 1] = hsl[1] / 100
        colorBuffer[colorPos + 2] = hsl[2] / 100
        colorPos += 3
        srcidx += 4
    }
}

export function bmpFromHSLWorking(dst, width, height, colorBuffer, scaleFactor) {
    let srcidx = 0
    let dstidx = 0

    while(srcidx < width * height) {
        let h = colorBuffer[3 * srcidx] * 360
        let s = colorBuffer[3 * srcidx + 1] * 100
        let l = colorBuffer[3 * srcidx + 2] * 100

        let rgb = cs.hsl.rgb([h, s, l])

        dst[dstidx] = 0
        dst[dstidx + 1] = rgb[2]
        dst[dstidx + 2] = rgb[1]
        dst[dstidx + 3] = rgb[0]
        dstidx += 4
        srcidx++
    }
}
