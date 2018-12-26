const fs = require('fs');
var rmrf = require('rimraf');

export function makeCleanDir(dir) {
    if(fs.existsSync(dir))
        rmrf.sync(dir)
    fs.mkdirSync(dir)
}

export function getBmpFileList(dir) {

    let files = fs.readdirSync(dir)

    return files.filter((item)=>{
        return item !== ".DS_Store"
    })
}
