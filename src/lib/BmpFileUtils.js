const bmp = require('bmp-js')
const fs = require('fs');
const encode = require('./GrayscaleBmpEncoder')

function grayscalePalette() {
    let pal = Buffer.alloc(256 * 4)
    for(let idx = 0; idx < 256; idx++) {
        pal.writeUInt8(idx, idx * 4)
        pal.writeUInt8(idx, idx * 4 + 1)
        pal.writeUInt8(idx, idx * 4 + 2)
        pal.writeUInt8(0,   idx * 4 + 3)
    }
    return pal
}

export function loadBmp(filename) {
    let bmpBuffer = fs.readFileSync(filename)
    var bmpData = bmp.decode(bmpBuffer)

    return {width: bmpData.width, height: bmpData.height, data: bmpData.data}
}

export function saveGrayscaleBmp(filename, width, height, data) {

    var newDataBuffer = encode({width: width, height: height, data: data, planes: 1, bpp: 8, palette: grayscalePalette()})

    fs.writeFileSync(filename, newDataBuffer.data)
}

export function saveColorBmp(filename, width, height, data) {

    // THIS IS A LIE!
    // The bitmap encoder is wrong.  We say 24bpp, but actually it's taking the data in 32bpp format.  EVIL!  FIX!
    var newDataBuffer = encode({width: width, height: height, data: data, planes: 1, bpp: 24})

    fs.writeFileSync(filename, newDataBuffer.data)
}
