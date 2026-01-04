const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

// Browserless API for headless Chrome scraping (free tier: 1000 units)
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;

// Fallback to Browserless when direct scraping fails
async function tryBrowserless(url) {
  if (!BROWSERLESS_API_KEY) {
    console.log('Browserless API key not configured');
    return null;
  }
  
  try {
    console.log('Trying Browserless /unblock fallback for:', url);
    
    // Use /unblock API with residential proxy for heavily protected sites
    const response = await axios.post(
      `https://production-sfo.browserless.io/unblock?token=${BROWSERLESS_API_KEY}&proxy=residential`,
      {
        url: url,
        content: true,  // Return HTML content
        browserWSEndpoint: false,
        cookies: false
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('Browserless response status:', response.status);
    
    if (response.status === 200 && response.data && response.data.content) {
      // Parse the HTML
      const $ = cheerio.load(response.data.content);
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Extract title
      let title = '';
      const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
      for (const script of jsonLdScripts) {
        try {
          let data = JSON.parse($(script).html());
          if (data['@graph']) {
            data = data['@graph'].find(item => item['@type'] === 'Product') || data;
          }
          if (data['@type'] === 'Product' && data.name) {
            title = data.name;
            break;
          }
        } catch (e) {}
      }
      
      if (!title) {
        title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text().trim() || '';
      }
      
      // Clean up title
      title = title.split('|')[0].split(' - ')[0].replace(/\s+/g, ' ').trim();
      
      // Extract price
      let price = null;
      for (const script of jsonLdScripts) {
        try {
          let data = JSON.parse($(script).html());
          if (data['@graph']) {
            data = data['@graph'].find(item => item['@type'] === 'Product') || data;
          }
          if (data['@type'] === 'Product' && data.offers) {
            const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;
            const priceValue = offers.price || offers.lowPrice;
            if (priceValue) {
              price = parseFloat(priceValue);
              break;
            }
          }
        } catch (e) {}
      }
      
      if (!price) {
        const priceMeta = $('meta[property="product:price:amount"]').attr('content') ||
                          $('meta[property="og:price:amount"]').attr('content');
        if (priceMeta) price = parseFloat(priceMeta.replace(/[^0-9.]/g, ''));
      }
      
      // Extract image
      let imageUrl = '';
      for (const script of jsonLdScripts) {
        try {
          let data = JSON.parse($(script).html());
          if (data['@graph']) {
            data = data['@graph'].find(item => item['@type'] === 'Product') || data;
          }
          if (data['@type'] === 'Product' && data.image) {
            imageUrl = Array.isArray(data.image) ? data.image[0] : data.image;
            if (typeof imageUrl === 'object') imageUrl = imageUrl.url || '';
            break;
          }
        } catch (e) {}
      }
      
      if (!imageUrl) {
        imageUrl = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') || '';
      }
      
      // Make image URL absolute
      if (imageUrl && !imageUrl.startsWith('http')) {
        try {
          imageUrl = new URL(imageUrl, url).href;
        } catch (e) {
          imageUrl = '';
        }
      }
      
      console.log('Browserless success:', title?.substring(0, 50));
      
      if (title) {
        return {
          title: title.substring(0, 255),
          price,
          domain,
          image_url: imageUrl,
          original_url: url,
          description: ($('meta[property="og:description"]').attr('content') || '').substring(0, 500),
          source: 'browserless'
        };
      }
    }
    
    console.log('Browserless returned no usable data');
    return null;
  } catch (err) {
    console.error('Browserless fallback failed:', err.message);
    if (err.response) {
      console.error('Browserless error response:', err.response.status, err.response.data);
    }
    return null;
  }
}

// Scrape URL for product info
router.post('/', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Parse domain
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    // Fetch the page with multiple user agents as fallback
    let response;
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    ];

    for (const ua of userAgents) {
      try {
        response = await axios.get(url, {
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 15000,
          maxRedirects: 10,
          validateStatus: (status) => status < 500
        });
        if (response.status === 200) break;
      } catch (e) {
        continue;
      }
    }

    // If direct fetch failed, try Browserless as fallback
    if (!response || response.status !== 200) {
      const browserlessData = await tryBrowserless(url);
      if (browserlessData) {
        return res.json(browserlessData);
      }
      throw new Error('Failed to fetch page');
    }

    const $ = cheerio.load(response.data);

    // ============ EXTRACT TITLE ============
    let title = '';
    
    // Try structured data first (most reliable)
    const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
    for (const script of jsonLdScripts) {
      try {
        let data = JSON.parse($(script).html());
        // Handle @graph arrays
        if (data['@graph']) {
          data = data['@graph'].find(item => item['@type'] === 'Product') || data;
        }
        if (data['@type'] === 'Product' && data.name) {
          title = data.name;
          break;
        }
      } catch (e) {}
    }

    // Fallback to meta tags
    if (!title) {
      title = 
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('meta[name="title"]').attr('content') ||
        '';
    }

    // Fallback to common product title selectors
    if (!title) {
      const titleSelectors = [
        '[data-testid="product-title"]',
        '[data-automation="product-title"]',
        '.product-title',
        '.product-name',
        '.product__title',
        '#productTitle',
        '[itemprop="name"]',
        'h1.title',
        'h1[class*="product"]',
        'h1[class*="Product"]',
        '.pdp-title',
        '.item-title',
        'h1'
      ];
      
      for (const selector of titleSelectors) {
        const el = $(selector).first();
        if (el.length && el.text().trim()) {
          title = el.text().trim();
          break;
        }
      }
    }

    // Last resort: page title
    if (!title) {
      title = $('title').text().trim();
    }

    // Clean up title
    title = title
      .split('|')[0]
      .split(' - ')[0]
      .split(' – ')[0]
      .split(' — ')[0]
      .replace(/\s+/g, ' ')
      .trim();

    // ============ EXTRACT PRICE ============
    let price = null;
    
    // Try structured data first
    for (const script of jsonLdScripts) {
      try {
        let data = JSON.parse($(script).html());
        if (data['@graph']) {
          data = data['@graph'].find(item => item['@type'] === 'Product') || data;
        }
        if (data['@type'] === 'Product' && data.offers) {
          const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;
          const priceValue = offers.price || offers.lowPrice || offers.highPrice;
          if (priceValue) {
            price = parseFloat(priceValue);
            break;
          }
        }
      } catch (e) {}
    }

    // Try meta tags
    if (!price) {
      const priceMeta = 
        $('meta[property="product:price:amount"]').attr('content') ||
        $('meta[property="og:price:amount"]').attr('content') ||
        $('meta[name="price"]').attr('content') ||
        $('meta[itemprop="price"]').attr('content');
      if (priceMeta) {
        price = parseFloat(priceMeta.replace(/[^0-9.]/g, ''));
      }
    }

    // Try common price selectors
    if (!price) {
      const priceSelectors = [
        '[data-testid="current-price"]',
        '[data-automation="product-price"]',
        '[data-price]',
        '[data-product-price]',
        '[itemprop="price"]',
        '.price-current',
        '.price--current',
        '.current-price',
        '.sale-price',
        '.offer-price',
        '.product-price',
        '.product__price',
        '.Price',
        '.price',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '#priceblock_saleprice',
        '.a-price .a-offscreen',
        '[class*="ProductPrice"]',
        '[class*="product-price"]',
        '[class*="currentPrice"]',
        '[class*="sale-price"]',
        '.pdp-price',
        '.item-price',
        'span[class*="price"]',
        'div[class*="price"]'
      ];
      
      for (const selector of priceSelectors) {
        const el = $(selector).first();
        const text = el.attr('content') || el.attr('data-price') || el.attr('data-product-price') || el.text();
        if (text) {
          // Match price patterns like $99.99, 99.99, $1,299.00
          const match = text.match(/\$?\s*([\d,]+\.?\d*)/);
          if (match) {
            const parsed = parseFloat(match[1].replace(/,/g, ''));
            if (parsed > 0 && parsed < 100000) { // Sanity check
              price = parsed;
              break;
            }
          }
        }
      }
    }

    // ============ EXTRACT IMAGE ============
    let imageUrl = '';
    
    // Try structured data first
    for (const script of jsonLdScripts) {
      try {
        let data = JSON.parse($(script).html());
        if (data['@graph']) {
          data = data['@graph'].find(item => item['@type'] === 'Product') || data;
        }
        if (data['@type'] === 'Product' && data.image) {
          imageUrl = Array.isArray(data.image) ? data.image[0] : data.image;
          if (typeof imageUrl === 'object') imageUrl = imageUrl.url || imageUrl['@id'] || '';
          break;
        }
      } catch (e) {}
    }

    // Try meta tags
    if (!imageUrl) {
      imageUrl = 
        $('meta[property="og:image"]').attr('content') ||
        $('meta[property="og:image:secure_url"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[name="twitter:image:src"]').attr('content') ||
        $('meta[itemprop="image"]').attr('content') ||
        '';
    }

    // Try common image selectors
    if (!imageUrl) {
      const imageSelectors = [
        '[data-testid="product-image"] img',
        '[data-automation="product-image"] img',
        '.product-image img',
        '.product__image img',
        '#product-image img',
        '#main-image',
        '[itemprop="image"]',
        '.pdp-image img',
        '.gallery-image img',
        '.primary-image',
        '[class*="ProductImage"] img',
        '[class*="product-image"] img',
        '.slick-current img',
        '.selected img',
        '[data-zoom-image]',
        'img[class*="product"]',
        'img[class*="Product"]',
        // Additional selectors for common e-commerce platforms
        '.product-gallery img',
        '.product-single__photo img',
        '.product-featured-img',
        '[data-main-image]',
        '.product-media img',
        '.woocommerce-product-gallery__image img',
        '.ProductItem__Image img',
        '.product_image img',
        '[data-image-large]',
        '.carousel-inner img',
        '.swiper-slide-active img',
        '.main-product-image img'
      ];
      
      for (const selector of imageSelectors) {
        const el = $(selector).first();
        // Check multiple attributes for the image source
        const src = el.attr('src') || 
                    el.attr('data-src') || 
                    el.attr('data-zoom-image') || 
                    el.attr('data-large') ||
                    el.attr('data-image-large') ||
                    el.attr('data-lazy-src') ||
                    el.attr('data-original');
        
        if (src && !src.includes('placeholder') && !src.includes('loading') && !src.includes('spinner') && !src.startsWith('data:')) {
          imageUrl = src;
          break;
        }
        
        // Try to get highest resolution from srcset
        const srcset = el.attr('srcset') || el.attr('data-srcset');
        if (srcset) {
          const sources = srcset.split(',').map(s => s.trim().split(' '));
          // Get the largest image (last one usually, or parse widths)
          const largest = sources
            .filter(s => s[0] && !s[0].includes('placeholder'))
            .sort((a, b) => {
              const widthA = parseInt(a[1]) || 0;
              const widthB = parseInt(b[1]) || 0;
              return widthB - widthA;
            })[0];
          if (largest && largest[0]) {
            imageUrl = largest[0];
            break;
          }
        }
      }
    }
    
    // Last resort: find the largest image on the page
    if (!imageUrl) {
      const allImages = $('img').toArray();
      for (const img of allImages) {
        const $img = $(img);
        const src = $img.attr('src') || $img.attr('data-src');
        const width = parseInt($img.attr('width')) || 0;
        const height = parseInt($img.attr('height')) || 0;
        
        if (src && 
            !src.includes('logo') && 
            !src.includes('icon') && 
            !src.includes('placeholder') &&
            !src.includes('avatar') &&
            !src.includes('banner') &&
            !src.startsWith('data:') &&
            (width >= 200 || height >= 200 || (!width && !height))) {
          imageUrl = src;
          break;
        }
      }
    }

    // Make image URL absolute if relative
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, url).href;
      } catch (e) {
        imageUrl = '';
      }
    }

    // Clean up image URL (remove tracking params, get higher res)
    if (imageUrl) {
      try {
        const imgUrl = new URL(imageUrl);
        // Remove common tracking params
        imgUrl.searchParams.delete('w');
        imgUrl.searchParams.delete('h');
        imgUrl.searchParams.delete('width');
        imgUrl.searchParams.delete('height');
        imgUrl.searchParams.delete('size');
        imgUrl.searchParams.delete('quality');
        imageUrl = imgUrl.href;
      } catch (e) {}
    }

    // ============ EXTRACT DESCRIPTION (bonus) ============
    let description = '';
    
    for (const script of jsonLdScripts) {
      try {
        let data = JSON.parse($(script).html());
        if (data['@graph']) {
          data = data['@graph'].find(item => item['@type'] === 'Product') || data;
        }
        if (data['@type'] === 'Product' && data.description) {
          description = data.description;
          break;
        }
      } catch (e) {}
    }

    if (!description) {
      description = 
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';
    }

    console.log(`Scraped ${domain}: title="${title?.substring(0, 50)}...", price=${price}, image=${imageUrl ? 'found' : 'none'}`);

    res.json({
      title: title.substring(0, 255),
      price,
      domain,
      image_url: imageUrl,
      original_url: url,
      description: description.substring(0, 500)
    });

  } catch (err) {
    console.error('Scrape error:', err.message);
    
    // Return partial data even on error
    try {
      const urlObj = new URL(url);
      res.json({
        title: '',
        price: null,
        domain: urlObj.hostname.replace('www.', ''),
        image_url: '',
        original_url: url
      });
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
    }
  }
});

module.exports = router;
