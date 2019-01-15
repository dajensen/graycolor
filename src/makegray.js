const path = require('path');
import {loadBmp, saveGrayscaleBmp} from './lib/BmpFileUtils'
import {bmpToWorkingColorspace} from './lib/ColorSpaceUtils'
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
        let pos = 3 * (bmpWidth * i * gridSize + upperLeftToCenter)
        for(let j = 0; j < samplesPerRow; j++) {
            let hsl = cs.rgb.hsl([
                bmpData[pos + 3], 
                bmpData[pos + 2], 
                bmpData[pos + 1]])
            if(i < 10 && j < 10)
                console.log("h: " + hsl[0] + " s: " + hsl[1])

            clrValues[clrPos] = hsl[0]
            clrValues[clrPos + 1] = hsl[1]
            clrPos += 2
            pos += 3 * gridSize
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

    let colorValues = new Float32Array(1 * bmpWidth * bmpHeight * 2)
    let grayValues = new Uint8Array(1 * bmpWidth * bmpHeight)
    
    bmpToWorkingColorspace(bmpData, bmpWidth, bmpHeight, 
        grayValues, 0, colorValues, 0, 1)

    saveGrayscaleBmp(path.join(bmpdir.Grayscale, file), bmpWidth, bmpHeight, grayValues)
    saveGrayscaleGrid(path.join(bmpdir.Grayscale, file + '.gray.bin'), bmpWidth, bmpHeight, grayValues)
    saveColorGrid(path.join(bmpdir.Grayscale, file + '.clr.bin'), bmpWidth, bmpHeight, bmpData, gridSize)
})
console.log("Done.")
