import { divStrict } from "@tensorflow/tfjs";


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

export function abgrToGrayscale(src, width, height) {
    let srcidx = 0
    let dstidx = 0
    let dst = Buffer.alloc(src.length / 4)  // one byte per pixel in grayscale

    while(srcidx < width * height * 4) {
        // Invert the order of r,g,b
        // and throw away the alpha channel
        dst[dstidx] = luminance(src[srcidx + 3], src[srcidx + 2], src[srcidx + 1])

        srcidx += 4
        dstidx ++
    }
    return dst
}

// src is in abgr format - the rax pixel data from a 32- or 24-bpp bitmap as decoded by our bitap reader.
// The "divisor" parameter lets the output be scaled to the appropriate range.  In this case divisor should be 255 to put the result in the range 0..1
export function abgrToYCbCr(src, width, height, yBuffer, yPos, colorBuffer, colorPos, scaleFactor) {
    let srcidx = 0
    let CbPos = colorPos
    let CrPos = colorPos + width * height

    while(srcidx < width * height * 4) {
        let r = src[srcidx + 3]
        let g = src[srcidx + 2]
        let b = src[srcidx + 1]
        // let a = src[srcidx]

        let {Y, Cb, Cr} = convertToYCbCr(r, g, b)

        // Check the math
        let tst = convertFromYCbCr(Y, Cb, Cr)
        let diff = {r: r - Math.floor(tst.r + 0.1), g: g - Math.floor(tst.g + 0.1), b: b - Math.floor(tst.b + 0.1)}
        if(diff.r != 0 || diff.g != 0 || diff.b != 0)
            console.log("r: " + diff.r, " g: " + diff.g + " b: " + diff.b)

        yBuffer[yPos++] = Y / scaleFactor
        colorBuffer[CbPos++] = Cb / scaleFactor
        colorBuffer[CrPos++] = Cr / scaleFactor
        srcidx += 4
    }
}

export function YCbCrToAbgr(dst, width, height, yBuffer, colorBuffer, scaleFactor) {
    let srcidx = 0
    let dstidx = 0

    while(srcidx < width * height) {
        let y = yBuffer[srcidx] * scaleFactor
        let cb = colorBuffer[srcidx] * scaleFactor
        let cr = colorBuffer[srcidx + width * height] * scaleFactor

        let {r, g, b} = convertFromYCbCr(y, cb, cr)

        dst[dstidx] = 0
        dst[dstidx + 1] = b
        dst[dstidx + 2] = g
        dst[dstidx + 3] = r
        dstidx += 4
        srcidx++
    }
}
