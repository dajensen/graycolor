import * as tf from '@tensorflow/tfjs'; 
import {makeCleanDir, getBmpFileList} from './FileSystemUtils'
import {loadBmp, saveBmp} from './BmpFileUtils'
import {abgrToGrayscale} from './ColorSpaceUtils'
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
    let colorValues = new Float32Array(batchSize * bmpWidth * bmpHeight * 3)
    let grayValues = new Float32Array(batchSize * bmpWidth * bmpHeight)

    let colorIdx = 0
    let grayIdx = 0

    let paths = reservoirSample(fileList, batchSize)

    paths.map((file)=>{
        // Read the rgb data from the file
        let {width: thisWidth, height: thisHeight, data: bmpData} = loadBmp(path.join(srcDir, file))
        if(thisWidth != bmpWidth || thisHeight != bmpHeight) {
            throw new Error("Dimensions don't match in " + file)
        }

        // Convert to grayscale
        let grayBuffer = abgrToGrayscale(bmpData, bmpWidth, bmpHeight)

        for(let i = 0; i < bmpWidth * bmpHeight * 3; i++) {
            colorValues[colorIdx++] = 1.0 * bmpData[i] / 255
        }
//        colorTensors.push(tf.tensor3d(colorFloats, [bmpHeight, bmpWidth, 3]))

        // Convert to floats
        for(let i = 0; i < bmpWidth * bmpHeight; i++) {
            grayValues[grayIdx++] = 1.0 * grayBuffer[i] / 255
        }
//        grayTensors.push(tf.tensor3d(grayFloats, [bmpHeight, bmpWidth, 1]))
    })
    return {
        names: paths, 
        color: tf.tensor4d(colorValues, [batchSize, bmpHeight, bmpWidth, 3]), 
        gray: tf.tensor(grayValues, [batchSize, bmpHeight, bmpWidth, 1])
    }
}

