// DOM Elements
const conversationInput = document.getElementById('conversation-input');
const urlInput = document.getElementById('url-input');
const formatBtn = document.getElementById('format-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');
const outputSection = document.getElementById('output-section');
const formattedOutput = document.getElementById('formatted-output');
const copyFeedback = document.getElementById('copy-feedback');
const copyIcon = document.getElementById('copy-icon');
const urlTab = document.getElementById('url-tab');
const textTab = document.getElementById('text-tab');
const urlInputContainer = document.getElementById('url-input-container');
const textInputContainer = document.getElementById('text-input-container');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');

// Current active tab
let activeTab = 'url';

// Event Listeners
formatBtn.addEventListener('click', formatConversation);
clearBtn.addEventListener('click', clearAll);
copyBtn.addEventListener('click', copyToClipboard);
urlTab.addEventListener('click', () => switchTab('url'));
textTab.addEventListener('click', () => switchTab('text'));

// Handle Enter key in textarea (Ctrl/Cmd + Enter to format)
conversationInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        formatConversation();
    }
});

// Handle Enter key in URL input
urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        formatConversation();
    }
});

/**
 * Switch between URL and Text input tabs
 */
function switchTab(tab) {
    activeTab = tab;

    if (tab === 'url') {
        urlTab.classList.add('active');
        textTab.classList.remove('active');
        urlInputContainer.classList.remove('hidden');
        textInputContainer.classList.add('hidden');
        urlInput.focus();
    } else {
        textTab.classList.add('active');
        urlTab.classList.remove('active');
        textInputContainer.classList.remove('hidden');
        urlInputContainer.classList.add('hidden');
        conversationInput.focus();
    }

    // Clear any errors
    errorMessage.classList.add('hidden');
}

/**
 * Main function to format the conversation
 */
async function formatConversation() {
    // Clear previous errors
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';

    if (activeTab === 'url') {
        await formatFromURL();
    } else {
        formatFromText();
    }
}

/**
 * Fetch and format conversation from URL
 */
async function formatFromURL() {
    const url = urlInput.value.trim();

    if (!url) {
        showError('Please paste a Claude share URL first!');
        return;
    }

    // Validate URL format
    if (!url.includes('claude.ai/share/')) {
        showError('Please enter a valid Claude share URL (e.g., https://claude.ai/share/xxx)');
        return;
    }

    // Show loading state
    loadingIndicator.classList.remove('hidden');
    formatBtn.disabled = true;
    formatBtn.textContent = 'Fetching...';

    try {
        const html = await fetchShareHtml(url);
        const messages = extractMessagesFromHtml(html);

        if (!messages.length) {
            showError(
                'Could not automatically fetch the conversation. ' +
                'Please switch to the "Text" tab and copy/paste the conversation manually.',
                true
            );
            return;
        }

        const formatted = formatMessages(messages);

        formattedOutput.textContent = formatted.trim();
        outputSection.classList.remove('hidden');

        // Scroll to output
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('Error fetching conversation:', error);
        showError(
            `Failed to fetch: ${error.message}. ` +
            'Try switching to the "Text" tab and copying the conversation manually.',
            true
        );
    } finally {
        // Hide loading state
        loadingIndicator.classList.add('hidden');
        formatBtn.disabled = false;
        formatBtn.textContent = 'Format Conversation';
    }
}

/**
 * Fetch Claude share page HTML via a CORS-friendly proxy
 * @param {string} url - Claude share URL
 * @returns {Promise<string>} - HTML content
 */
async function fetchShareHtml(url) {
    const normalizedUrl = url.replace(/^https?:\/\//, '');
    const proxyUrl = `https://r.jina.ai/http://${normalizedUrl}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
        throw new Error(`Proxy fetch failed (${response.status})`);
    }

    return response.text();
}

/**
 * Extract messages from Claude share HTML
 * @param {string} html - Share page HTML
 * @returns {Array} - Array of { speaker, content }
 */
function extractMessagesFromHtml(html) {
    const nextData = extractNextData(html);
    if (!nextData) {
        return [];
    }

    const messageArray = extractMessagesFromNextData(nextData);
    if (!messageArray || messageArray.length === 0) {
        return [];
    }

    return normalizeMessages(messageArray);
}

/**
 * Extract __NEXT_DATA__ JSON from HTML
 * @param {string} html - HTML string
 * @returns {object|null}
 */
function extractNextData(html) {
    const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
        try {
            return JSON.parse(scriptMatch[1]);
        } catch (error) {
            console.warn('Failed to parse __NEXT_DATA__ JSON', error);
        }
    }

    const inlineMatch = html.match(/__NEXT_DATA__\s*=\s*({[\s\S]*?})\s*<\/script>/i);
    if (inlineMatch) {
        try {
            return JSON.parse(inlineMatch[1]);
        } catch (error) {
            console.warn('Failed to parse inline __NEXT_DATA__ JSON', error);
        }
    }

    return null;
}

/**
 * Extract messages array from Next.js data structure
 * @param {object} data - Parsed __NEXT_DATA__ JSON
 * @returns {Array}
 */
function extractMessagesFromNextData(data) {
    const candidatePaths = [
        ['props', 'pageProps', 'conversation', 'messages'],
        ['props', 'pageProps', 'conversation', 'chat_messages'],
        ['props', 'pageProps', 'messages'],
        ['props', 'pageProps', 'data', 'messages']
    ];

    for (const path of candidatePaths) {
        const result = getValueAtPath(data, path);
        if (Array.isArray(result) && result.length > 0) {
            return result;
        }
    }

    return findMessageArray(data);
}

/**
 * Get value at a nested path in an object
 * @param {object} obj - Object to query
 * @param {string[]} path - Path array
 * @returns {*}
 */
function getValueAtPath(obj, path) {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

/**
 * Find a likely message array by walking the object
 * @param {object} node - JSON node
 * @returns {Array|null}
 */
function findMessageArray(node) {
    if (!node) {
        return null;
    }

    if (Array.isArray(node)) {
        if (node.length && node.every(item => typeof item === 'object' && item)) {
            const sample = node[0];
            const hasSpeaker = 'role' in sample || 'sender' in sample || 'speaker' in sample || 'author' in sample;
            const hasContent = 'content' in sample || 'text' in sample || 'completion' in sample || 'message' in sample;
            if (hasSpeaker && hasContent) {
                return node;
            }
        }

        for (const item of node) {
            const found = findMessageArray(item);
            if (found) {
                return found;
            }
        }
    } else if (typeof node === 'object') {
        for (const value of Object.values(node)) {
            const found = findMessageArray(value);
            if (found) {
                return found;
            }
        }
    }

    return null;
}

/**
 * Normalize message objects into { speaker, content }
 * @param {Array} messages - Raw message objects
 * @returns {Array}
 */
function normalizeMessages(messages) {
    return messages
        .map((message, index) => {
            const content = extractMessageContent(message);
            const speaker = extractMessageSpeaker(message, index);
            return content ? { speaker, content } : null;
        })
        .filter(Boolean);
}

/**
 * Extract message content from a raw message object
 * @param {*} message - Raw message
 * @returns {string|null}
 */
function extractMessageContent(message) {
    if (!message) {
        return null;
    }

    if (typeof message === 'string') {
        return message.trim();
    }

    const directText = message.text || message.completion;
    if (typeof directText === 'string') {
        return directText.trim();
    }

    if (typeof message.content === 'string') {
        return message.content.trim();
    }

    if (Array.isArray(message.content)) {
        const parts = message.content
            .map(part => {
                if (typeof part === 'string') {
                    return part;
                }
                if (part && typeof part === 'object') {
                    return part.text || part.content || part.value || '';
                }
                return '';
            })
            .filter(Boolean);
        if (parts.length) {
            return parts.join('\n').trim();
        }
    }

    if (message.message) {
        return extractMessageContent(message.message);
    }

    return null;
}

/**
 * Extract speaker from a raw message object
 * @param {*} message - Raw message
 * @param {number} index - Message index fallback
 * @returns {string}
 */
function extractMessageSpeaker(message, index) {
    const rawSpeaker =
        message?.role ||
        message?.speaker ||
        message?.sender ||
        message?.author?.role ||
        message?.author ||
        message?.message?.role;

    const normalized = typeof rawSpeaker === 'string' ? rawSpeaker.toLowerCase() : '';

    if (normalized.includes('assistant') || normalized.includes('claude')) {
        return 'Claude';
    }
    if (normalized.includes('user') || normalized.includes('human')) {
        return 'Darko';
    }

    return index % 2 === 0 ? 'Darko' : 'Claude';
}

/**
 * Format messages into a labeled conversation
 * @param {Array} messages - Array of { speaker, content }
 * @returns {string}
 */
function formatMessages(messages) {
    return messages
        .map((msg, index) => {
            const speaker = msg.speaker || (index % 2 === 0 ? 'Darko' : 'Claude');
            return `${speaker}: ${msg.content.trim()}`;
        })
        .join('\n\n');
}

/**
 * Format conversation from pasted text
 */
function formatFromText() {
    const rawText = conversationInput.value.trim();

    if (!rawText) {
        showError('Please paste a conversation first!');
        return;
    }

    try {
        const formatted = parseAndFormat(rawText);

        if (!formatted) {
            showError('Could not parse the conversation. Please make sure you copied the entire conversation.');
            return;
        }

        formattedOutput.textContent = formatted;
        outputSection.classList.remove('hidden');

        // Scroll to output
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Error formatting conversation:', error);
        showError('An error occurred while formatting. Please try again.');
    }
}

/**
 * Show error message
 */
function showError(message, switchToTextTab = false) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');

    if (switchToTextTab) {
        // Optionally suggest switching tabs
        setTimeout(() => {
            const shouldSwitch = confirm('Would you like to switch to manual text input mode?');
            if (shouldSwitch) {
                switchTab('text');
            }
        }, 500);
    }
}

/**
 * Parse and format the conversation with speaker labels
 * @param {string} text - Raw conversation text
 * @returns {string} - Formatted conversation with Darko: and Claude: labels
 */
function parseAndFormat(text) {
    // Remove excessive whitespace and normalize line breaks
    text = text.trim().replace(/\r\n/g, '\n');

    // Strategy: Detect conversation turns by looking for patterns
    // Claude share pages typically alternate between user and assistant

    // Split by potential message boundaries
    // Look for patterns like multiple newlines, or common separators
    let messages = [];
    let currentMessage = '';
    let isUserMessage = true; // Assume first message is from user

    // Try to detect if text has existing speaker labels
    const hasExistingLabels = /^(You|User|Darko|Claude|Assistant):/im.test(text);

    if (hasExistingLabels) {
        // If already labeled, parse those labels
        messages = parseLabeled(text);
    } else {
        // Try to intelligently split the conversation
        messages = smartSplit(text);
    }

    // Format with proper labels
    let formatted = '';
    messages.forEach((msg, index) => {
        const speaker = msg.speaker || (index % 2 === 0 ? 'Darko' : 'Claude');
        const content = msg.content.trim();

        if (content) {
            formatted += `${speaker}: ${content}\n\n`;
        }
    });

    return formatted.trim();
}

/**
 * Parse text that already has speaker labels
 * @param {string} text - Text with existing labels
 * @returns {Array} - Array of message objects
 */
function parseLabeled(text) {
    const messages = [];

    // Split by speaker labels
    const parts = text.split(/^(You|User|Darko|Claude|Assistant):\s*/im);

    for (let i = 1; i < parts.length; i += 2) {
        const speakerRaw = parts[i].toLowerCase();
        const content = parts[i + 1];

        // Normalize speaker names
        let speaker;
        if (speakerRaw.includes('you') || speakerRaw.includes('user') || speakerRaw.includes('darko')) {
            speaker = 'Darko';
        } else {
            speaker = 'Claude';
        }

        messages.push({ speaker, content: content.trim() });
    }

    return messages;
}

/**
 * Smart split for unlabeled conversations
 * Uses heuristics to detect message boundaries
 * @param {string} text - Raw conversation text
 * @returns {Array} - Array of message objects
 */
function smartSplit(text) {
    const messages = [];

    // Split by double newlines or more (common message separator)
    const chunks = text.split(/\n\s*\n+/);

    // If we only got one chunk, try splitting by single newlines with patterns
    if (chunks.length === 1) {
        return alternatingSimpleSplit(text);
    }

    // Process chunks
    chunks.forEach((chunk, index) => {
        const trimmed = chunk.trim();
        if (trimmed) {
            // Determine speaker based on position (alternating)
            // First message is typically user
            const speaker = index % 2 === 0 ? 'Darko' : 'Claude';
            messages.push({ speaker, content: trimmed });
        }
    });

    // Fallback: if we got very few messages, might need different strategy
    if (messages.length < 2) {
        return alternatingSimpleSplit(text);
    }

    return messages;
}

/**
 * Fallback: simple alternating split
 * @param {string} text - Raw text
 * @returns {Array} - Array of message objects
 */
function alternatingSimpleSplit(text) {
    // Last resort: assume whole text is one conversation
    // Split into paragraphs and alternate
    const paragraphs = text.split(/\n+/).filter(p => p.trim());

    if (paragraphs.length === 0) {
        return [{ speaker: 'Darko', content: text }];
    }

    // If we have multiple paragraphs, try to group them intelligently
    // Look for longer blocks that might be complete messages
    const messages = [];
    let currentBlock = [];
    let currentSpeaker = 'Darko';

    paragraphs.forEach((para, index) => {
        currentBlock.push(para);

        // Heuristic: if paragraph seems like a complete thought
        // or we hit a certain length, close this message
        const blockText = currentBlock.join('\n');
        const shouldClose = blockText.length > 100 ||
                          index === paragraphs.length - 1 ||
                          (para.match(/[.!?]$/) && blockText.split(/[.!?]/).length > 2);

        if (shouldClose) {
            messages.push({
                speaker: currentSpeaker,
                content: currentBlock.join('\n')
            });
            currentBlock = [];
            currentSpeaker = currentSpeaker === 'Darko' ? 'Claude' : 'Darko';
        }
    });

    // If we still have no messages, just return the whole text as user message
    if (messages.length === 0) {
        return [{ speaker: 'Darko', content: text }];
    }

    return messages;
}

/**
 * Clear all inputs and outputs
 */
function clearAll() {
    conversationInput.value = '';
    urlInput.value = '';
    formattedOutput.textContent = '';
    outputSection.classList.add('hidden');
    copyFeedback.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loadingIndicator.classList.add('hidden');

    // Focus appropriate input based on active tab
    if (activeTab === 'url') {
        urlInput.focus();
    } else {
        conversationInput.focus();
    }
}

/**
 * Copy formatted text to clipboard
 */
async function copyToClipboard() {
    const text = formattedOutput.textContent;

    if (!text) {
        return;
    }

    try {
        await navigator.clipboard.writeText(text);

        // Show feedback
        copyIcon.textContent = '✓';
        copyFeedback.classList.remove('hidden');
        copyBtn.textContent = '✓ Copied!';
        copyBtn.prepend(document.getElementById('copy-icon'));

        // Reset after 2 seconds
        setTimeout(() => {
            copyIcon.textContent = '📋';
            copyFeedback.classList.add('hidden');
            copyBtn.innerHTML = '<span id="copy-icon">📋</span> Copy to Clipboard';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);

        // Fallback for older browsers
        fallbackCopy(text);
    }
}

/**
 * Fallback copy method for older browsers
 * @param {string} text - Text to copy
 */
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        copyFeedback.classList.remove('hidden');
        setTimeout(() => {
            copyFeedback.classList.add('hidden');
        }, 2000);
    } catch (error) {
        console.error('Fallback copy failed:', error);
        alert('Failed to copy. Please manually select and copy the text.');
    }

    document.body.removeChild(textArea);
}

// Auto-focus on load
window.addEventListener('load', () => {
    // Focus URL input since it's the default tab
    urlInput.focus();
});
