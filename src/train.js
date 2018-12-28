import * as tf from '@tensorflow/tfjs'; 
import '@tensorflow/tfjs-node';
const path = require('path');
import {makeCleanDir} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'
import {splitTrainAndTestData, getRandomBatch} from './lib/TrainingUtils'
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
const testBatchSize = 3
const testGroups = 3

function createModel(imageWidth, imageHeight) {
    const model = tf.sequential();

    model.add(tf.layers.inputLayer({inputShape: [768, 1024, 1]}))
//    model.add(tf.layers.conv2d({filters: 1, kernelSize: 16, strides: 1, activation: 'relu', padding: 'same'}))
    model.add(tf.layers.conv2d({filters: 8, kernelSize: 8, strides: 1, activation: 'relu', padding: 'same'}))
    model.add(tf.layers.conv2d({filters: 4, kernelSize: 4, strides: 1, activation: 'relu', padding: 'same'}))
    model.add(tf.layers.dense({activation: 'relu', units: 4}))
    model.add(tf.layers.dense({activation: 'relu', units: 4}))
    model.add(tf.layers.dense({activation: 'relu', units: 2}))
    model.add(tf.layers.dense({activation: 'tanh', units: 2}))
    model.add(tf.layers.dense({activation: 'tanh', units: 2}))

    return model
}

async function trainBatch(model, colordir, trainFileList, groupNum) {
    let batch = getRandomBatch(colordir, trainFileList, epochBatchSize, imageWidth, imageHeight)
    console.log("Training Group " + groupNum)
    batch.names.map((item)=>{
        console.log(item)
    })
    await model.fit(batch.gray, batch.color, {batchSize: batchSize, epochs: epochCount})
    batch.gray.dispose()
    batch.color.dispose()
}

function predictColor(model, colordir, resultdir, filename, bmpWidth, bmpHeight) {
    let colorValues = new Float32Array(1 * bmpWidth * bmpHeight * 2)
    let grayValues = new Float32Array(1 * bmpWidth * bmpHeight)
    let newBmpData = new Uint8Array(4 * bmpWidth * bmpHeight)

    let {width: thisWidth, height: thisHeight, data: bmpData} = loadBmp(path.join(colordir, filename))

    // Convert to grayscale
    bmpToWorkingColorspace(bmpData, bmpWidth, bmpHeight, grayValues, 0, colorValues, 0, 255)
        
    let grayTensor = tf.tensor4d(grayValues, [1, bmpHeight, bmpWidth, 1])
    let predictedTensor = model.predict(grayTensor, {batchSize: 1})

    let rsp = predictedTensor.dataSync()
/*
    // This is a test that cuts out all of the inference, to see whether the bitmap save/restore code is correct.
    bmpFromWorkingColorspace(newBmpData, bmpWidth, bmpHeight, grayValues, colorValues, 255)
    for(let i = 0; i < 12; i++) {
        console.log("orig: " + bmpData[i], " new: " + newBmpData[i])
    }
*/
    bmpFromWorkingColorspace(newBmpData, bmpWidth, bmpHeight, grayValues, rsp, 255)

    saveColorBmp(path.join(resultdir, filename), bmpWidth, bmpHeight, newBmpData)
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

    makeCleanDir(bmpdir.Train)
    makeCleanDir(bmpdir.Test)
    makeCleanDir(bmpdir.Result)
    
    let {train: trainFileList, test: testFileList} = splitTrainAndTestData(bmpdir.Color, 0.25)
    console.log("training items: " + trainFileList.length)
    console.log("test items: " + testFileList.length)

    // Train
    for(let g = 0; g < trainingGroups; g++) {
        await trainBatch(model, bmpdir.Color, trainFileList, g)
        saveModel(model)
    }

    // Test
    for(let g = 0; g < testGroups; g++) {
        await testBatch(model, bmpdir.Color, testFileList, g)
    }

    testFileList.map((file)=>{
        predictColor(model, bmpdir.Color, bmpdir.Result, file, imageWidth, imageHeight)
    })
}
