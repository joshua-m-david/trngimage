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
 * Combines files with random hexadecimal string data into a single file which 
 * can be imported into an external tool for more strenuous randomness testing.
 */
var trngCombiner = {
	
	/** A jQuery selector for the TRNG combiner page container */
	$page: null,
	
	/** The number of files that have been loaded so far */
	numFilesLoaded: 0,
	
	/** The total number of files selected to be loaded */
	totalNumFiles: 0,
	
	/** All the hexadecimal data from the files concatenated together */
	allDataHex: '',
	
	/** The display output row HTML */
	rowHtml: '',
	
	/**
	 * Initialise the page code
	 */
	init: function()
	{
		// Cache page selector for faster DOM lookups
		trngCombiner.$page = $('.trngCombinerPage');
		
		// Init
		trngCombiner.initResetButton();
		trngCombiner.initBrowseFilesButton();
		trngCombiner.initExportFileButton();
	},
	
	/**
	 * When files are uploaded
	 */
	initBrowseFilesButton: function()
	{
		// When the browse files button is clicked and files selected
		trngCombiner.$page.find('#fileLoader').change(function()
		{
			// Disable adding more files after files selected, they can use the Restart button
			trngCombiner.$page.find('#fileLoader').attr('disabled', true);
			trngCombiner.$page.find('#fileLoaderLabel').addClass('disabled');
			
			// Get the files
			var files = $(this)[0].files;
			var totalNumFiles = files.length;

			// Set for use later
			trngCombiner.totalNumFiles = totalNumFiles;

			// For every file
			for (var i = 0; i < files.length; i++)
			{
				// Load the file information
				trngCombiner.loadFileInformation(files[i]);
			}		
		});
	},
		
	/**
	 * Loads the file information
	 * @param {Object} file A file with hexadecimal string data
	 */
	loadFileInformation: function(file)
	{
		// Get the file name, size and type
		var fileName = file.name;
		var fileSize = common.formatNumberWithCommas(file.size);
		
		// Use HTML5 FileReader API
		var reader = new FileReader();

		// Read as a text file
		reader.readAsText(file);
		
		// Callback when file is loaded
		reader.onload = function(event)
		{
			// Concatenate the data to the previous data and increment count of files loaded
			trngCombiner.allDataHex += event.target.result;
			trngCombiner.numFilesLoaded += 1;
			
			// Clone the row
			var $row = trngCombiner.$page.find('.template').clone();
			var totalHexSymbols = event.target.result.length;
			var totalHexSymbolsFormatted = common.formatNumberWithCommas(totalHexSymbols);
			
			// Populate values
			$row.removeClass('template');
			$row.find('.fileName').text(fileName);
			$row.find('.fileSize').text(fileSize + ' Bytes');
			$row.find('.totalHexSymbols').text(totalHexSymbolsFormatted);
			
			// Add the row to the output
			trngCombiner.rowHtml += $row.prop('outerHTML');
			
			// If all the files are loaded
			if (trngCombiner.numFilesLoaded === trngCombiner.totalNumFiles)
			{
				// Enable other buttons and show the loaded files
				trngCombiner.$page.find('#btnRestart').removeAttr('disabled');
				trngCombiner.$page.find('#exportFile').removeAttr('disabled');
				trngCombiner.$page.find('.collectionAmounts.fileInfo').append(trngCombiner.rowHtml).show();
				
				// Format the total number of hexadecimal symbols loaded
				var totalHexSymbolsLoaded = trngCombiner.allDataHex.length;
				var totalHexSymbolsLoadedFormatted = common.formatNumberWithCommas(totalHexSymbolsLoaded);
				var totalBytes = ((totalHexSymbolsLoaded * 4) / 8);
				var totalBytesFormatted = common.formatNumberWithCommas(totalBytes);
				var totalMegaBytes = (totalBytes / 1024 / 1024).toFixed(3);
				var totalMegaBytesFormatted = common.formatNumberWithCommas(totalMegaBytes);
					
				// Show final status
				common.showStatus('success',
				                  'All data loaded. Total hex symbols: ' + totalHexSymbolsLoadedFormatted
				                + ' Total Bytes: ' + totalBytesFormatted
				                + ' Total MB: ' + totalMegaBytesFormatted
				                , true);
			}
		};
	},
			
	/**
	 * Reloads the page so the user can start a new upload
	 */
	initResetButton: function()
	{
		// On Reset button click
		trngCombiner.$page.find('#btnRestart').click(function()
		{
			// Hard refresh the page (ignores browser cache)
			location.reload(true);
		});
	},
	
	/**
	 * Enable the export button which will convert the data to Base64 and prompt a save dialog
	 */
	initExportFileButton: function()
	{
		// Enable the export button and save the file when clicked
		trngCombiner.$page.find('#exportFile').click(function()
		{
			// Convert to hexadecimal then WordArray objects for CryptoJS to use
			var words = CryptoJS.enc.Hex.parse(trngCombiner.allDataHex);
			var outputBase64 = CryptoJS.enc.Base64.stringify(words);

			// Output the binary file and prompt the user to save it
			location.href = 'data:application/octet-stream;base64,' + outputBase64;
		});
	}
};