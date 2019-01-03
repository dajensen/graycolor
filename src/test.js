import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';
const path = require('path');
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'
import {getRandomBatch} from './lib/TrainingUtils'
var argv = require('minimist')(process.argv.slice(2));

// Only for predicting.  This will be extracted later.
import {loadBmp, saveColorBmp} from './lib/BmpFileUtils'
import {bmpToWorkingColorspace, bmpFromWorkingColorspace} from './lib/ColorSpaceUtils'


const imageWidth = 1024
const imageHeight = 768
const testBatchSize = 1
const testGroups = 1

function predictColor(model, colordir, resultdir, filename, bmpWidth, bmpHeight) {
    let colorValues = new Float32Array(2 * bmpWidth * bmpHeight)
    let grayValues = new Float32Array(1 * bmpWidth * bmpHeight)
    let origBmpData = new Uint8Array(4 * bmpWidth * bmpHeight)
    let newBmpData = new Uint8Array(4 * bmpWidth * bmpHeight)

    let {width: thisWidth, height: thisHeight, data: bmpData} = loadBmp(path.join(colordir, filename))

    // Convert to grayscale
    bmpToWorkingColorspace(bmpData, bmpWidth, bmpHeight, grayValues, 0, colorValues, 0, 255)
        
    let grayTensor = tf.tensor4d(grayValues, [1, bmpHeight, bmpWidth, 1])
    let predictedTensor = model.predict(grayTensor, {batchSize: 1})

    let rsp = predictedTensor.dataSync()

    // This is a test that cuts out all of the inference, to see whether the bitmap save/restore code is correct.
    bmpFromWorkingColorspace(origBmpData, bmpWidth, bmpHeight, grayValues, colorValues, 255)
    saveColorBmp(path.join(resultdir, filename + ".o.bmp"), bmpWidth, bmpHeight, origBmpData)

    // This is the actual conversion based on inference
    bmpFromWorkingColorspace(newBmpData, bmpWidth, bmpHeight, grayValues, rsp, 255)
    saveColorBmp(path.join(resultdir, filename), bmpWidth, bmpHeight, newBmpData)

    printPixels(8, grayValues, colorValues, rsp, bmpWidth, bmpHeight)
}

function printPixels(numToPrint, grayValues, colorValues, predictedValues, bmpWidth, bmpHeight) {
    console.log("============================")
    for(let i = 0; i < numToPrint; i++) {
        console.log("hsl Orig: " + colorValues[2 * i] + "," + colorValues[2 * i + 1] +
                    "    hsl New: " + predictedValues[2 * i] + "," + predictedValues[2 * i + 1])
    }
}


async function testBatch(model, colordir, testFileList, groupNum) {
    console.dir(testFileList)
    let batch = getRandomBatch(colordir, testFileList, testBatchSize, imageWidth, imageHeight)
    console.log("Testing Group " + groupNum)
    await model.evaluate(batch.gray, batch.color, {batchSize: testBatchSize, epochs: 1})
    batch.gray.dispose()
    batch.color.dispose()
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
    model.compile({optimizer: 'adam', loss: 'meanSquaredError', lr:0.3})
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
