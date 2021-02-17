/*
 * Library for storing and rotating logs
 *
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const logs = {};

// Base directory for log folder
logs.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file
// Create a file if it does not exist
logs.append = function appendLog(fileName, logStr, clb) {
  // Open a file for appending

  fs.open(
    logs.baseDir + fileName + '.log',
    'a',
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // Append to a file and close it
        fs.appendFile(fileDescriptor, logStr + '\n\n', function (err) {
          if (!err) {
            //Close file
            fs.close(fileDescriptor, function (err) {
              if (!err) {
                clb(false);
              } else {
                clb('Error closing the file that was being appended');
              }
            });
          } else {
            clb('Error appending the file');
          }
        });
      } else {
        clb('Could not open a file for appending');
      }
    }
  );
};

// List all the logs, and optionaly include the compressed ones
logs.list = function listLogFiles(includeCompressed, clb) {
  fs.readdir(logs.baseDir, function (err, data) {
    if (!err && data && data.length > 0) {
      const trimmedFileNames = [];
      data.forEach((fileName) => {
        // Add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }
        // Add on the .gz files
        if (includeCompressed && fileName.indexOf('.gz.b64') > -1) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });
      clb(false, trimmedFileNames);
    } else {
      clb(err, data);
    }
  });
};

// Compress the contents of .log file into .gz.b64 file within the same directory
logs.compress = function compressLogs(logId, newFileId, clb) {
  const sourceFile = logId + '.log';
  const destinationFile = newFileId + '.gz.b64';
  // Read the source file
  fs.readFile(logs.baseDir + sourceFile, 'utf8', function (err, inputString) {
    if (!err && inputString) {
      // compress the data using gzip
      zlib.gzip(inputString, function (err, buffer) {
        if (!err && buffer) {
          // Send the data to the destination file
          fs.open(
            logs.baseDir + destinationFile,
            'wx',
            function (err, fileDescr) {
              if (!err && fileDescr) {
                // Write to a destination file
                fs.writeFile(
                  fileDescr,
                  buffer.toString('base64'),
                  function (err) {
                    if (!err) {
                      // Close file
                      fs.close(fileDescr, (err) => {
                        if (!err) {
                          clb(false);
                        } else {
                          clb(err);
                        }
                      });
                    } else {
                      clb(err);
                    }
                  }
                );
              } else {
                clb(err);
              }
            }
          );
        } else {
          clb(err);
        }
      });
    } else {
      clb('Error while reading the log file');
    }
  });
};

// Decompress the contents of the .gz.b64 file into a string variable
logs.decompress = function decompressLogFile(fileId, clb) {
  const fileName = fileId + '.gz.b64';
  fs.readFile(logs.baseDir + fileName, 'utf8', function (err, str) {
    if (!err && str) {
      // Decompress the data
      // Create a buffer from the string
      let inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, function (err, outputBuffer) {
        if (!err && outputBuffer) {
          // Create a string from the output buffer
          const str = outputBuffer.toString();
          clb(false, str);
        } else {
          clb(err);
        }
      });
    } else {
      clb(err);
    }
  });
};

// Empty the log file
logs.truncate = function truncateContents(logId, clb) {
  fs.truncate(logs.baseDir + logId + '.log', function (err) {
    if (!err) {
      clb(false);
    } else {
      clb(err);
    }
  });
};

module.exports = logs;
