const path = require('path');
import {loadBmp, saveGrayscaleBmp} from './lib/BmpFileUtils'
import {abgrToGrayscale} from './lib/ColorSpaceUtils'
import {makeCleanDir, getBmpFileList} from './lib/FileSystemUtils'
import bmpdir from './lib/Directories'

makeCleanDir(bmpdir.Grayscale)

getBmpFileList(bmpdir.Color).map((file)=>{
    let {width: bmpWidth, height: bmpHeight, data: bmpData} = loadBmp(path.join(bmpdir.Color, file))
    let grayBuffer = abgrToGrayscale(bmpData, bmpWidth, bmpHeight)
    saveGrayscaleBmp(path.join(bmpdir.Grayscale, file), bmpWidth, bmpHeight, grayBuffer)
})
