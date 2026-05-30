using System;
using System.IO;
using System.Threading.Tasks;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;
using Windows.Storage.Streams;

namespace WinOcrApp
{
    class Program
    {
        static async Task Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("Error: Please provide an image path.");
                return;
            }

            string imagePath = args[0];
            if (!File.Exists(imagePath))
            {
                Console.WriteLine($"Error: Image file not found at '{imagePath}'");
                return;
            }

            try
            {
                // Load file as StorageFile
                StorageFile file = await StorageFile.GetFileFromPathAsync(Path.GetFullPath(imagePath));
                
                // Open a random access stream on the file
                using (IRandomAccessStream stream = await file.OpenAsync(FileAccessMode.Read))
                {
                    // Decode bitmap
                    BitmapDecoder decoder = await BitmapDecoder.CreateAsync(stream);
                    using (SoftwareBitmap softwareBitmap = await decoder.GetSoftwareBitmapAsync())
                    {
                        // Initialize Windows OCR engine
                        OcrEngine? engine = OcrEngine.TryCreateFromUserProfileLanguages();
                        
                        if (engine == null)
                        {
                            // Try creating explicitly for Turkish
                            engine = OcrEngine.TryCreateFromLanguage(new Windows.Globalization.Language("tr-TR"));
                        }
                        
                        if (engine == null)
                        {
                            // Try creating explicitly for English
                            engine = OcrEngine.TryCreateFromLanguage(new Windows.Globalization.Language("en-US"));
                        }

                        if (engine == null)
                        {
                            Console.WriteLine("Error: Could not initialize Windows OCR engine in any language.");
                            return;
                        }

                        // Run OCR
                        OcrResult result = await engine.RecognizeAsync(softwareBitmap);
                        
                        // Output the text to stdout
                        Console.WriteLine(result.Text);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during Windows OCR processing: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }
        }
    }
}
