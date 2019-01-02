import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';
const path = require('path');
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'
import {getRandomBatch} from './lib/TrainingUtils'
var argv = require('minimist')(process.argv.slice(2));

const imageWidth = 1024
const imageHeight = 768
const epochBatchSize = 10
const batchSize = 5
const epochCount = 10
const learnRate = 0.3
let trainThreshold = 0.07

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
