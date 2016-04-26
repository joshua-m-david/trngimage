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
 * Various and common functions used by multiple pages
 */
var common = {
	
	// Start timer
	startTime: null,
	
	// A timer for hiding the status messages
	statusTimeoutId: null,
	
	
	/**
	 * This function does a bitwise exclusive or (XOR) operation on two bitstreams.
	 * The two bitstreams should be of the same length.
	 * @param {String} bitsA The first stream of bits e.g.  '01010101'
	 * @param {String} bitsB The second stream of bits e.g. '00001111'
	 * @returns {String} A binary string containing the XOR of the first and second bitstreams e.g. '01011010'
	 */
	xorBits: function(bitsA, bitsB)
	{
		// Get the lengths of the two bitstreams
		var lengthBitsA = bitsA.length;
		var lengthBitsB = bitsB.length;
		
		// If the lengths of each stream of bits is different then this could be a serious problem e.g. the whole 
		// message does not get encrypted properly. This is added as a basic defense against possible coding error
		if (lengthBitsA !== lengthBitsB)
		{
			throw new Error('Serious failure, trying to XOR bitstreams of different lengths!\n' + new Error().stack);
		}
		
		var output = '';

		// For each binary character in the message
		for (var i = 0; i < lengthBitsA; i++)
		{
			// Get binary number of the two bitstreams at the same position
			var binaryDigitA = bitsA.charAt(i);
			var binaryDigitB = bitsB.charAt(i);

			// XOR the binary character of the pad and binary text character together and append to output
			output += (binaryDigitA ^ binaryDigitB);
		}

		return output;
	},
	
	/**
	 * Left pad a string with a certain character to a total number of characters
	 * @param {String} inputString The string to be padded
	 * @param {String} padCharacter The character/s that the string should be padded with
	 * @param {Number} totalCharacters The length of string that's required
	 * @returns {String} A string with characters appended to the front of it
	 */
	leftPadding: function(inputString, padCharacter, totalCharacters)
	{
		// Convert to string first, or it starts adding numbers instead of concatenating
		inputString = inputString.toString();
		
		// If the string is already the right length, just return it
		if (!padCharacter || (inputString.length >= totalCharacters))
		{
			return inputString;
		}

		// Work out how many extra characters we need to add to the string
		var charsToAdd = (totalCharacters - inputString.length) / padCharacter.length;

		// Add padding onto the string
		for (var i = 0; i < charsToAdd; i++)
		{
			inputString = padCharacter + inputString;
		}
		
		return inputString;
	},
	
	/**
	 * Converts an integer to binary and pads it up to the required length
	 * @param {Number} number The number to be converted to binary
	 * @param {Number} length The fixed length required in number of bits
	 * @returns {String} Returns the binary representation of the number
	 */
	convertIntegerToBinary: function(number, length)
	{
		// Convert to binary and left pad it with 0s up to the length
		var numberBinary = number.toString(2);
		var numberWithPaddingBinary = common.leftPadding(numberBinary, '0', length);
	
		return numberWithPaddingBinary;
	},
	
	
	/**
	 * Converts a small number (0-255) to its hexadecimal representation
	 * @param {Number} number The number to be converted
	 * @returns {String} Returns the hexadecimal representation of the number
	 */
	convertSingleByteIntegerToHex: function(number)
	{
		// Convert to hexadecimal and left pad it with 0s if it is not a full byte (numbers 0-9)
		var numberHex = number.toString(16);
		var numberWithPaddingBinary = common.leftPadding(numberHex, '0', 2);
		
		return numberWithPaddingBinary;
	},
	
	/**
	 * Converts a binary representation of a number into an integer
	 * @param {String} binaryString The binary representation of the number
	 * @returns {Number}
	 */
	convertBinaryToInteger: function(binaryString)
	{
		return parseInt(binaryString, 2);
	},
	
	/**
	 * Converts binary code to hexadecimal string. All hexadecimal is lowercase for consistency with the hash functions
	 * These are used as the export format and compatibility before sending via JSON or storing in the database
	 * @param {String} binaryString A string containing binary numbers e.g. '01001101'
	 * @return {String} A string containing the hexadecimal numbers
	 */
	convertBinaryToHexadecimal: function(binaryString)
	{
		var output = '';
		
		// For every 4 bits in the binary string
		for (var i = 0; i < binaryString.length; i += 4)
		{
			// Grab a chunk of 4 bits
			var bytes = binaryString.substr(i, 4);
			
			// Convert to decimal then hexadecimal
			var decimal = parseInt(bytes, 2);
			var hex = decimal.toString(16);
			
			// Append to output
			output += hex;
		}

		return output;		
	},
	
	/**
	 * Formats the number with thousands separator
	 * @param {Number} num Pass in number e.g. 2000000
	 * @returns {String} Returns in format 2,000,000
	 */
	formatNumberWithCommas: function(num)
	{
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	},
		
	/**
	 * Shows a success, error or processing message. The processing message also has an animated gif.
	 * @param {String} type The type of the error which will match the CSS class 'success', 'error' or 'processing'
	 * @param {String} message The error or success message
	 * @param {Boolean} keepDisplayed Optional flag to keep the message on screen until manually cleared
	 */
	showStatus: function(type, message, keepDisplayed)
	{
		// Cache selector
		var $statusMessage = $('.statusMessage');
		
		// Remove existing CSS classes, add the class depending on the type of message and set the message
		$statusMessage.removeClass('success warning error processing').addClass(type);
		$statusMessage.find('.message').text(message);
		
		// Clear previous timeout so that new status messages being shown don't get prematurely 
		// hidden by an old timer that is still running but just completes and hides the new message
		window.clearTimeout(common.statusTimeoutId);
		
		// If the message should be kept displayed just show it
		if (keepDisplayed)
		{
			$statusMessage.show();
		}
		else {
			// Otherwise show the error or success message for 14 seconds then fade it out
			$statusMessage.show();
			
			// Set a timer to hide the status message after 14 seconds
			common.statusTimeoutId = setTimeout(function()
			{
				$statusMessage.fadeOut(300);
			
			}, 14000);
		}
	},
		
	/**
	 * Shows how long it took to process the data up to this point
	 * @param {String} message The status message to be displayed
	 * @param {Boolean} showTimeElapsed Whether to show how long it has taken so far, turn this off if just starting the process
	 */
	showProcessingMessage: function(message, showTimeElapsed)
	{
		// Current time
		var currentTime = new Date();
		
		// Calculate time taken in milliseconds and seconds
		var milliseconds = currentTime.getTime() - common.startTime.getTime();
		var seconds = (milliseconds / 1000).toFixed(1);
		
		// Show the time the process started if applicable
		var timeElapsedMessage = (showTimeElapsed) ? ' Total time elapsed: ' + milliseconds + ' ms (' + seconds + ' s)' : '';
		
		// Show status on page
		common.showStatus('processing', message + timeElapsedMessage, true);
	},
	
	/**
	 * Clears the previous status message
	 */
	hideStatus: function()
	{
		// Cache selector
		var $statusMessage = $('.statusMessage');
		
		// Remove past classes, clear the message and hide it
		$statusMessage.removeClass('success error processing');
		$statusMessage.find('.message').text('');
		$statusMessage.hide();
		
		// Clear previous timeout so that new status messages being 
		// shown don't get prematurely hidden by an old timer still running
		window.clearTimeout(common.statusTimeoutId);
	},
	
	/**
	 * Some boilerplate code to start an inline HTML5 Web Worker. This can be used to do CPU intensive tasks and 
	 * prevent the main UI thread from being blocked. Using the ID of the worker it will find the code within the 
	 * <script id="worker-id" type="javascript/worker"><script> tag of the HTML page and initialise the web worker 
	 * with that code. This inline web worker avoids the same origin policy restrictions when loading a web worker 
	 * from a different file path in Chromium.
	 * See: http://stackoverflow.com/a/18490502
	 * and: http://www.html5rocks.com/en/tutorials/workers/basics/#toc-inlineworkers
	 * @param {String} workerId The CSS ID of the worker to be loaded e.g. 'export-pads-worker'
	 * @returns {Worker} Returns the web worker object
	 */
	startWebWorker: function(workerId)
	{
		// Convert the base URL so the web worker can import the common.js script
		// Also load the JavaScript code on the HTML page which is what the worker will run
		var baseUrl = window.location.href.replace(/\\/g, '/').replace(/\/[^\/]*$/, '');
		var workerJavaScript = $('#' + workerId).html();
        var array = ['var baseUrl = "' + baseUrl + '";' + workerJavaScript];
		
		// Create a Blob to hold the JavaScript code and send it to the inline worker
        var blob = new Blob(array, { type: 'text/javascript' });
		var blobUrl = window.URL.createObjectURL(blob);
		var worker = new Worker(blobUrl);
		
		// Worker error handler
		worker.addEventListener('error', function(event)
		{
			console.error('ERROR: Worker ID ' + workerId + ' line ' + event.lineno + ' in ' + event.filename + ': ' + event.message);
			
		}, false);
		
		// Free up memory
		window.URL.revokeObjectURL(blobUrl);
		
		// Return the worker object so custom listeners can be added
		return worker;
	},
};