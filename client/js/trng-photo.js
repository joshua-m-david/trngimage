/*! 
 * Copyright (c) 2016  Joshua M. David
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation in version 3 of the License.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see [http://www.gnu.org/licenses/].
 */

// Use ECMAScript 5's strict mode
'use strict';

/**
 * True Random Number Generator (TRNG) to extract random data from photographs.
 */
var trngImg = {
	
	/** A jQuery selector for the TRNG image page container */
	$page: null,
		
	/** The first uploaded image */
	imageA: {
		canvas: null,			// The HTML5 canvas
		context: null,			// The 2D context of the image canvas
		canvasWidth: null,		// The canvas width
		canvasHeight: null,		// The canvas height
		loadComplete: false		// Whether the file has completed loading or not
	},
	
	/** The second uploaded image */
	imageB: {
		canvas: null,
		context: null,
		canvasWidth: null,
		canvasHeight: null,
		loadComplete: false
	},	
	
	/** The bits from the LSBs in both images XORed together */
	xoredEntropyBits: '',
	
	/** The bits after Von Neumann extraction of the XORed bits */
	extractedEntropyBits: '',
			
	/**
	 * Keep track of which tests are finished for which dataset
	 */
	finishedTests: {
		entropyA: false,			// Least significant bits in Image A
		entropyB: false,			// Least significant bits in Image B
		entropyXored: false,		// Least significant bits in Image A and Image B XORed together
		entropyExtracted: false		// Von Nuemann extractor run on the XORed bits
	},
	
	/**
	 * Initialise the page code
	 */
	init: function()
	{
		// Cache page selector for faster DOM lookups
		trngImg.$page = $('.trngImagePage');
		
		// Initialise the functionality
		trngImg.initBrowseFilesButton();
		trngImg.initResetButton();
		trngImg.initErrorHandler();
		trngImg.initProcessButton();
		exportData.initExportDialog();
	},
	
	/**
	 * When an image is uploaded, load it into HTML5 canvas
	 */
	initBrowseFilesButton: function()
	{
		// When the browse files button is clicked and files selected
		trngImg.$page.find('#imageLoader').change(function()
		{
			// Get the files
			var files = $(this)[0].files;
			
			// If the number of files is not exactly two
			if (files.length !== 2)
			{
				// Clear fields
				trngImg.$page.find('.fileNameA, .fileSizeA, .fileTypeA').text('');
				trngImg.$page.find('.fileNameB, .fileSizeB, .fileTypeB').text('');

				// Show an error
				common.showStatus('error', 'Please select exactly two images to load');

				// Exit early so the user fixes the issue
				return false;
			}
			
			// Remove previous warnings and errors
			trngImg.$page.find('.fileTypeA, .fileTypeB').removeClass('warning');
			common.hideStatus();
			
			// Start timer
			common.startTime = new Date();
			common.showProcessingMessage('Loading images, please wait...', false);
			
			// Load the two files
			trngImg.loadFileInformation(files[0], 'A');
			trngImg.loadFileInformation(files[1], 'B');			
		});
	},
	
	/**
	 * Loads the image file information and the image into HTML5 canvas on the page
	 * @param {Object} file An image file
	 * @param {String} id An identifier i.e. 'A' for imageA, 'B' for imageB
	 */
	loadFileInformation: function(file, id)
	{
		// Get the file name, size and type
		var fileName = file.name;
		var fileSize = common.formatNumberWithCommas(file.size);
		var fileType = file.type;		
		
		// Display the first file details
		trngImg.$page.find('.fileName' + id).text(fileName);
		trngImg.$page.find('.fileSize' + id).text(fileSize + ' bytes');
		trngImg.$page.find('.fileType' + id).text(fileType);				
		
		// If JPEG file type then show a warning with hover text
		if (fileType === 'image/jpeg')
		{
			trngImg.$page.find('.fileType' + id).addClass('warning');
			trngImg.$page.find('.fileType' + id).attr('title', 'For best results do not use JPEG files, '
			                                                 + 'use RAW files converted to PNG or BMP.');
		}
		
		// Initialise the image canvas and context
		trngImg['image' + id].canvas = document.getElementById('imageCanvas' + id);
		trngImg['image' + id].context = trngImg['image' + id].canvas.getContext('2d');
		
		// Load the images into the canvas
		trngImg.loadImageIntoCanvas(file, id);
	},
	
	/**
	 * Load the image into a canvas object on the page
	 * @param {Object} file The file object from the files array
	 * @param {String} id An identifier i.e. 'A' for imageA, 'B' for imageB
	 */
	loadImageIntoCanvas: function(file, id)
	{
		// Use HTML5 FileReader API
		var reader = new FileReader();

		// Callback when file is loaded
		reader.onload = function(event)
		{
			var image = new Image();

			// Once the image is loaded
			image.onload = function()
			{
				// Draw the image onto the canvas
				trngImg['image' + id].canvas.width = image.width;
				trngImg['image' + id].canvas.height = image.height;
				trngImg['image' + id].context.drawImage(image, 0, 0);

				// Calculate the number of pixels in image
				var totalPhotoPixels = image.width * image.height;
				var formattedTotalPhotoPixels = common.formatNumberWithCommas(totalPhotoPixels);

				// Show the heading, number of pixels in the image and the number of input entropy bits (same as the number of pixels)
				trngImg.$page.find('.collectionAmounts.image' + id + ' .totalPhotoPixels .statusBox').text(formattedTotalPhotoPixels);
				trngImg.$page.find('.collectionAmounts.image' + id + ' .totalEntropyInputBits .statusBox').text(formattedTotalPhotoPixels);

				// Notify that file loading is complete
				trngImg.showFileLoadingComplete(id);
			};

			// Display the image
			image.src = event.target.result;
		};

		// Upload from the page
		reader.readAsDataURL(file);
	},
	
	/**
	 * When loading of both files is complete, show a status message and enable other functionality. If files are of 
	 * different sizes, then they may finish loading out of normal order. This function makes sure both are loaded 
	 * before allowing the user to continue.
	 * @param {String} id A file identifier i.e. 'A' for image A, 'B' for image B
	 */
	showFileLoadingComplete: function(id)
	{
		// Set the loaded state of this image
		trngImg['image' + id].loadComplete = true;
		
		// If both images have finished loading
		if (trngImg['imageA'].loadComplete && trngImg['imageB'].loadComplete)
		{
			// Enable the Process and Restart buttons, disable the image selection button
			trngImg.$page.find('#processImage').removeAttr('disabled');
			trngImg.$page.find('#btnStartOver').removeAttr('disabled');
			trngImg.$page.find('#imageLoader').attr('disabled', true);
			trngImg.$page.find('.imageLoaderLabel').addClass('disabled');
			
			// Show the View image buttons
			trngImg.$page.find('.collectionAmounts.fileInfo').show();
			trngImg.showAndInitViewButton('btnViewOriginalImageA', 'originalImageHeaderA');
			trngImg.showAndInitViewButton('btnViewOriginalImageB', 'originalImageHeaderB');

			// Show a status message
			common.showStatus('success', 'Completed loading of images. Now you can visually ' +
			                             'inspect the images and process them when ready.', true);
		}
	},
	
	/**
	 * Shows a button e.g. View image, which when clicked will take you to view that image or the test results
	 * @param {String} buttonId The name of the button's id
	 * @param {String} contentId The name of the ID where the image or test results are
	 */
	showAndInitViewButton: function(buttonId, contentId)
	{
		// Show the button then add click handler
		trngImg.$page.find('#' + buttonId).click(function()
		{
			// Hide other results
			trngImg.$page.find('.outputAndResults > div').hide();
			
			// Show just the image or results they want to see
			trngImg.$page.find('#' + contentId).show();
		});
	},
		
	/**
	 * Reloads the page so the user can start a new upload
	 */
	initResetButton: function()
	{
		// On Reset button click
		trngImg.$page.find('#btnStartOver').click(function()
		{
			// Hard refresh the page (ignores browser cache)
			location.reload(true);
		});
	},
	
	/**
	 * Catch out of memory errors and display them to the user. Sometimes this can 
	 * happen when processing a large image and the machine runs out of memory or the 
	 * browser can't free old memory fast enough.
	 */
	initErrorHandler: function()
	{
		// Catch out of memory error if it occurs and display to the user
		window.onerror = function(error, url, line)
		{
			common.showStatus('error', 'Error occurred: ' + error + ' URL: ' + url + ' line: ' + line, true);
		};
	},
	
	/**
	 * Initialise the button to process the image, extract the entropy and run the tests
	 */
	initProcessButton: function()
	{
		// On the Process button click
		trngImg.$page.find('#processImage').click(function()
		{
			trngImg.processImages();
		});
	},
	
	/**
	 * Process the two images
	 */
	processImages: function()
	{
		// Start timer
		common.startTime = new Date();
		common.showProcessingMessage('Processing of images started, this may take a few minutes...', false);

		// Disable the button, as the canvas gets cleared after loading
		trngImg.$page.find('#processImage').attr('disabled', true);

		// Get RGBA image data array for both images
		var dataImageA = trngImg.getImageData('A');
		var dataImageB = trngImg.getImageData('B');
		
		// Start processing in the background using a web worker
		trngImg.startProcessingWebWorker(dataImageA, dataImageB);
	},
	
	/**
	 * Get the Red Green Blue Alpha (RGBA) pixel data from an image
	 * @param {String} id id A file identifier i.e. 'A' for image A and 'B' for image B
	 * @returns {Uint8ClampedArray} Returns a sequential array of bytes. Each pixel in the image is decoded to its 
	 *                              RGBA values e.g. [14, 233, 121, 0, ..., 8, 17, 255, 0]
	 */
	getImageData: function(id)
	{
		// Get the canvas width and height
		var canvasWidth = trngImg['image' + id].canvas.width;
		var canvasHeight = trngImg['image' + id].canvas.height;
		
		// Get the image data from the canvas as an array of sequential RGBA values		
		var imgDataArr = trngImg['image' + id].context.getImageData(0, 0, canvasWidth, canvasHeight).data;
						
		return imgDataArr;
	},
	
	/**
	 * Run a HTML5 web worker thread to run the extraction process because it is CPU intensive
	 * @param {Uint8ClampedArray} dataImageA The RGBA values for each pixel in the first image
	 * @param {Uint8ClampedArray} dataImageB The RGBA values for each pixel in the second image
	 */
	startProcessingWebWorker: function(dataImageA, dataImageB)
	{	
		// Setup the extraction worker
		var worker = common.startWebWorker('trng-extraction-worker');
				
		// When the worker is complete
		worker.addEventListener('message', function(event)
		{
			// Save the results from the worker and start the randomness tests
			trngImg.saveProcessingResults(event.data);
			trngImg.startRandomnessTests();
			
		}, false);
		
		// Send data to the worker
		worker.postMessage(
		{
			dataImageA: dataImageA,
			dataImageB: dataImageB
		});
	},
		
	/**
	 * Saves the worker processing results for later use to be exported, output to images and tests
	 * @@param {Object} workerData The processed results from the extraction web worker
	 */
	saveProcessingResults: function(workerData)
	{
		// Store the binary random bits
		exportData.randomBitsFirstImageBinary = workerData.randomBitsFirstImageBinary;
		exportData.randomBitsSecondImageBinary = workerData.randomBitsSecondImageBinary;
		exportData.randomBitsXoredBinary = workerData.randomBitsXoredBinary;
		exportData.randomBitsExtractedBinary = workerData.randomBitsExtractedBinary;
		
		// Store the hexadecimal version as well
		exportData.randomBitsFirstImageHex = workerData.randomBitsFirstImageHex;		
		exportData.randomBitsSecondImageHex = workerData.randomBitsSecondImageHex;
		exportData.randomBitsXoredHex = workerData.randomBitsXoredHex;
		exportData.randomBitsExtractedHex = workerData.randomBitsExtractedHex;
	},
				
	/**
	 * Wrapper function to start the randomness tests across all  in a background worker
	 */
	startRandomnessTests: function()
	{		
		// Show current status
		common.showProcessingMessage('Completed randomness extraction. Starting randomness tests...', true);
				
		// Run the randomness tests on the least significant bits of the first image
		randomTests.init(exportData.randomBitsFirstImageBinary, 'inputEntropyTestsPassImageA', 'leastSigBitsOverallResultLogImageA', function()
		{
			// On completion of the tests, notify that this set finished, but don't display until the others are done
			trngImg.displayProcessingStats('entropyA');
		});
		
		// Run the randomness tests on the least significant bits of the second image
		randomTests.init(exportData.randomBitsSecondImageBinary, 'inputEntropyTestsPassImageB', 'leastSigBitsOverallResultLogImageB', function()
		{
			trngImg.displayProcessingStats('entropyB');
		});
		
		// Run the randomness tests on the least significant bits from both images XORed together
		randomTests.init(exportData.randomBitsXoredBinary, 'xoredEntropyTestsPass', 'leastSigBitsXoredOverallResultLog', function()
		{
			trngImg.displayProcessingStats('entropyXored');
		});
		
		// Run the randomness tests on the random bits after Von Neumann extraction
		randomTests.init(exportData.randomBitsExtractedBinary, 'extractedTestsPass', 'extractedBitsOverallResultLog', function()
		{
			trngImg.displayProcessingStats('entropyExtracted');
		});
	},
	
	/**
	 * Show the number of extracted bits and number of messages
	 * @param {String} nameOfCompletedTest The name of the completed test to keep track of which ones are finished
	 */
	displayProcessingStats: function(nameOfCompletedTest)
	{
		// Set the test as completed
		trngImg.finishedTests[nameOfCompletedTest] = true;
		
		// If all the tests aren't finished yet, exit early
		if (!trngImg.finishedTests.entropyA || !trngImg.finishedTests.entropyB || !trngImg.finishedTests.entropyXored || !trngImg.finishedTests.entropyExtracted)
		{
			return false;
		}
				
		// Calculate the collected number of bits
		var totalXoredBits = exportData.randomBitsXoredBinary.length;
		var totalExtractedBits = exportData.randomBitsExtractedBinary.length;

		// Format the values with the thousands separator
		totalXoredBits = common.formatNumberWithCommas(totalXoredBits);
		totalExtractedBits = common.formatNumberWithCommas(totalExtractedBits);

		// Update the totals, activate the Export button
		trngImg.$page.find('.xoredEntropyBits .statusBox').text(totalXoredBits);
		trngImg.$page.find('.totalExtractedBits .statusBox').html(totalExtractedBits);		
		trngImg.$page.find('#btnOpenExportSettings').removeAttr('disabled');

		// Show current status
		common.showProcessingMessage('Completed randomness tests. Rendering bitmaps, this may ' +
									 'take a minute and the screen may go darker momentarily...', false);

		// Set a short timeout so the intermediate processing message above has time to display
		setTimeout(function()
		{				
			// Render the processed data as bitmaps and initialise the buttons for viewing the results
			trngImg.fillCanvasesWithRandomBits();
			trngImg.initViewResultsButtons();

			// Show all other totals and buttons in the header
			trngImg.$page.find('.collectionAmounts').show();

			// Show final complete status
			common.showStatus('success', 'Completed processing, randomness tests and bitmap rendering. '
									   + 'Click the view buttons above to see the results.', true);
		}, 300);
	},
		
	/**
	 * Wrapper function to fill all the canvases with random bits from 
	 * various stages of the process so they can be viewed for testing
	 */
	fillCanvasesWithRandomBits: function()
	{
		// Render random bits as images
		trngImg.fillCanvasWithBlackWhite('leastSigBitsBlackWhiteImageA', exportData.randomBitsFirstImageBinary);
		trngImg.fillCanvasWithColour('leastSigBitsColourImageA', exportData.randomBitsFirstImageBinary);
		
		trngImg.fillCanvasWithBlackWhite('leastSigBitsBlackWhiteImageB', exportData.randomBitsSecondImageBinary);
		trngImg.fillCanvasWithColour('leastSigBitsColourImageB', exportData.randomBitsSecondImageBinary);
				
		trngImg.fillCanvasWithBlackWhite('leastSigBitsXoredBlackWhite', exportData.randomBitsXoredBinary);
		trngImg.fillCanvasWithColour('leastSigBitsXoredColour', exportData.randomBitsXoredBinary);
		
		trngImg.fillCanvasWithBlackWhite('extractedBitsBlackWhite', exportData.randomBitsExtractedBinary);		
		trngImg.fillCanvasWithColour('extractedBitsColour', exportData.randomBitsExtractedBinary);		
	},
			
	/**
	 * Fills the HTML5 canvas with random bits, 0 bits are coloured white, 1 bits are coloured black.
	 * @param {String} canvasId The id to render the binary data into
	 * @param {String} randomBits Random binary data
	 */
	fillCanvasWithBlackWhite: function(canvasId, randomBits)
	{
		// Dynamically work out the size of the square image (x & y axis)
		var numRandomBits = randomBits.length;
		var squareRoot = Math.sqrt(numRandomBits);
		var axisLength = Math.floor(squareRoot);

		// Set new canvas dimensions
		$('#' + canvasId).prop(
		{
			width: axisLength,
			height: axisLength
		});

		// Create the canvas
		var context = document.getElementById(canvasId).getContext('2d');

		// Fill everything with white first
		context.fillStyle = "#FFF";
		context.fillRect(0, 0, axisLength, axisLength);
		context.fillStyle = "#000";

		// Loop through each binary char
		for (var x = 0; x < axisLength; x++)
		{
			for (var y = 0; y < axisLength; y++)
			{
				// If the character is a binary 1
				if (randomBits[x * axisLength + y] === '1')
				{
					// Fill that pixel with black
					context.fillRect(x, y, 1, 1);
				}
			}
		}
	},
	
	/**
	 * This fills the HTML5 canvas with random colours. It works by converting the random bits to a byte array. Then it 
	 * takes successive groups of 3 bytes, rendering them as red, green and blue colours for each pixel in the image.
	 * @param {String} canvasId The id to render the binary data into
	 * @param {String} randomBits Random binary data
	 */
	fillCanvasWithColour: function(canvasId, randomBits)
	{
		var byteArray = [];
		
		// Convert the bits to an array of byte integers
		for (var i = 0, length = randomBits.length;  i < length;  i += 8)
		{
			// Get 8 bits and convert to an integer (0 - 255)
			var byteBinary = randomBits.substr(i, 8);
			var byteInteger = common.convertBinaryToInteger(byteBinary);
			
			// Add to array
			byteArray.push(byteInteger);
		}
		
		// Dynamically work out the size of the square image (x & y axis)
		var numRandomBytes = byteArray.length;
		var numOfPixels = (numRandomBytes / 3);
		var squareRoot = Math.sqrt(numOfPixels);
		var axisLength = Math.floor(squareRoot);
		var height = axisLength;
		var width = axisLength;

		// Set new canvas dimensions
		$('#' + canvasId).prop(
		{
			height: height,
			width: width
		});
		
		// Create the canvas
		var context = document.getElementById(canvasId).getContext('2d');
		var currentIndex = 0;

		// Fill each pixel in the canvas with random colours
		for (var x = 0; x < width; x++)
		{
			for (var y = 0; y < height; y++)
			{
				// Get the RGB values
				var red = byteArray[currentIndex];
				var green = byteArray[currentIndex + 1];
				var blue = byteArray[currentIndex + 2];

				// Update index for next loop
				currentIndex += 3;

				// Convert each colour to a 2 character hex code
				var redHex = common.convertSingleByteIntegerToHex(red);
				var greenHex = common.convertSingleByteIntegerToHex(green);
				var blueHex = common.convertSingleByteIntegerToHex(blue);

				// Fill the canvas pixel with colour
				context.fillStyle = '#' + redHex + greenHex + blueHex;		// e.g. #2d89fc
				context.fillRect(x, y, 1, 1);
			}
		}
	},
		
	/**
	 * Wrapper function to initialise the buttons required for viewing the results. Each set of buttons will 
	 * do three things: show a colour bitmap of the random data, show a black and white bitmap of the random data 
	 * and show the results of the randomness tests run against that data.
	 */
	initViewResultsButtons: function()
	{
		// Initialise buttons for results of the least significant bits of image A
		trngImg.showAndInitViewButton('btnViewLeastSigBitsColourBitmapImageA', 'leastSigBitsColourBitmapImageA');
		trngImg.showAndInitViewButton('btnViewLeastSigBitsBitmapImageA', 'leastSigBitsBitmapImageA');
		trngImg.showAndInitViewButton('btnViewLeastSigBitsTestResultsImageA', 'leastSigBitsTestResultsImageA');

		// Initialise buttons for results of the least significant bits of image B
		trngImg.showAndInitViewButton('btnViewLeastSigBitsColourBitmapImageB', 'leastSigBitsColourBitmapImageB');
		trngImg.showAndInitViewButton('btnViewLeastSigBitsBitmapImageB', 'leastSigBitsBitmapImageB');
		trngImg.showAndInitViewButton('btnViewLeastSigBitsTestResultsImageB', 'leastSigBitsTestResultsImageB');

		// Initialise buttons for results of the XORed least significant bits from both images
		trngImg.showAndInitViewButton('btnViewLeastSigBitsXoredColourBitmap', 'leastSigBitsXoredColourBitmap');
		trngImg.showAndInitViewButton('btnViewLeastSigBitsXoredBitmap', 'leastSigBitsXoredBitmap');
		trngImg.showAndInitViewButton('btnViewLeastSigBitsXoredTestResults', 'leastSigBitsXoredTestResults');

		// Initialise buttons for results of the extracted bits
		trngImg.showAndInitViewButton('btnViewExtractedBitsColourBitmap', 'extractedBitsColourBitmap');
		trngImg.showAndInitViewButton('btnViewExtractedBitsBitmap', 'extractedBitsBitmap');
		trngImg.showAndInitViewButton('btnViewExtractedBitsTestResults', 'extractedBitsTestResults');
	}
};