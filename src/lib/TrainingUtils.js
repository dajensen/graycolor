import * as tf from '@tensorflow/tfjs'; 
import {getBmpFileList} from './FileSystemUtils'
import {loadBmp, saveGrayscaleBmp} from './BmpFileUtils'
import {bmpToHSLWorking} from './ColorSpaceUtils'
const path = require('path');


export function splitTrainAndTestData(srcDir, pctTest) {
    let train = []
    let test = []

    getBmpFileList(srcDir).map((item)=>{
        if(Math.random() < pctTest)
            test.push(item)
        else
            train.push(item)
    })

    return {train: train, test: test}
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}

function reservoirSample(src, destLen) {
    let dest = []
    for(let x = 0; x < destLen; x++) {
        dest[x] = src[x]
    }

    for(let i = destLen; i < src.length; i++) {
        let j = getRandomIntInclusive(0, i)
        if(j < destLen) {
            dest[j] = src[i]
        }
    }

    return dest;
}

export function getRandomBatch(srcDir, fileList, batchSize, bmpWidth, bmpHeight, gridSize) {
    let outputValues = new Float32Array(batchSize * bmpWidth * bmpHeight * 3)
    let inputValues = new Float32Array(batchSize * bmpWidth * bmpHeight * 3)

    let colorIdx = 0
    let grayIdx = 0

    let paths = reservoirSample(fileList, batchSize)

    paths.map((file, bmpIdx)=>{
        // Read the rgb data from the file
        let {width: thisWidth, height: thisHeight, data: bmpData} = loadBmp(path.join(srcDir, file))
        if(thisWidth != bmpWidth || thisHeight != bmpHeight) {
            throw new Error("Dimensions don't match in " + file)
        }

        let outputLoc = 3 * bmpIdx * bmpWidth * bmpHeight

        // Convert to grayscale
        bmpToHSLWorking(bmpData, bmpWidth, bmpHeight, outputValues, outputLoc)

        // Input and output are exactly equal because we're training an autoencoder
        for(let i = 0; i < bmpWidth * bmpHeight * 3; i++)
            inputValues[outputLoc + i] = outputValues[outputLoc + i]            
    })

    return {
        names: paths, 
        input: tf.tensor4d(inputValues, [batchSize, bmpHeight, bmpWidth, 3]), 
        output: tf.tensor4d(outputValues, [batchSize, bmpHeight, bmpWidth, 3]), 
    }
}

export function discardColorLeaveGrid(bmpData, bmpWidth, bmpHeight, gridSize) {
    for(let row = 0; row < bmpHeight; row++) {
        let bmppos = row * bmpWidth * 3
        if((row % gridSize) == 0) {
            let h = 0
            let s = 0
            // This row has pixels that should be kept
            for(let col = 0; col < bmpWidth; col++) {
                if((col % gridSize) != 0) {
                    bmpData[bmppos] = h
                    bmpData[bmppos + 1] = s    
                }
                else {
                    h = bmpData[bmppos]
                    s = bmpData[bmppos + 1]
                }
                bmppos += 3
            }    
        }
        else {
            // This row should be entirely discarded
            for(let col = 0; col < bmpWidth; col++) {
//                bmpData[bmppos] = 0
//                bmpData[bmppos + 1] = 0
                bmpData[bmppos] = bmpData[bmppos - bmpWidth * 3]
                bmpData[bmppos + 1] = bmpData[bmppos - bmpWidth * 3 + 1]
                bmppos += 3
            }
        }
    }
}

export function discardColorFillGrid(bmpData, bmpWidth, bmpHeight, gridSize) {
    if((gridSize % 1) == 1) {
        throw new Error("For performance reasons, this function only works with odd sized grids")
    }
    const marginToCenter = Math.floor(gridSize / 2)
    const upperLeftToCenter = 3 * (bmpWidth * marginToCenter + marginToCenter)

    for(let row = 0; row + gridSize < bmpHeight; row += gridSize) {
        for (let col = 0; col + gridSize < bmpWidth; col += gridSize) {
            // This copies one grid cell
            let pos = 3 * (row * bmpWidth + col)
            let centerpos = pos + upperLeftToCenter
            let centerH = bmpData[centerpos]
            let centerS = bmpData[centerpos + 1]
            for(let i = 0; i < gridSize; i++) {
                for(let j = 0; j < gridSize; j++) {
                    bmpData[pos + 3*(i + j*bmpWidth)] = centerH
                    bmpData[pos + 3*(i + j*bmpWidth) + 1] = centerS
                }
            }
        }

        // Mop up partial grid cel

    }

    // Mop up partial rows

    // Corner is both partial row and partial column

}