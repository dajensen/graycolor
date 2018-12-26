# graycolor
Grayscale to color conversion for pc screenshots


## Installing and Running 

1. If you're using a GPU, then first go to package.json and update this:
        "@tensorflow/tfjs-node"
    to be this instead:
        "@tensorflow/tfjs-node-gpu"
        
    Then also go to src/train.js and change this import:
        import '@tensorflow/tfjs-node';
    to be 
        import '@tensorflow/tfjs-node-gpu';
    
2. Run "npm install" to get all of your dependencies downloaded and installed in the node-modules directory

3. Go to the ./data/color directory and download the sample data and unpack it.  ./data/color/readme has commands for that.

4. Back in this main directory, run "npm run compile" to compile the es6 scripts using babel.  After a few seconds, this will just sit there watching for file changes, so hit control-c.  That will exit the watcher.  Alternatively, you could just leave the terminal session with "npm run compile" running.  That way any source changes will be immediately compiled.

5. Start the training session with "node compiled/train"

6. After each training set (default is 20 epochs) the model on disk will be updated.  You'll find it in /tmp/graycolor-model.

7. To continue training by running the training script again, use "node compiled/train --model=/tmp/graycolor-model"
