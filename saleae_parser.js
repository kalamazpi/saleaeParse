// A simple logic analyzer parser to extract timing information for statistical comparison.

let fs = require("fs");

// TODO: Read file in and parse it one line at a time (memory savings).
function getFileContent(srcPath, callback) {
    fs.readFile(srcPath, "utf8", function (err, data) {
        if (err) throw err;
        callback(data);
        }
    );
}

function processData(theFileString) {
    let parsedLines = theFileString.split("\n");
    //console.log(theFileString);
    //console.log(parsedLines);

    // At this point, parsedLines[] contains the whole file, one line per entry.
    // Next we want to split each line into column pairs and store them separately.
    // First we parse the first line by ',' to get the total number of columns, and
    // use these as keys/labels for each of the variable pairs.
    let firstLine = parsedLines[0].split(",");
    console.log(parsedLines[0]);
    console.log(firstLine);
    for (key in firstLine) {
        console.log(firstLine[key]);
    }
    // cols contains the number of time/value pairs in the source file.
    let cols = firstLine.length / 2;
    console.log("cols =", cols);

    let mySignalNames = [];
    // Unique signal names are in 1, 3, 5... of firstLine.
    for (let i = 0; i < cols; i += 1) {
        mySignalNames[i] = firstLine[(i * 2) + 1];
    }

    console.log (mySignalNames);

    // myArrays is an array of (4) arrays, where (4) can be replaced with 'cols'.
    // myArrays[0] is an array of 2d objects {Time [s], Value [voltage or 0/1]}
    let myArrays = [];
    for (let i = 0; i < cols; i += 1) {
        myArrays[i] = [];
    }
    // The next step is to run through all of the parsedLines[] and for each one,
    // parse their contents into the respective {time, value} pairs for each
    // array.
    // We'll use 'i' as the line number for parsedLines and 'j' as the column
    // number in units of unique signals (same sense as 'cols' above).
    // Note that we start at the second line number because the first line
    // number contains the header texts.

    for (let i = 1; i < parsedLines.length; i += 1) {
        // break the line into column units
        let localString = parsedLines[i].split(",");
        // assign column units into {time, value} object pairs and assign them
        // to each array in myArrays[].

        //console.log (localString[0], localString[1]);

        for (let j = 0; j < cols; j += 1) {
            // localString[0] is the 'time' portion of the first object in myArray[0]
            // localString[1] is the 'value' portion of the first object in myArray[0]
            // localString[2] is the 'time' portion of the first object in myArray[1]
            // localString[3] is the 'value' portion of the first object in myArray[1]
            // etc.
            myArrays[j][i-1] = [Number(localString[(j * 2) + 0]), Number(localString[(j * 2) + 1])];
        }
    }

    //console.log (myArrays);
    // Parse and print the arrays organized by signal
    for (let j = 0; j < cols; j += 1) {
        //console.log("signal ", mySignalNames[j]);
        //console.log ("Time, Value");
        // TODO: change parsedLines.length to array length
        for (let i = 0; i < (parsedLines.length - 1); i += 1) {
            //console.log (myArrays[j][i][0], ", ", myArrays[j][i][1]);
        }
       // console.log("\n");
    }

    // quick calculation of BB shutdown.  AC_Present is [1], BB_shutdown is [2].
    // Search for occurrences of AC_Present = 0, note the 'ACtime', then look at the first time
    // in BB_shutdown after 'ACtime', which is 'BBtime', and take 'BBtime - ACtime' for the
    // shutdown time.

    // TODO: add support for de-glitching output arrays
    // TODO: add support for transforming array matrix into unified event array
    // TODO: add support for translating unified event array into unified array with regular time axis.
    let outputIndex = 0;
    let outputArray = [];
    for (let i = 0; i < myArrays[1].length; i += 1) {
        if (myArrays[1][i][1] == 0) {
            let ACtime = myArrays[1][i][0];
            // the following is true if this channel ran out of entries.
            if (ACtime == 0) {
                break;
            }
//            console.log("falling edge of AC_present found at ", ACtime);
            for (let j = 0; j < myArrays[2].length; j += 1) {
                if (myArrays[2][j][0] > ACtime) {
                    BBtime = myArrays[2][j][0];
//                    console.log("BB_falling occurred at ", BBtime);
                    let delta = BBtime - ACtime;
//                    console.log ("power down time is ", delta);
                    //now find Supercap voltage at BBtime
                    for (let k = 0; k < myArrays[0].length; k += 1) {
                        if (myArrays[0][k][0] > BBtime) {
                            let SuperCap = myArrays[0][k][1];
//                            console.log ("Supercap voltage is ", SuperCap);
                            outputArray[outputIndex++] = [ACtime.toFixed(3), BBtime.toFixed(3), delta.toFixed(3), SuperCap.toFixed(3)];
                            break;
                        }
                    }
                    break;
                }
            }
        }
    }

    for (i = 0; i < outputArray.length; i += 1) {
        console.log(outputArray[i]);
    }

}

// TODO: Remove this debug console.log after validation.
process.argv.forEach(function (val, index, array) {
    console.log(index + ": " + val);
});

getFileContent(process.argv[2], processData);
