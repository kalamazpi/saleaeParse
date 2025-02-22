// A simple logic analyzer parser to extract timing information for statistical comparison.
// TODO: Replace 'for' statements over arrays with 'forEach' methods where it makes sense.

let fs = require("fs");
let readline = require("readline");
let stream = require("stream");

let instream = fs.createReadStream(process.argv[2]);
let outstream = new stream();
let rl = readline.createInterface(instream, outstream);

let isFirstLine = true; // indicates first line of the file being read
let myArrays = [];
let mySignalNames = [];
let numSignals = 0;
// lineNumber is the line number of the incoming data file and doesn't
// count the header line.
let lineNumber = 0;

// TODO: Check for existence of input file.
// TODO: Add "usage" info if invoked with no parameters.

// The 'line' method of rl.on process any Saleae input file into a set of 2-d arrays
// for each signal being probed.  The 'primary' axis, which is the first index in 'myArrays' is the signal,
// such as "AC_Present", or "SupercapV".  For example, in element myArrays[x][y][z], 
//  x - refers to the Signal
//  y - refers to the sample number
//  z - '0' is the time, '1' is the value.
// The "line" method is generic for all Saleae configurations, unlike the "close" method, which is
// specific to particular measurements being taken, at least at the moment.
rl.on("line", function(line) {
    // line == the first line, and the next line, etc.
    //console.log("line: ", line);
    if (isFirstLine == true) {
        let firstLine = line.split(",");
        /*
        console.log(firstLine);
        for (key in firstLine) {
            console.log(firstLine[key]);
        }
        */
        // numSignals contains the number of time/value pairs in the source file.
        numSignals = firstLine.length / 2;
        console.log("#signals =", numSignals);

        // Assign signal names.
        // Unique signal names are in 1, 3, 5... of firstLine.
        // myArrays is an array of (4) arrays, where (4) can be replaced with 'numSignals'.
        // myArrays[0] is an array of 2d objects {Time [s], Value [voltage or 0/1]}
        for (let i = 0; i < numSignals; i += 1) {
            mySignalNames[i] = firstLine[(i * 2) + 1];
            myArrays[i] = [];
        }

        console.log (mySignalNames);

        isFirstLine = false;

    } else {
        // The next step is to run through all of the file lines and for each one,
        // parse their contents into the respective {time, value} pairs for each
        // array.
        // We'll use 'i' as the line number for parsedLines and 'j' as the column
        // number in units of unique signals (same sense as 'numSignals' above).
        // Note that we start at the second line number because the first line
        // number contains the header texts.

        let localString = line.split(",");
        // assign column units into {time, value} object pairs and assign them
        // to each array in myArrays[].

        //console.log ("split line is: ", localString[0], localString[1]);

        for (let j = 0; j < numSignals; j += 1) {
            // localString[0] is the 'time' portion of the first object in myArray[0]
            // localString[1] is the 'value' portion of the first object in myArray[0]
            // localString[2] is the 'time' portion of the first object in myArray[1]
            // localString[3] is the 'value' portion of the first object in myArray[1]
            // etc.
            myArrays[j][lineNumber] = [Number(localString[(j * 2) + 0]), Number(localString[(j * 2) + 1])];
        }
    lineNumber += 1;
    }
});

// On file close, we process the array and perform the work of the program.
rl.on("close", function() {
    //console.log (myArrays);
    //for (let i = 0; i < numSignals; i += 1) {
    //    for (let j = 0; j < 5; j += 1) {
    //        console.log (myArrays[i][j]);
    //    }
    //}

    // Parse and print the arrays organized by signal
    /*
    for (let j = 0; j < numSignals; j += 1) {
        console.log("signal ", mySignalNames[j]);
        console.log ("Time, Value");
        for (let i = 0; i < myArrays[j].length; i += 1) {
            console.log (myArrays[j][i][0], ", ", myArrays[j][i][1]);
        }
        console.log("\n");
    }
    */

    // *** Parser to measure AC_Present falling to BBPowerDown falling ***
    // quick (and very dirty!) calculation of BB shutdown.  AC_Present is myArrays[1], BB_shutdown is myArrays[2],
    // and SupercapV is myArrays[0]. The PIC VDD falling data, which is myArrays[3] is not used here.
    // Search for occurrences of AC_Present = 0, note the 'ACtime', then look at the first time
    // in BB_shutdown after 'ACtime', which is 'BBtime', and take 'BBtime - ACtime' for the
    // shutdown time.  The algorithm below makes *a lot* of assumptions about the relative
    // states of the various signals (for example, that BBPowerDown is high when AC_Present
    // falls, etc., so the first state change in BBPowerDown is a falling edge.

    // TODO: add support for de-glitching output arrays
    // TODO: add support for transforming array matrix into unified event array
    // TODO: add support for translating unique event arrays (myArrays[]) into a unified array with a common time axis.
    let outputIndex = 0;
    let outputArray = [];
    for (let i = 0; i < myArrays[1].length; i += 1) {
        // "if AC_Present.value == 0, let ACtime = AC_Present.time". I should have just used objects
        // for better descriptiveness in the code.  Remember myArrays[x][y][0] is a time and
        // myArrays[x][y][1] is a value.
        if (myArrays[1][i][1] == 0) {
            let ACtime = myArrays[1][i][0];
            // the following is true if this channel ran out of entries.
            // TODO: Find a better way to terminate this operation. The goal is to quit if the column is empty.
            //       Might need to change the way "" are stored in the parsing above.  The 'i > 0' was
            //       discovered as a data-dependent behavior in the input file.
            if ((ACtime == 0) && (i > 0)) {
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

    let mySignalString = "AC_Present, BB_powerdown, Delta, SupercapV";
    console.log(mySignalString);
    let mySignalLine = "";
    for (let i = 0; i < outputArray.length; i += 1) {
        mySignalLine = "";
        for (let j = 0; j < outputArray[0].length; j += 1) {
            mySignalLine += outputArray[i][j] + ((j < (outputArray[0].length - 1)) ? ", ":"");
        }
        console.log(mySignalLine);
        //console.log(outputArray[i]);
    }
});
