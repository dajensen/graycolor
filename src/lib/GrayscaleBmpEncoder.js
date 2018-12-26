/**
 * @author shaozilee
 *
 * BMP format encoder,encode 24bit BMP
 * Not support quality compression
 *
 */

 // DAJ - Took this file from bmp-js and added support for 8bpp, single plane bitmaps.
 // It only supported encoding 24 bpp bitmaps, which wasn't enough.  I needed those grayscale images.
 // I'll put this back into bmp-js and submit a pull request so the (minor, but useful) work gets shared.

function BmpEncoder(imgData){

    if(typeof(imgData.planes) === 'undefined')
        imgData.planes = 1

    if(typeof(imgData.bpp) == 'undefined')
        imgData.bpp = 24

    // Only 1 plane for now
    if(imgData.planes != 1)
        throw new Error("BmpEncoder only supports single plane bitmaps")

    // Only 8 and 24 bpp formats
    if(imgData.bpp != 24 && imgData.bpp != 8)
        throw new Error("BmpEncoder only supports 8 and 24 bpp bitmaps")

    // 8bpp formats require a palette
    if(imgData.bpp == 8 && !imgData.palette)
        throw new Error("BmpEncoder require a palette for 8bpp images")

    this.palette = imgData.palette;
	this.buffer = imgData.data;
	this.width = imgData.width;
	this.height = imgData.height;
	this.extraBytes = this.width%4;
    this.rgbSize = this.height*((imgData.bpp / 8 * imgData.planes)*this.width+this.extraBytes);
    this.fileheaderSize = 14;
    this.headerInfoSize = 40;

    this.data = [];
        
    this.bmiColorsSize = (imgData.bpp == 24 ? 0 : 256 * 4)      // 256 RGBQUAD elements for the palette in an 8bpp image

	/******************header***********************/
	this.flag = "BM";
	this.reserved = 0;
	this.offset = this.fileheaderSize + this.headerInfoSize + this.bmiColorsSize;
	this.fileSize = this.rgbSize+this.offset;
	this.planes = imgData.planes;
	this.bitPP = imgData.bpp;
	this.compress = 0;
	this.hr = 0;
	this.vr = 0;
	this.colors = 0;
	this.importantColors = 0;
}

BmpEncoder.prototype.encode = function() {
	var tempBuffer = Buffer.alloc(this.offset+this.rgbSize);
    this.pos = 0;
    
    // Write the BITMAPFILEHEADER
	tempBuffer.write(this.flag,this.pos,2);this.pos+=2;
	tempBuffer.writeUInt32LE(this.fileSize,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.reserved,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.offset,this.pos);this.pos+=4;

    // Write the BITMAPINFOHEADER
	tempBuffer.writeUInt32LE(this.headerInfoSize,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.width,this.pos);this.pos+=4;
	tempBuffer.writeInt32LE(-this.height,this.pos);this.pos+=4;
	tempBuffer.writeUInt16LE(this.planes,this.pos);this.pos+=2;
	tempBuffer.writeUInt16LE(this.bitPP,this.pos);this.pos+=2;
	tempBuffer.writeUInt32LE(this.compress,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.rgbSize,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.hr,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.vr,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.colors,this.pos);this.pos+=4;
    tempBuffer.writeUInt32LE(this.importantColors,this.pos);this.pos+=4;
    
    // Write the bmiColors if necessary
    if(this.palette) {
        this.palette.copy(tempBuffer, this.pos, 0, this.bmiColorsSize)
        this.pos += this.bmiColorsSize
    }

    if(this.pos != this.offset)
        throw new Error("BmpEncoder headers combined size was not the expected value (wrong size of palette?)")

    // Write the data
    var i=0;
    var p = this.pos
	var rowBytes = this.bitPP / 8 *this.width+this.extraBytes;

	for (var y = 0; y <this.height; y++){
		for (var x = 0; x < this.width; x++){
            if(this.bitPP == 24) {
                i++;//a
                tempBuffer[p]= this.buffer[i++];//b
                tempBuffer[p+1] = this.buffer[i++];//g
                tempBuffer[p+2]  = this.buffer[i++];//r    
                p += 3
            }
            else {  // bpp == 8
                tempBuffer[p] = this.buffer[i++]
                p++
            }
		}
		if(this.extraBytes>0){
			var fillOffset = this.pos+y*rowBytes+this.width*3;
            tempBuffer.fill(0,fillOffset,fillOffset+this.extraBytes);
            p += extraBytes
		}
	}

	return tempBuffer;
};

module.exports = function(imgData) {
 	var encoder = new BmpEncoder(imgData);
	var data = encoder.encode();
  return {
    data: data,
    width: imgData.width,
    height: imgData.height
  };
};
