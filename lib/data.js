// Library for storing and editing data

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module
const lib = {};

// Base directory of the data folder
// join func will take the directory where we are now and the path to the .data/ folder. It'l make 1 nice path
lib.baseDir = path.join(__dirname, '/../.data/');

// wride data for the file
// @dir - folder where you want to create a file: string
// @file - the name of the file you want to create: string
// @data - JSON-like data you want to create: parsed JSON data
// @callback - error catcher
lib.create = (dir, file, data, callback) => {
  // open file for writing
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'wx',
    function (err, fileDescriptor) {
      // fileDescriptor is a way to uniquely identify a specific file

      if (!err && fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data);

        //Write to file and close it
        fs.writeFile(fileDescriptor, stringData, function (err) {
          if (!err) {
            // Close file
            fs.close(fileDescriptor, function (err) {
              if (!err) {
                // it means there is no error
                callback(false);
              } else {
                callback('Error closing a file');
              }
            });
          } else {
            callback('Error writing to a new file');
          }
        });
      } else {
        callback('Could not create a new file. It may already exist.');
      }
    }
  );
};

// Read data from a file

lib.read = (dir, file, callback) => {
  fs.readFile(
    lib.baseDir + dir + '/' + file + '.json',
    'utf8',
    function (err, data) {
      if (!err && data) {
        const parsedData = helpers.parseJsonToObject(data);
        callback(false, parsedData);
      } else {
        callback(err, data);
      }
    }
  );
};

// Update an existing file with a new data

lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(
    lib.baseDir + dir + '/' + file + '.json',
    'r+',
    function (err, fileDescriptor) {
      if (!err && fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data);

        // Truncate (clear the contents of the file) the contents of the file before we write a new data on top of it
        fs.ftruncate(fileDescriptor, function (err) {
          if (!err) {
            // Write to the file and close it
            fs.writeFile(fileDescriptor, stringData, function (err) {
              if (!err) {
                fs.close(fileDescriptor, function (err) {
                  if (!err) {
                    callback(false);
                  } else {
                    callback('Error while closing the file');
                  }
                });
              } else {
                callback('Error - writing to existing file');
              }
            });
          } else {
            callback('Error - truncating file');
          }
        });
      } else {
        callback('Could not open a file for updating. It may not exist yet.');
      }
    }
  );
};

lib.delete = (dir, fileName, callback) => {
  // Unlink the file = remove the file from the file system
  fs.unlink(lib.baseDir + dir + '/' + fileName + '.json', function (err) {
    if (!err) {
      callback(false);
    } else {
      callback('Error while deleting the file');
    }
  });
};

module.exports = lib;
