### Experimental TRNG using photo sensor noise
#### Copyright (c) 2016  Joshua M. David

1. The user should select two photos of good quality. For example macro shots of sand at a beach, in focus and with 
   good lighting. The photo should be taken in RAW mode if possible, then converted to a lossless format such as PNG.

2. For the first image:
* 2a) Take a 24 bit RGB pixel in the photo and collect the least significant bit of each colour in that pixel e.g. 1 bit for each red, green and blue colour.
* 2b) XOR those 3 bits together into a single bit. Store that bit into an output stream of bits.
* 2c) Repeat step 2a and 2b for the remaining pixels in the photo.

3. Repeat step 2 for the second image.

4. Take the two output streams from step 2 and 3 then XOR them together to create a combined output stream.

5. Run the Basic Von Neumann Extractor on the combined output stream in step 4. This is the final random data.

The program also includes some basic randomness tests and display methods to view the random data as a bitmap or colour 
bitmap image. The random data produced passes FIPS 140-2, Diehard and NIST SP 800-22 statistical tests. The program 
also allows for the random data to be exported for testing with external statistical testing tools. 
