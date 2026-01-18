// Netlify serverless function to fetch Claude share conversations
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get URL from query params or POST body
    let shareUrl;

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      shareUrl = body.url;
    } else {
      shareUrl = event.queryStringParameters?.url;
    }

    if (!shareUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing URL parameter' })
      };
    }

    // Validate it's a Claude share URL
    if (!shareUrl.includes('claude.ai/share/')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid Claude share URL' })
      };
    }

    console.log('Fetching:', shareUrl);

    // Fetch the share page with browser-like headers
    const response = await fetch(shareUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow',
      timeout: 10000
    });

    if (!response.ok) {
      console.error('Fetch failed:', response.status, response.statusText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: `Failed to fetch conversation: ${response.status} ${response.statusText}`,
          suggestion: 'The share page may require authentication or be protected. Try copying the text manually.'
        })
      };
    }

    const html = await response.text();

    // Parse the conversation from HTML
    const conversation = parseConversation(html);

    if (!conversation || conversation.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'Could not extract conversation from page',
          suggestion: 'Please try copying and pasting the text manually instead.',
          rawLength: html.length
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        conversation,
        messageCount: conversation.length
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        suggestion: 'Please try copying and pasting the conversation text manually instead.'
      })
    };
  }
};

/**
 * Parse conversation from HTML
 * @param {string} html - HTML content from share page
 * @returns {Array} - Array of message objects with speaker and content
 */
function parseConversation(html) {
  const messages = [];

  try {
    // Method 1: Look for JSON data in script tags (most reliable)
    const jsonMatch = html.match(/<script[^>]*>.*?window\.__INITIAL_STATE__\s*=\s*({.*?})\s*<\/script>/s) ||
                     html.match(/<script[^>]*>.*?window\.__data\s*=\s*({.*?})\s*<\/script>/s) ||
                     html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);

    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        // Try to extract messages from the JSON structure
        const extracted = extractMessagesFromJSON(data);
        if (extracted.length > 0) {
          return extracted;
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }

    // Method 2: Parse HTML structure
    // Look for common patterns in Claude share pages

    // Try to find message containers
    const messagePatterns = [
      /<div[^>]*class="[^"]*message[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<div[^>]*data-role="message"[^>]*>(.*?)<\/div>/gis,
      /<article[^>]*>(.*?)<\/article>/gis
    ];

    for (const pattern of messagePatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach((match, index) => {
          const content = stripHtml(match[1]);
          if (content.trim().length > 10) { // Ignore very short matches
            messages.push({
              speaker: index % 2 === 0 ? 'Darko' : 'Claude',
              content: content.trim()
            });
          }
        });

        if (messages.length > 0) {
          return messages;
        }
      }
    }

    // Method 3: Fallback - try to extract any substantial text content
    const textContent = stripHtml(html);
    if (textContent.length > 100) {
      // Return as a single message and let the frontend parser handle it
      return [{
        speaker: 'raw',
        content: textContent
      }];
    }

  } catch (error) {
    console.error('Parse error:', error);
  }

  return messages;
}

/**
 * Extract messages from JSON data structure
 */
function extractMessagesFromJSON(data) {
  const messages = [];

  // Recursive function to find message arrays
  function findMessages(obj) {
    if (!obj || typeof obj !== 'object') return;

    // Look for common message array patterns
    if (Array.isArray(obj)) {
      // Check if this looks like a messages array
      if (obj.length > 0 && obj[0].role && obj[0].content) {
        obj.forEach(msg => {
          messages.push({
            speaker: msg.role === 'user' ? 'Darko' : 'Claude',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          });
        });
        return;
      }
      // Recursively search array items
      obj.forEach(item => findMessages(item));
    } else {
      // Search object properties
      Object.values(obj).forEach(value => findMessages(value));
    }
  }

  findMessages(data);
  return messages;
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
