const path = require('path');
import {loadBmp, saveGrayscaleBmp} from './lib/BmpFileUtils'
import {bmpToHSLWorking} from './lib/ColorSpaceUtils'
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'
let fs = require('fs')
var cs = require("color-space");

const gridSize = 9

function saveColorGrid(filename, bmpWidth, bmpHeight, bmpData, gridSize) {
    const samplesPerRow = Math.floor(bmpWidth / gridSize)
    const samplesPerCol = Math.floor(bmpHeight / gridSize)
    const marginToCenter = Math.floor(gridSize / 2)
    const upperLeftToCenter = bmpWidth * marginToCenter + marginToCenter
    let clrValues = new Uint8Array(2 * samplesPerRow * samplesPerCol)
    let clrPos = 0

    for(let i = 0; i < samplesPerCol; i++) {
        let pos = 4 * i * gridSize * bmpWidth + 4 * marginToCenter
        for(let j = 0; j < samplesPerRow; j++) {
            let hsl = cs.rgb.hsl([
                bmpData[pos + 3],   // Red
                bmpData[pos + 2],   // Green
                bmpData[pos + 1]   // Blue
            ])

            clrValues[clrPos] = hsl[0] * 255 / 360; // scale hue to 0-255
            clrValues[clrPos + 1] = hsl[1] * 255 / 100; // scale saturation to 0-255

            if(i < 10 && j < 10)
                console.log("h: " + clrValues[clrPos] + " s: " + clrValues[clrPos + 1])

            clrPos += 2
            pos += 4 * gridSize
        }
    }
    fs.writeFileSync(filename, clrValues)
}

function saveGrayscaleGrid(filename, bmpWidth, bmpHeight, bmpData) {
    fs.writeFileSync(filename, bmpData)
}



// ****************************************************************
// Entry point here
// ****************************************************************

makeCleanDir(bmpdir.Grayscale)

getBmpFileList(bmpdir.Color).map((file)=>{
    let {width: bmpWidth, height: bmpHeight, data: bmpData} = loadBmp(path.join(bmpdir.Color, file))
    let colorValues = new Float32Array(1 * bmpWidth * bmpHeight * 3)
    
    bmpToHSLWorking(bmpData, bmpWidth, bmpHeight, colorValues, 0)

    let grayValues = new Uint8Array(bmpWidth * bmpHeight)
    for(let i = 0; i < bmpWidth * bmpHeight; i++) {
        grayValues[i] = colorValues[i * 3 + 2] * 255
    }
    saveGrayscaleBmp(path.join(bmpdir.Grayscale, file), bmpWidth, bmpHeight, grayValues)

    saveGrayscaleGrid(path.join(bmpdir.Grayscale, file + '.gray.bin'), bmpWidth, bmpHeight, grayValues)
    saveColorGrid(path.join(bmpdir.Grayscale, file + '.clr.bin'), bmpWidth, bmpHeight, bmpData, gridSize)
})
console.log("Done.")
