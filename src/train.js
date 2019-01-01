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
const epochBatchSize = 10
const batchSize = 5
const epochCount = 10
const trainingGroups = 5
const testBatchSize = 1
const testGroups = 1

function createModel(imageWidth, imageHeight) {
    const model = tf.sequential();

    model.add(tf.layers.inputLayer({inputShape: [768, 1024, 1]}))
//    model.add(tf.layers.dense({activation: 'relu', units: 1, inputShape: [768, 1024, 1]}))
model.add(tf.layers.leakyReLU())
model.add(tf.layers.conv2d({filters: 4, kernelSize: 6, strides: 1, activation: 'tanh', padding: 'same'}))
    model.add(tf.layers.conv2d({filters: 4, kernelSize: 3, strides: 1, activation: 'tanh', padding: 'same'}))
//    model.add(tf.layers.conv2d({filters: 2, kernelSize: 2, strides: 1, activation: 'relu', padding: 'same'}))
//    model.add(tf.layers.dense({activation: 'relu', units: 4}))
//    model.add(tf.layers.dense({activation: 'relu', units: 2, kernelInitializer: 'randomUniform', biasInitializer: 'randomUniform'}))
model.add(tf.layers.dense({activation: 'tanh', units: 2, kernelInitializer: 'randomUniform', biasInitializer: 'randomUniform'}))
model.add(tf.layers.dense({activation: 'tanh', units: 2, kernelInitializer: 'randomUniform', biasInitializer: 'randomUniform'}))

    return model
}

async function trainBatch(model, colordir, trainFileList, groupNum) {
    let batch = getRandomBatch(colordir, trainFileList, epochBatchSize, imageWidth, imageHeight)
    console.log("Training Group " + groupNum)
    batch.names.map((item)=>{
        console.log(item)
    })

//    let grayvals = batch.gray.dataSync()
//    let colorvals = batch.color.dataSync()
//    printValues(8, grayvals, colorvals)

//    let rv = await model.fit(batch.gray, tf.ones([epochCount, imageHeight, imageWidth, 2]), {batchSize: batchSize, epochs: epochCount})
    let rv = await model.fit(batch.gray, batch.color, {batchSize: batchSize, epochs: epochCount})
    batch.gray.dispose()
    batch.color.dispose()
    return rv.history.loss[epochCount - 1]
}

function printValues(numValues, gray, color) {
    for(let i = 0; i < numValues; i++) {
        console.log("Val: " + gray[i] + ", " + color[2*i] + ", " + color[2*i + 1])
    }
}

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

async function saveModel(model) {
    return await model.save('file:///tmp/graycolor-model')
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
        model = createModel()
    }
    model.compile({optimizer: 'adam', loss: 'meanSquaredError', lr:0.3})
    model.summary();

    makeCleanDir(bmpdir.Result)
    
    let trainThreshold = 0.005
    let trainResult = 1.0
    let groupnum = 0

    // Train
    while(trainResult > trainThreshold) {
        trainResult = await trainBatch(model, bmpdir.Train, getBmpFileList(bmpdir.Train), groupnum++)

        if(trainResult >= 1.0 && groupnum > 0)
            return false

        saveModel(model)
    }
/*
    // Test
    for(let g = 0; g < testGroups; g++) {
        await testBatch(model, bmpdir.Color, testFileList, g)
    }
*/
    testFileList.map((file)=>{
        predictColor(model, bmpdir.Color, bmpdir.Result, file, imageWidth, imageHeight)
    })
    return true
}
