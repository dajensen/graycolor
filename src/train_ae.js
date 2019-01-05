//****************************************************************************************************
// Trying a different approach - this is an autoencoder that I'll
// refine by randomizing the top layer and then training with less color data
// until I figure out how little color data I can provide and still get the right output.
//****************************************************************************************************

import * as tf from '@tensorflow/tfjs';
require ('@tensorflow/tfjs-node-gpu') || require ('@tensorflow/tfjs-node')
const path = require('path');
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'
import {getRandomBatchAe} from './lib/TrainingUtils'
var argv = require('minimist')(process.argv.slice(2));

const imageWidth = 1024
const imageHeight = 768
const epochBatchSize = 10
const batchSize = 5
const epochCount = 10
const learnRate = 0.3           // Can go down to .05 and maybe even .01.  Needs to go down as the cost function decreases.
let trainThreshold = 0.0001
const gridSize = 2

function createModel(imageWidth, imageHeight) {
    const model = tf.sequential();

model.add(tf.layers.inputLayer({inputShape: [768, 1024, 3]}))
model.add(tf.layers.conv2d({filters: 3, kernelSize: 8, strides: 1, padding: 'same', activation: 'tanh'}))
model.add(tf.layers.conv2d({filters: 3, kernelSize: 4, strides: 1, padding: 'same', activation: 'relu'}))
model.add(tf.layers.dense({activation: 'relu', units: 3, kernelInitializer: 'randomUniform', biasInitializer: 'randomUniform'}))
model.add(tf.layers.dense({activation: 'relu', units: 3, kernelInitializer: 'randomUniform', biasInitializer: 'randomUniform'}))
model.add(tf.layers.dense({activation: 'tanh', units: 3, kernelInitializer: 'randomUniform', biasInitializer: 'randomUniform'}))

    return model
}

async function trainBatch(model, colordir, trainFileList, groupNum) {
    let batch = getRandomBatchAe(colordir, trainFileList, epochBatchSize, imageWidth, imageHeight, gridSize)
    console.log("Training Group " + groupNum)
    batch.names.map((item)=>{
        console.log(item)
    })

//    let grayvals = batch.gray.dataSync()
//    let colorvals = batch.color.dataSync()
//    printValues(8, grayvals, colorvals)

//    let rv = await model.fit(batch.gray, tf.ones([epochCount, imageHeight, imageWidth, 2]), {batchSize: batchSize, epochs: epochCount})
    let rv = await model.fit(batch.input, batch.output, {batchSize: batchSize, epochs: epochCount})
    batch.input.dispose()
    batch.output.dispose()
    return rv.history.loss[epochCount - 1]
}

function printValues(numValues, gray, color) {
    for(let i = 0; i < numValues; i++) {
        console.log("Val: " + gray[i] + ", " + color[2*i] + ", " + color[2*i + 1])
    }
}

function printPixels(numToPrint, grayValues, colorValues, predictedValues, bmpWidth, bmpHeight) {
    console.log("============================")
    for(let i = 0; i < numToPrint; i++) {
        console.log("hsl Orig: " + colorValues[2 * i] + "," + colorValues[2 * i + 1] +
                    "    hsl New: " + predictedValues[2 * i] + "," + predictedValues[2 * i + 1])
    }
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
    model.compile({optimizer: 'adam', loss: 'meanSquaredError', lr:learnRate})
    model.summary();

    makeCleanDir(bmpdir.Result)
    
    let trainResult = 1.0
    let groupnum = 0

    // Train
    while(trainResult > trainThreshold) {
        trainResult = await trainBatch(model, bmpdir.Train, getBmpFileList(bmpdir.Train), groupnum++)

        if(trainResult >= 1.0 && groupnum > 0)
            throw new Error("Looks like the model is NOT TRAINING")

        saveModel(model)
    }
    return true
}
