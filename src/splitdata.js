const path = require('path');
const fs = require('fs')
import {splitTrainAndTestData} from './lib/TrainingUtils'
import {makeCleanDir} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'

makeCleanDir(bmpdir.Train)
makeCleanDir(bmpdir.Test)

let {train: trainFileList, test: testFileList} = splitTrainAndTestData(bmpdir.Color, 0.25)
console.log("training items: " + trainFileList.length)
console.log("test items: " + testFileList.length)

trainFileList.map((item)=>{
    fs.copyFileSync(path.join(bmpdir.Color, item), path.join(bmpdir.Train, item))
})

testFileList.map((item)=>{
    fs.copyFileSync(path.join(bmpdir.Color, item), path.join(bmpdir.Test, item))
})
