const path = require('path');
import {loadBmp, saveGrayscaleBmp} from './lib/BmpFileUtils'
import {bmpToWorkingColorspace} from './lib/ColorSpaceUtils'
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'

makeCleanDir(bmpdir.Grayscale)

getBmpFileList(bmpdir.Color).map((file)=>{
    let {width: bmpWidth, height: bmpHeight, data: bmpData} = loadBmp(path.join(bmpdir.Color, file))

    let colorValues = new Float32Array(1 * bmpWidth * bmpHeight * 2)
    let grayValues = new Uint8Array(1 * bmpWidth * bmpHeight)
    
    bmpToWorkingColorspace(bmpData, bmpWidth, bmpHeight, 
        grayValues, 0, colorValues, 0, 1)

    saveGrayscaleBmp(path.join(bmpdir.Grayscale, file), bmpWidth, bmpHeight, grayValues)
})
