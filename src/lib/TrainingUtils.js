import * as tf from '@tensorflow/tfjs'; 
import {makeCleanDir, getBmpFileList} from './FileSystemUtils'
import {loadBmp, saveGrayscaleBmp} from './BmpFileUtils'
import {bmpToWorkingColorspace, bmpToWorkingColorspaceAe} from './ColorSpaceUtils'
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
        let j = getRandomIntInclusive(1, i)
        if(j < destLen) {
            dest[j] = src[i]
        }
    }

    return dest;
}

export function getRandomBatch(srcDir, fileList, batchSize, bmpWidth, bmpHeight) {
    let grayValues = new Float32Array(batchSize * bmpWidth * bmpHeight)
    let colorValues = new Float32Array(batchSize * bmpWidth * bmpHeight * 2)

    let colorIdx = 0
    let grayIdx = 0

    let paths = reservoirSample(fileList, batchSize)

    paths.map((file, bmpIdx)=>{
        // Read the rgb data from the file
        let {width: thisWidth, height: thisHeight, data: bmpData} = loadBmp(path.join(srcDir, file))
        if(thisWidth != bmpWidth || thisHeight != bmpHeight) {
            throw new Error("Dimensions don't match in " + file)
        }

        // Convert to grayscale
        bmpToWorkingColorspace(bmpData, bmpWidth, bmpHeight, 
            grayValues, bmpIdx * bmpWidth * bmpHeight, 
            colorValues, 2 * bmpIdx * bmpWidth * bmpHeight, 255)
    })

    return {
        names: paths, 
        color: tf.tensor4d(colorValues, [batchSize, bmpHeight, bmpWidth, 2]), 
        gray: tf.tensor4d(grayValues, [batchSize, bmpHeight, bmpWidth, 1])
    }
}

export function getRandomBatchAe(srcDir, fileList, batchSize, bmpWidth, bmpHeight, gridSize) {
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
        bmpToWorkingColorspaceAe(bmpData, bmpWidth, bmpHeight, outputValues, outputLoc, 255)


        // For now, input and output are exactly equal
        for(let i = 0; i < bmpWidth * bmpHeight * 3; i++)
            inputValues[outputLoc + i] = outputValues[outputLoc + i]
            
        discardColorLeaveGrid(inputValues, bmpWidth, bmpHeight, gridSize);
            
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
            // This row has pixels that should be kept
            for(let col = 0; col < bmpWidth; col++) {
                if((col % gridSize) != 0) {
                    bmpData[bmppos] = 0
                    bmpData[bmppos + 1] = 0    
                }
                bmppos += 3
            }    
        }
        else {
            // This row should be entirely discarded
            for(let col = 0; col < bmpWidth; col++) {
                bmpData[bmppos] = 0
                bmpData[bmppos + 1] = 0
                bmppos += 3
            }
        }
    }
}