const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  url: string;
}

interface ExtractResponse {
  success: boolean;
  image_base64?: string;
  error?: string;
}

// Validate if a string looks like a valid image URL
function isValidImageUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  
  // Must start with http, https, or //
  if (!urlString.startsWith('http://') && !urlString.startsWith('https://') && !urlString.startsWith('//')) {
    return false;
  }
  
  // Should not contain HTML/CSS content indicators
  const invalidPatterns = [
    '<', '>', '{', '}', 'background-image', 'url(', '</style', '<script',
    '.nav-sprite', '.css', 'sprite'
  ];
  
  for (const pattern of invalidPatterns) {
    if (urlString.includes(pattern)) {
      return false;
    }
  }
  
  // Should look like an image URL or CDN URL
  const validPatterns = [
    /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i,
    /images\./i,
    /\.media-amazon\.com/i,
    /cdn\./i,
    /\.cloudinary\.com/i,
    /\.imgix\.net/i,
  ];
  
  return validPatterns.some(pattern => pattern.test(urlString));
}

// Extract image from JSON-LD data
function extractImageFromJson(data: any): string | null {
  if (!data) return null;
  
  if (typeof data.image === 'string') {
    return data.image;
  }
  
  if (Array.isArray(data.image) && data.image.length > 0) {
    const first = data.image[0];
    return typeof first === 'string' ? first : first?.url || null;
  }
  
  if (data.image?.url) {
    return data.image.url;
  }
  
  // Check for product images in @graph
  if (Array.isArray(data['@graph'])) {
    for (const item of data['@graph']) {
      const img = extractImageFromJson(item);
      if (img) return img;
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url }: ExtractRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' } as ExtractResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting image from URL:', url);

    // Check if it's a direct image URL
    const isDirectImage = /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);

    let imageUrl = url;

    if (!isDirectImage) {
      // Fetch the page and try to extract the main product image
      try {
        const pageResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
        });

        if (!pageResponse.ok) {
          throw new Error(`Failed to fetch page: ${pageResponse.status}`);
        }

        const html = await pageResponse.text();

        // Try to extract product image URL using various patterns
        const imagePatterns = [
          // Open Graph image (most reliable)
          /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
          /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i,
          // Twitter image
          /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
          /<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i,
          // Amazon specific - landingImage
          /id=["']landingImage["'][^>]+src=["']([^"']+)["']/i,
          /id=["']imgBlkFront["'][^>]+src=["']([^"']+)["']/i,
          // Data-src attributes (lazy loading)
          /data-old-hires=["']([^"']+)["']/i,
          /data-a-dynamic-image=["']\{["']([^"']+)["']/i,
        ];

        for (const pattern of imagePatterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            let candidateUrl = match[1].trim();
            
            // Validate it looks like an image URL
            if (!isValidImageUrl(candidateUrl)) {
              continue;
            }
            
            // Handle relative URLs
            if (candidateUrl.startsWith('//')) {
              candidateUrl = 'https:' + candidateUrl;
            } else if (candidateUrl.startsWith('/')) {
              const urlObj = new URL(url);
              candidateUrl = urlObj.origin + candidateUrl;
            }
            
            // Final validation
            if (isValidImageUrl(candidateUrl)) {
              imageUrl = candidateUrl;
              console.log('Found valid image URL:', imageUrl);
              break;
            }
          }
        }

        // If no image found from meta tags, try JSON-LD
        if (imageUrl === url) {
          const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
          if (jsonLdMatch) {
            for (const jsonScript of jsonLdMatch) {
              try {
                const jsonContent = jsonScript.replace(/<\/?script[^>]*>/gi, '');
                const jsonData = JSON.parse(jsonContent);
                const extractedImage = extractImageFromJson(jsonData);
                if (extractedImage && isValidImageUrl(extractedImage)) {
                  imageUrl = extractedImage;
                  console.log('Found image from JSON-LD:', imageUrl);
                  break;
                }
              } catch {
                // Continue if JSON parsing fails
              }
            }
          }
        }
      } catch (fetchError) {
        console.error('Error fetching page:', fetchError);
        // Continue with original URL as fallback
      }
    }

    // Fetch the image
    console.log('Fetching image:', imageUrl);
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
        'Referer': url,
      },
    });

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch image: ${imageResponse.status}` 
        } as ExtractResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log('Successfully extracted image, size:', imageBuffer.byteLength);

    return new Response(
      JSON.stringify({ 
        success: true, 
        image_base64: dataUrl 
      } as ExtractResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error extracting image:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as ExtractResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
