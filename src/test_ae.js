import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';
const path = require('path');
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'
import {getRandomBatchAe, discardColorLeaveGrid} from './lib/TrainingUtils'
var argv = require('minimist')(process.argv.slice(2));

// Only for predicting.  This will be extracted later.
import {loadBmp, saveColorBmp} from './lib/BmpFileUtils'
import {bmpToWorkingColorspaceAe, bmpFromWorkingColorspaceAe} from './lib/ColorSpaceUtils'


const imageWidth = 1024
const imageHeight = 768
const testBatchSize = 1
const testGroups = 1
const learnRate = 0.3
const gridSize = 10


function predictColor(model, colordir, resultdir, filename, bmpWidth, bmpHeight) {
    let inputValues = new Float32Array(3 * bmpWidth * bmpHeight)
    let outputValues = new Float32Array(3 * bmpWidth * bmpHeight)
    let origBmpData = new Uint8Array(4 * bmpWidth * bmpHeight)
    let newBmpData = new Uint8Array(4 * bmpWidth * bmpHeight)

    let {width: thisWidth, height: thisHeight, data: bmpData} = loadBmp(path.join(colordir, filename))

    // Convert to grayscale
    bmpToWorkingColorspaceAe(bmpData, bmpWidth, bmpHeight, inputValues, 0, 255)
//    discardColorLeaveGrid(inputValues, bmpWidth, bmpHeight, gridSize)
        
    let inputTensor = tf.tensor4d(inputValues, [1, bmpHeight, bmpWidth, 3])
    let predictedTensor = model.predict(inputTensor, {batchSize: 1})

    let rsp = predictedTensor.dataSync()

    // This is a test that cuts out all of the inference, to see whether the bitmap save/restore code is correct.
    bmpFromWorkingColorspaceAe(origBmpData, bmpWidth, bmpHeight, inputValues, 255)
    saveColorBmp(path.join(resultdir, filename + ".o.bmp"), bmpWidth, bmpHeight, origBmpData)

    // This is a test that uses the inference, but adds back the luminosity values from the original data
    let i = 0
    while (i < bmpWidth * bmpHeight * 3) {
        outputValues[i] = rsp[i]
        outputValues[i+1] = rsp[i + 1]
        outputValues[i+2] = inputValues[i + 2]
        i += 3
    }
    bmpFromWorkingColorspaceAe(origBmpData, bmpWidth, bmpHeight, outputValues, 255)
    saveColorBmp(path.join(resultdir, filename + ".r.bmp"), bmpWidth, bmpHeight, origBmpData)
    
    // This is the actual conversion using only inference
    bmpFromWorkingColorspaceAe(newBmpData, bmpWidth, bmpHeight, rsp, 255)
    saveColorBmp(path.join(resultdir, filename), bmpWidth, bmpHeight, newBmpData)

    printPixels(24, inputValues, rsp, bmpWidth, bmpHeight)
}

function printPixels(numToPrint, origValues, predictedValues) {
    console.log("============================")
    for(let i = 0; i < numToPrint; i++) {
        console.log(origValues[i] + "  " + predictedValues[i])
    }
}


async function testBatch(model, colordir, testFileList, groupNum) {
    console.dir(testFileList)
    let batch = getRandomBatchAe(colordir, testFileList, testBatchSize, imageWidth, imageHeight, gridSize)
    console.log("Testing Group " + groupNum)
    await model.evaluate(batch.input, batch.output, {batchSize: testBatchSize, epochs: 1})
    batch.input.dispose()
    batch.output.dispose()
}

async function restoreModel(path) {
    console.log("Loading: " + path)
    return await tf.loadModel(path)
} 



// **********************************************************************
// MAIN ENTRY POINT IS HERE
// **********************************************************************
console.dir(argv)
// You can do node compiled/train --model=/tmp/grayscale-model/
// minimist will parse that into {model='/tmp/grayscale-model/'}
doMain(argv)

async function doMain(args) {
    
    let model = null
    if(argv['model']) {
        model = await restoreModel('file://' + path.join(argv['model'], 'model.json'))
    }
    else {
        throw new Error("Testing requires a trained model.\nTypical Usage: node src/test.js --model=/tmp/graycolor-model")
    }
    model.compile({optimizer: 'adam', loss: 'meanSquaredError', lr:learnRate})
    model.summary();

    makeCleanDir(bmpdir.Result)

    let testFileList = getBmpFileList(bmpdir.Test)

    // Test
    for(let g = 0; g < testGroups; g++) {
        await testBatch(model, bmpdir.Test, testFileList, g)
    }

    // Generate images
    testFileList.map((file)=>{
        predictColor(model, bmpdir.Color, bmpdir.Result, file, imageWidth, imageHeight)
    })
    return true
}
