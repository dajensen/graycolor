import * as tf from '@tensorflow/tfjs'; 
import '@tensorflow/tfjs-node';
const path = require('path');
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'
import {splitTrainAndTestData, getRandomBatch} from './lib/TrainingUtils'
var argv = require('minimist')(process.argv.slice(2));

const imageWidth = 1024
const imageHeight = 768
const epochBatchSize = 20
const batchSize = 5
const epochCount = 5
const trainingGroups = 20

function createModel(imageWidth, imageHeight) {
    const model = tf.sequential();

    model.add(tf.layers.inputLayer({inputShape: [768, 1024, 1]}))
//    model.add(tf.layers.conv2d({filters: 4, kernelSize: 16, strides: 1, activation: 'relu', padding: 'same'}))
    model.add(tf.layers.conv2d({filters: 4, kernelSize: 8, strides: 1, activation: 'relu', padding: 'same'}))
    model.add(tf.layers.conv2d({filters: 4, kernelSize: 4, strides: 1, activation: 'relu', padding: 'same'}))
    model.add(tf.layers.dense({activation: 'relu', units: 3}))
    model.add(tf.layers.dense({activation: 'tanh', units: 3}))

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

async function restoreModel(path) {
    console.log("Loading: " + path)
    return await tf.loadModel(path)
} 

async function saveModel(model) {
    return await model.save('file:///tmp/grayscale-model')
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
    model.compile({optimizer: 'sgd', loss: 'meanSquaredError', lr:0.3})
    model.summary();

    makeCleanDir(bmpdir.Train)
    makeCleanDir(bmpdir.Test)
    makeCleanDir(bmpdir.Result)
    
    let {train: trainFileList, test: testFileList} = splitTrainAndTestData(bmpdir.Color, 0.25)
    console.log("training items: " + trainFileList.length)
    console.log("test items: " + testFileList.length)

    for(let g = 0; g < trainingGroups; g++) {
        await trainBatch(model, bmpdir.Color, trainFileList, g)
        saveModel(model)
    }
}
