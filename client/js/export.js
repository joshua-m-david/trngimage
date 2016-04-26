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
 * Functions to export the data for randomness testing by external programs
 */
var exportData = {
	
	/** Cached jQuery selector for the Export dialog */
	$dialog: null,
		
	/** The least significant bits in the first image from the TRNG */
	randomBitsFirstImageBinary: '',
	randomBitsFirstImageHex: '',
	
	/** The least significant bits in the second image from the TRNG  */
	randomBitsSecondImageBinary: '',
	randomBitsSecondImageHex: '',
	
	/** Get the least significant bits from both images XORed together from the TRNG */
	randomBitsXoredBinary: '',
	randomBitsXoredHex: '',
	
	/** Get the final bits after randomness extraction from the TRNG */
	randomBitsExtractedBinary: '',
	randomBitsExtractedHex: '',
		
	/**
	 * Configure the Export dialog to open and all functionality within
	 */
	initExportDialog: function()
	{
		// Cache to prevent extra DOM lookups
		this.$dialog = $('#exportSettings');
		
		// Configure button to open export dialog
		$('#btnOpenExportSettings').click(function()
		{
			// Hide previous status messages and open the dialog
			common.hideStatus();
			
			// Open jQueryUI dialog
			exportData.$dialog.dialog('open');
		});

		// Configure entropy collection settings dialog using jQueryUI
		this.$dialog.dialog(
		{
			autoOpen: false,
			create: function (event)
			{
				// Set the dialog position as fixed before opening the dialog. See: http://stackoverflow.com/a/6500385
				$(event.target).parent().css('position', 'fixed');
			},
			modal: true,
			resizable: false,
			width: 500
		});
				
		// Initialise other functionality within the dialog
		this.initExportButton();
	},
			
	/**
	 * Initialise the button to export the random data for external testing
	 */
	initExportButton: function()
	{
		// Export the data
		$('#btnExport').click(function()
		{
			// Get the selected export method
			var exportMethod = $('#exportMethod').val();

			// Export the random data for testing using external methods
			exportData.prepareRandomDataForExternalTesting(exportMethod);
		});
	},
	
	/**
	 * Exports the random data to the clipboard in various formats or to a binary file
	 * @param {String} exportMethod The value from the exportMethod select box which says how the data should be 
	 *                              exported e.g. 'testExportEntropyExtractedHexadecimal' will export the final 
	 *                              extracted random data to an ASCII text file with hexadecimal symbols in it.
	 */
	prepareRandomDataForExternalTesting: function(exportMethod)
	{		
		var entropyBinary = '';
		var entropyHex = '';
		var output = '';
		var filename = '';
		
		// Get the entropy relevant to which option they have chosen in the 'Export to' select box
		if (exportMethod.indexOf('EntropyFirstImage') !== -1)
		{
			// Get the least significant bits in the first image
			entropyBinary = exportData.randomBitsFirstImageBinary;
			entropyHex = exportData.randomBitsFirstImageHex;
		}
		else if (exportMethod.indexOf('EntropySecondImage') !== -1)
		{
			// Get the least significant bits in the second image
			entropyBinary = exportData.randomBitsSecondImageBinary;
			entropyHex = exportData.randomBitsSecondImageHex;
		}
		else if (exportMethod.indexOf('EntropyXored') !== -1)
		{
			// Get the least significant bits from both images XORed together
			entropyBinary = exportData.randomBitsXoredBinary;
			entropyHex = exportData.randomBitsXoredHex;
		}
		else if (exportMethod.indexOf('EntropyExtracted') !== -1)
		{
			// Get the final bits after randomness extraction
			entropyBinary = exportData.randomBitsExtractedBinary;
			entropyHex = exportData.randomBitsExtractedHex;
		}
		
		// Export to binary file. This format can be used by the NIST SP 800-22 tool.
		if (exportMethod.indexOf('BinaryFile') !== -1)
		{
			// Convert to hexadecimal then WordArray objects for CryptoJS to use
			var words = CryptoJS.enc.Hex.parse(entropyHex);
			var outputBase64 = CryptoJS.enc.Base64.stringify(words);
			
			// Output the binary file and prompt the user to save it
			location.href = 'data:application/octet-stream;base64,' + outputBase64;
			
			// Finished, exit early
			return true;
		}
		
		// Export to Base 64
		else if (exportMethod.indexOf('Base64') !== -1)
		{
			// Convert to WordArray objects for CryptoJS to use			
			var words = CryptoJS.enc.Hex.parse(entropyHex);
			
			// Set the filename and encode to Base64
			filename = 'ascii-base64.txt';
			output = CryptoJS.enc.Base64.stringify(words);
		}
		
		// Export to hexadecimal string
		else if (exportMethod.indexOf('Hexadecimal') !== -1)
		{
			filename = 'ascii-hexadecimal.txt';
			output = entropyHex;
		}
		
		// Export to ASCII binary string e.g. '01011100...'. This format can be used by the NIST SP 800-22 tool.
		else if (exportMethod.indexOf('Binary') !== -1)
		{
			filename = 'ascii-binary.txt';
			output = entropyBinary;			
		}
		
		// Create a Binary Large Object (BLOB)
		var blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
		
		// Pop up a save dialog for the user to save to a text file
		saveAs(blob, filename);
	}
};