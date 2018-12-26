

// This (including the constants) is the luminance calculation for the YCrCb colorspace 
// In this case we only want the luminance value, so it saves code and makes this more efficient to NOT use any library for colorspaces.
function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b
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
