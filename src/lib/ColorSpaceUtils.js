import { divStrict } from "@tensorflow/tfjs";
var cs = require("color-space");


// This (including the constants) is the luminance calculation for the YCrCb colorspace 
// In this case we only want the luminance value, so it saves code and makes this more efficient to NOT use any library for colorspaces.
function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b
}

function convertToYCbCr(r, g, b) {
    let Y = 0.299 * r + 0.587 * g + 0.114 * b
    let Cb = 128 - (0.168736 * r) - 0.331264 * g + 0.5 * b
    let Cr = 128 + (0.5 * r) - 0.418688 * g - 0.081312 * b

    return {Y, Cb, Cr}
}

function convertFromYCbCr(y, cb, cr) {
    let r = y + 1.402 * (cr - 128)
    let g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128)
    let b = y + 1.772 * (cb - 128)

    return {r, g, b}
}

// src is in abgr format - the rax pixel data from a 32- or 24-bpp bitmap as decoded by our bitap reader.
// The "divisor" parameter lets the output be scaled to the appropriate range.  In this case divisor should be 255 to put the result in the range 0..1
export function bmpToWorkingColorspace(src, width, height, yBuffer, yPos, colorBuffer, colorPos, scaleFactor) {
    let srcidx = 0
    let CbPos = colorPos
    let CrPos = colorPos + width * height

    while(srcidx < width * height * 4) {
        let r = src[srcidx + 3]
        let g = src[srcidx + 2]
        let b = src[srcidx + 1]
        // let a = src[srcidx]

        let hsl = cs.rgb.hsl([r, g, b])
/*
        // Check the math
        let tst = cs.hsl.rgb([hsl[0], hsl[1], hsl[2]])        
        let diff = {r: r - Math.floor(tst[0] + 0.1), g: g - Math.floor(tst[1] + 0.1), b: b - Math.floor(tst[2] + 0.1)}
        if(diff.r != 0 || diff.g != 0 || diff.b != 0)
            console.log("r: " + diff.r, " g: " + diff.g + " b: " + diff.b)
*/
        yBuffer[yPos++] = hsl[2] / scaleFactor
        colorBuffer[CbPos++] = hsl[0] / scaleFactor
        colorBuffer[CrPos++] = hsl[1] / scaleFactor
        srcidx += 4
    }
}

export function bmpFromWorkingColorspace(dst, width, height, yBuffer, colorBuffer, scaleFactor) {
    let srcidx = 0
    let dstidx = 0

    while(srcidx < width * height) {
        let l = yBuffer[srcidx] * scaleFactor
        let h = colorBuffer[srcidx] * scaleFactor
        let s = colorBuffer[srcidx + width * height] * scaleFactor

        let rgb = cs.hsl.rgb([h, s, l])

        dst[dstidx] = 0
        dst[dstidx + 1] = rgb[2]
        dst[dstidx + 2] = rgb[1]
        dst[dstidx + 3] = rgb[0]
        dstidx += 4
        srcidx++
    }
}
