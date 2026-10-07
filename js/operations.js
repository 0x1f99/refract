'use strict';

const OP_CATEGORIES = {
  ENCODING: 'Encoding',
  HASHING: 'Hashing',
  TEXT: 'Text',
  FORMATTING: 'Formatting',
  BINARY: 'Binary / Inspect',
  ANALYSIS: 'Analysis',
};

const OPERATIONS = [];

function defineOp(spec) {
  OPERATIONS.push(spec);
}

defineOp({
  id: 'base64-encode',
  name: 'Base64 Encode',
  category: OP_CATEGORIES.ENCODING,
  description:
    'Encodes text or binary data to Base64. Handles Unicode by first converting to UTF-8 bytes.',
  direction: 'encode',
  aliases: ['b64', 'base64', 'encode'],
  keywords: ['base64', 'encode', 'b64', 'ascii'],
  inputType: 'text',
  outputType: 'text',
  icon: '64',
  options: [
    {
      id: 'alphabet',
      label: 'Alphabet',
      type: 'select',
      default: 'standard',
      choices: [
        { value: 'standard', label: 'Standard (A-Z, a-z, 0-9, +/)' },
        { value: 'url', label: 'URL safe (A-Z, a-z, 0-9, -_)' },
      ],
    },
    {
      id: 'padding',
      label: 'Padding',
      type: 'select',
      default: 'yes',
      choices: [
        { value: 'yes', label: 'Include = padding' },
        { value: 'no', label: 'Omit padding' },
      ],
    },
    {
      id: 'linebreak',
      label: 'Line break',
      type: 'select',
      default: 'none',
      choices: [
        { value: 'none', label: 'None' },
        { value: '64', label: 'Every 64 characters (MIME)' },
        { value: '76', label: 'Every 76 characters' },
      ],
    },
  ],
  help: {
    what: 'Converts text or binary data into Base64 representation, a way to encode arbitrary bytes as ASCII text.',
    expects: 'Any text. Unicode is encoded as UTF-8 bytes before Base64 encoding.',
    produces: 'A Base64 string using the selected alphabet.',
    examples: [
      { input: 'Hello', output: 'SGVsbG8=' },
      { input: '€', output: '4oKs' },
      { input: 'Hello\nWorld', output: 'SGVsbG8KV29ybGQ=' },
    ],
    notes:
      'Standard Base64 uses + and / which are not URL-safe. Use "URL safe" alphabet for URLs and filenames.',
  },
  execute(input, options) {
    const alphabet = options.alphabet || 'standard';
    const padding = options.padding !== 'no';
    const linebreak = options.linebreak || 'none';
    const bytes = textToBytes(input);
    let result = bytesToBase64(bytes, alphabet === 'url', padding);
    if (linebreak !== 'none') {
      const n = parseInt(linebreak);
      result = result.match(new RegExp(`.{1,${n}}`, 'g')).join('\n');
    }
    return result;
  },
});

defineOp({
  id: 'base64-decode',
  name: 'Base64 Decode',
  category: OP_CATEGORIES.ENCODING,
  description:
    'Decodes Base64 encoded data back to text. Handles both standard and URL-safe alphabets.',
  direction: 'decode',
  aliases: ['b64', 'base64', 'decode'],
  keywords: ['base64', 'decode', 'b64'],
  inputType: 'text',
  outputType: 'text',
  icon: '64',
  options: [
    {
      id: 'alphabet',
      label: 'Alphabet',
      type: 'select',
      default: 'auto',
      choices: [
        { value: 'auto', label: 'Auto detect' },
        { value: 'standard', label: 'Standard (+/)' },
        { value: 'url', label: 'URL safe (-_)' },
      ],
    },
    {
      id: 'encoding',
      label: 'Output encoding',
      type: 'select',
      default: 'utf8',
      choices: [
        { value: 'utf8', label: 'UTF-8 text' },
        { value: 'latin1', label: 'Latin-1 / binary bytes' },
      ],
    },
  ],
  help: {
    what: 'Decodes Base64 encoded data back to its original form.',
    expects: 'A valid Base64 string. Whitespace and newlines are ignored automatically.',
    produces: 'The decoded text. Assumes UTF-8 encoding unless Latin-1 is selected.',
    examples: [
      { input: 'SGVsbG8=', output: 'Hello' },
      { input: '4oKs', output: '€' },
    ],
    notes: 'URL-safe Base64 uses - and _ instead of + and /. Auto detect handles both.',
  },
  execute(input, options) {
    const cleaned = input.replace(/[\s\r\n]/g, '');
    if (cleaned.length === 0) return '';
    const alphabet = options.alphabet || 'auto';
    const encoding = options.encoding || 'utf8';
    let str = cleaned;
    if (alphabet === 'auto' || alphabet === 'url') {
      str = str.replace(/-/g, '+').replace(/_/g, '/');
    }
    const bytes = base64ToBytes(str);
    if (encoding === 'latin1') {
      return bytes.map((b) => String.fromCharCode(b)).join('');
    }
    return bytesToText(bytes);
  },
});

defineOp({
  id: 'url-encode',
  name: 'URL Percent Encode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Encodes special characters using percent-encoding (RFC 3986) for use in URLs.',
  direction: 'encode',
  aliases: ['url', 'percent', 'urlencode'],
  keywords: ['url', 'percent', 'encode', 'uri', 'query'],
  inputType: 'text',
  outputType: 'text',
  icon: '%',
  options: [
    {
      id: 'mode',
      label: 'Encode mode',
      type: 'select',
      default: 'component',
      choices: [
        { value: 'component', label: 'Encode component (encodeURIComponent)' },
        { value: 'full', label: 'Encode full URI (encodeURI)' },
        { value: 'all', label: 'Encode all bytes' },
      ],
    },
    {
      id: 'case',
      label: 'Hex case',
      type: 'select',
      default: 'upper',
      choices: [
        { value: 'upper', label: 'Uppercase (%4F)' },
        { value: 'lower', label: 'Lowercase (%4f)' },
      ],
    },
  ],
  help: {
    what: 'Converts characters to percent-encoded form for use in URLs. Encodes each byte of the UTF-8 representation as %XX.',
    expects: 'Any text string.',
    produces: 'A percent-encoded string safe for use in URLs.',
    examples: [
      { input: 'Hello World', output: 'Hello%20World' },
      { input: 'a=1&b=2', output: 'a%3D1%26b%3D2' },
      { input: '€', output: '%E2%82%AC' },
    ],
    notes:
      "encodeURIComponent leaves: A-Z a-z 0-9 - _ . ! ~ * ' ( ) unreserved. encodeURI additionally leaves: ; , / ? : @ & = + $ #",
  },
  execute(input, options) {
    const mode = options.mode || 'component';
    const cas = options.case || 'upper';
    let result;
    if (mode === 'full') {
      result = encodeURI(input);
    } else if (mode === 'all') {
      const bytes = textToBytes(input);
      result = Array.from(bytes)
        .map((b) => '%' + b.toString(16).padStart(2, '0').toUpperCase())
        .join('');
    } else {
      result = encodeURIComponent(input);
    }
    if (cas === 'lower') {
      result = result.replace(/%([0-9A-F]{2})/g, (m, h) => '%' + h.toLowerCase());
    }
    return result;
  },
});

defineOp({
  id: 'url-decode',
  name: 'URL Percent Decode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Decodes percent-encoded URL strings back to plain text.',
  direction: 'decode',
  aliases: ['url', 'percent', 'urldecode'],
  keywords: ['url', 'percent', 'decode', 'uri', 'query'],
  inputType: 'text',
  outputType: 'text',
  icon: '%',
  options: [],
  help: {
    what: 'Decodes percent-encoded URL strings, restoring %XX sequences to their original characters.',
    expects: 'A percent-encoded string.',
    produces: 'The decoded text.',
    examples: [
      { input: 'Hello%20World', output: 'Hello World' },
      { input: '%E2%82%AC', output: '€' },
      { input: 'a%3D1%26b%3D2', output: 'a=1&b=2' },
    ],
  },
  execute(input, options) {
    try {
      return decodeURIComponent(input.replace(/\+/g, ' '));
    } catch (e) {
      try {
        return unescape(input);
      } catch (e2) {
        throw new Error('Invalid percent-encoded string. Check for incomplete %XX sequences.');
      }
    }
  },
});

defineOp({
  id: 'html-encode',
  name: 'HTML Entity Encode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Converts characters to HTML entity references. Essential for safe HTML output.',
  direction: 'encode',
  aliases: ['html', 'entity', 'htmlencode', 'escape'],
  keywords: ['html', 'entity', 'escape', 'encode', 'xss', 'xml'],
  inputType: 'text',
  outputType: 'text',
  icon: '&',
  options: [
    {
      id: 'mode',
      label: 'Encode mode',
      type: 'select',
      default: 'essential',
      choices: [
        { value: 'essential', label: 'Essential only (&, <, >, ", \')' },
        { value: 'all', label: 'All non-ASCII as numeric entities' },
        { value: 'named', label: 'Named entities where available' },
      ],
    },
    {
      id: 'quotes',
      label: 'Quote style',
      type: 'select',
      default: 'both',
      choices: [
        { value: 'both', label: 'Encode both " and \'' },
        { value: 'double', label: 'Encode " only' },
        { value: 'single', label: "Encode ' only" },
        { value: 'none', label: 'Do not encode quotes' },
      ],
    },
  ],
  help: {
    what: 'Converts special characters to HTML entity references so they render correctly in HTML without being interpreted as markup.',
    expects: 'Any text.',
    produces:
      'Text with HTML-unsafe characters replaced by entity references like &amp; &lt; &gt; etc.',
    examples: [
      {
        input: '<script>alert("XSS")</script>',
        output: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
      },
      { input: '€50 & "free"', output: '€50 &amp; &quot;free&quot;' },
    ],
    notes:
      'Essential mode only encodes characters that have special meaning in HTML. "All" mode converts all non-ASCII to numeric entities like &#x20AC;',
  },
  execute(input, options) {
    const mode = options.mode || 'essential';
    const quotes = options.quotes || 'both';
    const namedEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
    };
    const fullNamed = {
      ...namedEntities,
      '\u00A0': '&nbsp;',
      '\u00A9': '&copy;',
      '\u00AE': '&reg;',
      '\u20AC': '&euro;',
      '\u2014': '&mdash;',
      '\u2013': '&ndash;',
      '\u2026': '&hellip;',
      '\u00E9': '&eacute;',
      '\u00E0': '&agrave;',
      '\u00FC': '&uuml;',
    };
    let result = '';
    for (const ch of input) {
      const code = ch.codePointAt(0);
      if (ch === '&') {
        result += '&amp;';
        continue;
      }
      if (ch === '<') {
        result += '&lt;';
        continue;
      }
      if (ch === '>') {
        result += '&gt;';
        continue;
      }
      if (ch === '"' && (quotes === 'both' || quotes === 'double')) {
        result += '&quot;';
        continue;
      }
      if (ch === "'" && (quotes === 'both' || quotes === 'single')) {
        result += '&#x27;';
        continue;
      }
      if (mode === 'essential') {
        result += ch;
      } else if (mode === 'named' && fullNamed[ch]) {
        result += fullNamed[ch];
      } else if (mode === 'all' && code > 127) {
        result += '&#x' + code.toString(16).toUpperCase() + ';';
      } else {
        result += ch;
      }
    }
    return result;
  },
});

defineOp({
  id: 'html-decode',
  name: 'HTML Entity Decode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Decodes HTML entity references back to their original characters.',
  direction: 'decode',
  aliases: ['html', 'entity', 'htmldecode', 'unescape'],
  keywords: ['html', 'entity', 'decode', 'unescape'],
  inputType: 'text',
  outputType: 'text',
  icon: '&',
  options: [],
  help: {
    what: 'Converts HTML entity references back to their original characters.',
    expects: 'Text containing HTML entities like &amp; &lt; &gt; &#x41; &#65; etc.',
    produces: 'Plain text with entities resolved.',
    examples: [
      { input: '&lt;b&gt;Hello&lt;/b&gt;', output: '<b>Hello</b>' },
      { input: '&amp; &quot; &#x41; &#65;', output: '& " A A' },
    ],
  },
  execute(input, options) {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = input;
      return textarea.value;
    }
    return input
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&nbsp;/g, '\u00A0')
      .replace(/&copy;/g, '\u00A9')
      .replace(/&reg;/g, '\u00AE')
      .replace(/&euro;/g, '\u20AC')
      .replace(/&mdash;/g, '\u2014')
      .replace(/&ndash;/g, '\u2013')
      .replace(/&hellip;/g, '\u2026');
  },
});

defineOp({
  id: 'hex-encode',
  name: 'Hex Encode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Encodes each UTF-8 byte of the input as a hexadecimal value.',
  direction: 'encode',
  aliases: ['hex', 'hexencode', 'bytes', 'hexadecimal'],
  keywords: ['hex', 'encode', 'hexadecimal', 'bytes', 'binary'],
  inputType: 'text',
  outputType: 'text',
  icon: '0x',
  options: [
    {
      id: 'separator',
      label: 'Byte separator',
      type: 'select',
      default: 'space',
      choices: [
        { value: 'space', label: 'Space (48 65 6c)' },
        { value: 'none', label: 'None (48656c)' },
        { value: 'colon', label: 'Colon (48:65:6c)' },
        { value: 'comma', label: 'Comma (48,65,6c)' },
        { value: 'dash', label: 'Dash (48-65-6c)' },
        { value: 'newline', label: 'Newline' },
      ],
    },
    {
      id: 'case',
      label: 'Hex case',
      type: 'select',
      default: 'lower',
      choices: [
        { value: 'lower', label: 'Lowercase (48 65 6c)' },
        { value: 'upper', label: 'Uppercase (48 65 6C)' },
      ],
    },
    {
      id: 'prefix',
      label: 'Prefix',
      type: 'select',
      default: 'none',
      choices: [
        { value: 'none', label: 'None' },
        { value: '0x', label: '0x prefix (0x48 0x65)' },
        { value: 'back', label: '\\x prefix (\\x48\\x65)' },
      ],
    },
  ],
  help: {
    what: 'Encodes text by converting each UTF-8 byte to its hexadecimal representation. Multi-byte characters produce multiple hex values.',
    expects: 'Any text. Unicode characters are encoded as their UTF-8 byte sequence.',
    produces: 'Hexadecimal byte values with the chosen separator.',
    examples: [
      { input: 'Hello', output: '48 65 6c 6c 6f' },
      { input: '€', output: 'e2 82 ac (three UTF-8 bytes)' },
      { input: 'A', output: '41' },
    ],
    notes:
      'Important: This encodes UTF-8 bytes, not Unicode code points. The Euro sign € is U+20AC (decimal 8364) but its UTF-8 encoding is the three bytes E2 82 AC. See Hex Escape Encode for JavaScript \\xHH escape sequences.',
  },
  execute(input, options) {
    const sep = {
      space: ' ',
      none: '',
      colon: ':',
      comma: ',',
      dash: '-',
      newline: '\n',
    }[options.separator || 'space'];
    const cas = options.case || 'lower';
    const prefix = options.prefix || 'none';
    const bytes = textToBytes(input);
    return Array.from(bytes)
      .map((b) => {
        const hex = b.toString(16).padStart(2, '0');
        const h = cas === 'upper' ? hex.toUpperCase() : hex;
        if (prefix === '0x') return '0x' + h;
        if (prefix === 'back') return '\\x' + h;
        return h;
      })
      .join(sep);
  },
});

defineOp({
  id: 'hex-decode',
  name: 'Hex Decode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Decodes hexadecimal byte values back to text.',
  direction: 'decode',
  aliases: ['hex', 'hexdecode', 'fromhex'],
  keywords: ['hex', 'decode', 'hexadecimal', 'bytes'],
  inputType: 'text',
  outputType: 'text',
  icon: '0x',
  options: [
    {
      id: 'encoding',
      label: 'Output encoding',
      type: 'select',
      default: 'utf8',
      choices: [
        { value: 'utf8', label: 'UTF-8 text' },
        { value: 'latin1', label: 'Latin-1 / binary' },
      ],
    },
  ],
  help: {
    what: 'Converts hexadecimal byte values back into text. Accepts hex with various separators.',
    expects:
      'Hex bytes in formats like: 48 65 6c, 48656c, 0x48 0x65, \\x48\\x65. Separators and prefixes are detected automatically.',
    produces: 'The decoded text interpreted as UTF-8 (or Latin-1 if selected).',
    examples: [
      { input: '48 65 6c 6c 6f', output: 'Hello' },
      { input: '48656c6c6f', output: 'Hello' },
      { input: 'e2 82 ac', output: '€' },
    ],
  },
  execute(input, options) {
    const cleaned = input.trim();
    if (!cleaned) return '';
    let hexStr = cleaned
      .replace(/0x/gi, '')
      .replace(/\\x/gi, '')
      .replace(/[^0-9a-fA-F]/g, ' ')
      .trim()
      .split(/\s+/)
      .join('');
    if (hexStr.length % 2 !== 0) {
      throw new Error(
        'Invalid hex input: odd number of hex digits. Each byte requires exactly 2 hex digits.',
      );
    }
    if (!/^[0-9a-fA-F]*$/.test(hexStr)) {
      throw new Error('Invalid hex input: contains characters other than 0-9 and A-F.');
    }
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < hexStr.length; i += 2) {
      bytes[i / 2] = parseInt(hexStr.substring(i, i + 2), 16);
    }
    const encoding = options.encoding || 'utf8';
    if (encoding === 'latin1') {
      return Array.from(bytes)
        .map((b) => String.fromCharCode(b))
        .join('');
    }
    return bytesToText(bytes);
  },
});

defineOp({
  id: 'hex-escape-encode',
  name: 'Hex Escape Encode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Encodes text using hexadecimal escape sequences like \\x48\\x65\\x6c.',
  direction: 'encode',
  aliases: ['hex escape', 'xhh', '\\x', 'escape'],
  keywords: ['hex', 'escape', 'encode', '\\x', 'javascript', 'c', 'python'],
  inputType: 'text',
  outputType: 'text',
  icon: '\\x',
  options: [
    {
      id: 'mode',
      label: 'Escape mode',
      type: 'select',
      default: 'utf8-bytes',
      choices: [
        {
          value: 'utf8-bytes',
          label: '\\xHH bytes (UTF-8 bytes, e.g. \\xE2\\x82\\xAC for €)',
        },
        {
          value: 'codepoint',
          label: '\\xHH code points (ASCII only, fail on non-ASCII)',
        },
      ],
    },
    {
      id: 'case',
      label: 'Hex case',
      type: 'select',
      default: 'lower',
      choices: [
        { value: 'lower', label: 'Lowercase (\\x4f)' },
        { value: 'upper', label: 'Uppercase (\\x4F)' },
      ],
    },
    {
      id: 'scope',
      label: 'Which characters',
      type: 'select',
      default: 'all',
      choices: [
        { value: 'all', label: 'All characters' },
        { value: 'non-ascii', label: 'Non-ASCII only (keep printable ASCII)' },
        { value: 'non-print', label: 'Non-printable only (keep printable)' },
      ],
    },
  ],
  help: {
    what: 'Encodes text using \\xHH hexadecimal escape sequences. Used in C, Python, JavaScript string literals and many other contexts.',
    expects: 'Any text.',
    produces: 'A string with bytes represented as \\xHH sequences.',
    examples: [
      { input: 'Hello', output: '\\x48\\x65\\x6c\\x6c\\x6f' },
      { input: 'A', output: '\\x41' },
      { input: '€ (as UTF-8 bytes)', output: '\\xe2\\x82\\xac' },
    ],
    notes:
      'Important distinction: \\xHH escape sequences represent individual bytes, not Unicode code points. The Euro sign € is the single code point U+20AC, but in UTF-8 it is encoded as three bytes: E2 82 AC, producing \\xe2\\x82\\xac. To encode by Unicode code point, use Unicode Escape (\\uHHHH).',
  },
  execute(input, options) {
    const mode = options.mode || 'utf8-bytes';
    const cas = options.case || 'lower';
    const scope = options.scope || 'all';

    if (mode === 'codepoint') {
      for (const ch of input) {
        if (ch.codePointAt(0) > 127) {
          throw new Error(
            `Character "${ch}" (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) cannot be represented as a single \\xHH byte. Switch to "UTF-8 bytes" mode or use Unicode Escape.`,
          );
        }
      }
      return Array.from(input)
        .map((ch) => {
          const code = ch.charCodeAt(0);
          if (shouldEscapeChar(ch, code, scope)) {
            const hex = code.toString(16).padStart(2, '0');
            return '\\x' + (cas === 'upper' ? hex.toUpperCase() : hex);
          }
          return ch;
        })
        .join('');
    }

    const bytes = textToBytes(input);
    return Array.from(bytes)
      .map((b) => {
        const hex = b.toString(16).padStart(2, '0');
        return '\\x' + (cas === 'upper' ? hex.toUpperCase() : hex);
      })
      .join('');
  },
});

function shouldEscapeChar(ch, code, scope) {
  if (scope === 'all') return true;
  if (scope === 'non-ascii') return code > 127;
  if (scope === 'non-print') return code < 32 || code === 127 || code > 127;
  return true;
}

defineOp({
  id: 'hex-escape-decode',
  name: 'Hex Escape Decode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Decodes \\xHH hexadecimal escape sequences back to text.',
  direction: 'decode',
  aliases: ['hex escape', 'xhh', '\\x', 'unescape'],
  keywords: ['hex', 'escape', 'decode', '\\x', 'javascript', 'unescape'],
  inputType: 'text',
  outputType: 'text',
  icon: '\\x',
  options: [
    {
      id: 'encoding',
      label: 'Byte interpretation',
      type: 'select',
      default: 'utf8',
      choices: [
        {
          value: 'utf8',
          label: 'UTF-8 (multi-byte sequences form characters)',
        },
        { value: 'latin1', label: 'Latin-1 (each byte is one character)' },
      ],
    },
  ],
  help: {
    what: 'Decodes \\xHH escape sequences back to their original characters. Also handles mixed content (unescaped characters pass through unchanged).',
    expects:
      'Text containing \\xHH sequences. Example: \\x48\\x65\\x6c\\x6c\\x6f or mixed like Hello \\x57orld',
    produces: 'The decoded text.',
    examples: [
      { input: '\\x48\\x65\\x6c\\x6c\\x6f', output: 'Hello' },
      { input: '\\xe2\\x82\\xac', output: '€ (from UTF-8 bytes)' },
      { input: 'Hi\\x20there', output: 'Hi there' },
    ],
    notes:
      'In UTF-8 mode, multi-byte sequences like \\xe2\\x82\\xac are combined and decoded as a single Unicode character (€). In Latin-1 mode, each \\xHH becomes exactly one character.',
  },
  execute(input, options) {
    const encoding = options.encoding || 'utf8';
    const bytes = [];
    const chars = [];
    let i = 0;
    while (i < input.length) {
      if (
        input[i] === '\\' &&
        input[i + 1] === 'x' &&
        /[0-9a-fA-F]{2}/.test(input.substring(i + 2, i + 4))
      ) {
        const byte = parseInt(input.substring(i + 2, i + 4), 16);
        if (encoding === 'utf8') {
          bytes.push(byte);
        } else {
          if (bytes.length > 0) {
            chars.push(bytesToText(new Uint8Array(bytes)));
            bytes.length = 0;
          }
          chars.push(String.fromCharCode(byte));
        }
        i += 4;
      } else {
        if (bytes.length > 0) {
          chars.push(bytesToText(new Uint8Array(bytes)));
          bytes.length = 0;
        }
        chars.push(input[i]);
        i++;
      }
    }
    if (bytes.length > 0) chars.push(bytesToText(new Uint8Array(bytes)));
    return chars.join('');
  },
});

defineOp({
  id: 'unicode-escape-encode',
  name: 'Unicode Escape Encode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Encodes characters as \\uHHHH or \\u{HHHHH} Unicode escape sequences.',
  direction: 'encode',
  aliases: ['unicode', 'escape', '\\u'],
  keywords: ['unicode', 'escape', 'encode', '\\u', 'javascript', 'codepoint'],
  inputType: 'text',
  outputType: 'text',
  icon: '\\u',
  options: [
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      default: 'u4',
      choices: [
        { value: 'u4', label: '\\uHHHH (BMP, surrogates for high chars)' },
        { value: 'u-brace', label: '\\u{HHHH} (ES2015+, all code points)' },
        { value: 'U8', label: '\\UHHHHHHHH (8-digit, C/Python)' },
        { value: 'u-xml', label: '&#xHHHH; (XML/HTML numeric)' },
      ],
    },
    {
      id: 'case',
      label: 'Hex case',
      type: 'select',
      default: 'lower',
      choices: [
        { value: 'lower', label: 'Lowercase' },
        { value: 'upper', label: 'Uppercase' },
      ],
    },
    {
      id: 'scope',
      label: 'Which characters',
      type: 'select',
      default: 'non-ascii',
      choices: [
        { value: 'all', label: 'All characters' },
        { value: 'non-ascii', label: 'Non-ASCII only' },
        { value: 'non-print', label: 'Non-printable only' },
      ],
    },
  ],
  help: {
    what: 'Encodes characters as Unicode escape sequences using their Unicode code point values. Unlike hex byte escapes, Unicode escapes always represent code points regardless of encoding.',
    expects: 'Any text.',
    produces: 'Text with characters replaced by Unicode escape sequences.',
    examples: [
      { input: 'A', output: '\\u0041 (code point U+0041, not UTF-8 bytes)' },
      { input: '€', output: '\\u20AC (code point U+20AC)' },
      {
        input: '😀',
        output: '\\uD83D\\uDE00 (surrogate pair in \\uHHHH format) or \\u{1F600} (in \\u{} format)',
      },
    ],
    notes:
      'Important: \\uHHHH encodes the Unicode code point, NOT the UTF-8 bytes. A \\u41 always means the character "A" (code point 65), whereas \\x41 in UTF-8 byte mode also means "A" only because ASCII characters have the same value as their UTF-8 byte.',
  },
  execute(input, options) {
    const format = options.format || 'u4';
    const cas = options.case || 'lower';
    const scope = options.scope || 'non-ascii';
    let result = '';
    for (const ch of input) {
      const cp = ch.codePointAt(0);
      const shouldEsc =
        scope === 'all' ||
        (scope === 'non-ascii' && cp > 127) ||
        (scope === 'non-print' && (cp < 32 || cp === 127));
      if (!shouldEsc) {
        result += ch;
        continue;
      }
      let h = cp.toString(16);
      if (cas === 'upper') h = h.toUpperCase();
      if (format === 'u4') {
        if (cp > 0xffff) {
          const high = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
          const low = ((cp - 0x10000) % 0x400) + 0xdc00;
          const hh = high.toString(16).padStart(4, '0');
          const lh = low.toString(16).padStart(4, '0');
          result +=
            '\\u' +
            (cas === 'upper' ? hh.toUpperCase() : hh) +
            '\\u' +
            (cas === 'upper' ? lh.toUpperCase() : lh);
        } else {
          result += '\\u' + h.padStart(4, '0');
        }
      } else if (format === 'u-brace') {
        result += '\\u{' + h + '}';
      } else if (format === 'U8') {
        result += '\\U' + h.padStart(8, '0');
      } else if (format === 'u-xml') {
        result += '&#x' + h + ';';
      }
    }
    return result;
  },
});

defineOp({
  id: 'unicode-escape-decode',
  name: 'Unicode Escape Decode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Decodes \\uHHHH, \\u{HHHH}, \\UHHHHHHHH and &#xHHHH; Unicode escape sequences.',
  direction: 'decode',
  aliases: ['unicode', 'unescape', '\\u'],
  keywords: ['unicode', 'escape', 'decode', '\\u', 'javascript'],
  inputType: 'text',
  outputType: 'text',
  icon: '\\u',
  options: [],
  help: {
    what: 'Decodes various forms of Unicode escape sequences back to their original characters.',
    expects: 'Text containing \\uHHHH, \\u{HHHH}, \\UHHHHHHHH, or &#xHHHH; sequences.',
    produces: 'The decoded text with all escape sequences resolved.',
    examples: [
      { input: '\\u0048\\u0065\\u006c\\u006c\\u006f', output: 'Hello' },
      { input: '\\u{1F600}', output: '😀' },
      { input: '&#x20AC;', output: '€' },
    ],
  },
  execute(input, options) {
    let result = input;
    result = result.replace(/\\u\{([0-9a-fA-F]+)\}/g, (m, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    );
    result = result.replace(/\\U([0-9a-fA-F]{8})/g, (m, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    );
    result = result.replace(/\\u([0-9a-fA-F]{4})\\u([0-9a-fA-F]{4})/g, (m, h1, h2) => {
      const c1 = parseInt(h1, 16);
      const c2 = parseInt(h2, 16);
      if (c1 >= 0xd800 && c1 <= 0xdbff && c2 >= 0xdc00 && c2 <= 0xdfff) {
        const cp = 0x10000 + (c1 - 0xd800) * 0x400 + (c2 - 0xdc00);
        return String.fromCodePoint(cp);
      }
      return String.fromCodePoint(c1) + String.fromCodePoint(c2);
    });
    result = result.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    );
    result = result.replace(/&#x([0-9a-fA-F]+);/gi, (m, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    );
    result = result.replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d, 10)));
    return result;
  },
});

defineOp({
  id: 'json-escape',
  name: 'JSON String Escape',
  category: OP_CATEGORIES.ENCODING,
  description: 'Escapes text for use inside a JSON string value.',
  direction: 'encode',
  aliases: ['json', 'escape'],
  keywords: ['json', 'escape', 'string', 'javascript'],
  inputType: 'text',
  outputType: 'text',
  icon: '{}',
  options: [
    {
      id: 'unicode',
      label: 'Non-ASCII',
      type: 'select',
      default: 'keep',
      choices: [
        { value: 'keep', label: 'Keep as Unicode characters' },
        { value: 'escape', label: 'Escape as \\uHHHH' },
      ],
    },
  ],
  help: {
    what: 'Escapes a string so it can be safely embedded inside a JSON string literal. Handles control characters, backslashes, and double quotes.',
    expects: 'Any text to use as a JSON string value.',
    produces:
      'The text with JSON-unsafe characters escaped. Suitable for placing between double quotes in JSON.',
    examples: [
      { input: 'He said "hello"', output: 'He said \\"hello\\"' },
      { input: 'Line1\nLine2', output: 'Line1\\nLine2' },
      { input: 'C:\\path\\file', output: 'C:\\\\path\\\\file' },
    ],
  },
  execute(input, options) {
    const escapeUnicode = (options.unicode || 'keep') === 'escape';
    let result = '';
    for (const ch of input) {
      const cp = ch.codePointAt(0);
      if (ch === '"') {
        result += '\\"';
      } else if (ch === '\\') {
        result += '\\\\';
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
      } else if (cp < 32 || cp === 127) {
        result += '\\u' + cp.toString(16).padStart(4, '0');
      } else if (escapeUnicode && cp > 127) {
        if (cp > 0xffff) {
          const high = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
          const low = ((cp - 0x10000) % 0x400) + 0xdc00;
          result +=
            '\\u' + high.toString(16).padStart(4, '0') + '\\u' + low.toString(16).padStart(4, '0');
        } else {
          result += '\\u' + cp.toString(16).padStart(4, '0');
        }
      } else {
        result += ch;
      }
    }
    return result;
  },
});

defineOp({
  id: 'json-unescape',
  name: 'JSON String Unescape',
  category: OP_CATEGORIES.ENCODING,
  description:
    'Unescapes a JSON string literal, restoring escape sequences to their original characters.',
  direction: 'decode',
  aliases: ['json', 'unescape'],
  keywords: ['json', 'unescape', 'decode'],
  inputType: 'text',
  outputType: 'text',
  icon: '{}',
  options: [],
  help: {
    what: 'Reverses JSON string escaping. Converts \\n \\t \\" \\\\ \\uHHHH and other JSON escape sequences back to their original characters.',
    expects: 'A JSON-escaped string (optionally with surrounding double quotes).',
    produces: 'The unescaped text.',
    examples: [
      { input: 'He said \\"hello\\"', output: 'He said "hello"' },
      { input: 'Line1\\nLine2', output: 'Line1\nLine2' },
    ],
  },
  execute(input, options) {
    let s = input.trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
    try {
      return JSON.parse('"' + s + '"');
    } catch (e) {
      throw new Error(
        'Invalid JSON string escape sequence. Check for malformed \\uHHHH or unknown escape sequences.',
      );
    }
  },
});

defineOp({
  id: 'binary-encode',
  name: 'Binary Encode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Encodes text as binary (base-2) representation of UTF-8 bytes.',
  direction: 'encode',
  aliases: ['binary', 'base2', 'bits'],
  keywords: ['binary', 'encode', 'bits', 'base2', '01'],
  inputType: 'text',
  outputType: 'text',
  icon: '01',
  options: [
    {
      id: 'separator',
      label: 'Byte separator',
      type: 'select',
      default: 'space',
      choices: [
        { value: 'space', label: 'Space' },
        { value: 'none', label: 'None' },
        { value: 'newline', label: 'Newline' },
      ],
    },
    {
      id: 'padding',
      label: 'Bit padding',
      type: 'select',
      default: 'yes',
      choices: [
        { value: 'yes', label: 'Zero-pad to 8 bits (01001000)' },
        { value: 'no', label: 'No padding (remove leading zeros)' },
      ],
    },
  ],
  help: {
    what: 'Converts text to binary (base-2) representation of each UTF-8 byte.',
    expects: 'Any text.',
    produces: '8-bit binary strings for each byte of the UTF-8 encoding.',
    examples: [
      { input: 'Hi', output: '01001000 01101001' },
      { input: 'A', output: '01000001' },
    ],
  },
  execute(input, options) {
    const sep = { space: ' ', none: '', newline: '\n' }[options.separator || 'space'];
    const pad = (options.padding || 'yes') === 'yes';
    const bytes = textToBytes(input);
    return Array.from(bytes)
      .map((b) => {
        const bin = b.toString(2);
        return pad ? bin.padStart(8, '0') : bin;
      })
      .join(sep);
  },
});

defineOp({
  id: 'binary-decode',
  name: 'Binary Decode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Decodes binary (base-2) representation back to text.',
  direction: 'decode',
  aliases: ['binary', 'base2', 'bits'],
  keywords: ['binary', 'decode', 'bits', 'base2', '01'],
  inputType: 'text',
  outputType: 'text',
  icon: '01',
  options: [
    {
      id: 'encoding',
      label: 'Byte interpretation',
      type: 'select',
      default: 'utf8',
      choices: [
        { value: 'utf8', label: 'UTF-8' },
        { value: 'latin1', label: 'Latin-1' },
      ],
    },
  ],
  help: {
    what: 'Converts binary (base-2) strings back to text.',
    expects:
      'Binary digits (0 and 1) separated by spaces, or continuous binary string. Groups of 8 bits represent one byte.',
    produces: 'The decoded text.',
    examples: [
      { input: '01001000 01101001', output: 'Hi' },
      { input: '0100100001101001', output: 'Hi' },
    ],
  },
  execute(input, options) {
    const cleaned = input.trim().replace(/[^01\s]/g, '');
    let binStr;
    if (cleaned.includes(' ')) {
      binStr = cleaned.split(/\s+/).filter(Boolean).join('');
    } else {
      binStr = cleaned.replace(/\s/g, '');
    }
    if (binStr.length % 8 !== 0) {
      throw new Error(
        `Binary string length (${binStr.length} bits) is not a multiple of 8. Each byte requires exactly 8 bits.`,
      );
    }
    const bytes = new Uint8Array(binStr.length / 8);
    for (let i = 0; i < binStr.length; i += 8) {
      bytes[i / 8] = parseInt(binStr.substring(i, i + 8), 2);
    }
    const encoding = options.encoding || 'utf8';
    if (encoding === 'latin1') {
      return Array.from(bytes)
        .map((b) => String.fromCharCode(b))
        .join('');
    }
    return bytesToText(bytes);
  },
});

defineOp({
  id: 'octal-encode',
  name: 'Octal Encode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Encodes text as octal (base-8) byte values.',
  direction: 'encode',
  aliases: ['octal', 'base8', 'oct'],
  keywords: ['octal', 'encode', 'oct', 'base8'],
  inputType: 'text',
  outputType: 'text',
  icon: '8',
  options: [
    {
      id: 'prefix',
      label: 'Prefix',
      type: 'select',
      default: 'backslash',
      choices: [
        { value: 'backslash', label: '\\HHH (C-style octal)' },
        { value: '0', label: '0HHH' },
        { value: 'none', label: 'None' },
      ],
    },
    {
      id: 'separator',
      label: 'Separator',
      type: 'select',
      default: 'none',
      choices: [
        { value: 'none', label: 'None' },
        { value: 'space', label: 'Space' },
      ],
    },
  ],
  help: {
    what: 'Encodes each UTF-8 byte as its octal (base-8) representation.',
    expects: 'Any text.',
    produces: 'Octal values with chosen prefix.',
    examples: [
      { input: 'Hi', output: '\\110\\151' },
      { input: 'A', output: '\\101' },
    ],
  },
  execute(input, options) {
    const prefix = options.prefix || 'backslash';
    const sep = { none: '', space: ' ' }[options.separator || 'none'];
    const bytes = textToBytes(input);
    return Array.from(bytes)
      .map((b) => {
        const oct = b.toString(8).padStart(3, '0');
        if (prefix === 'backslash') return '\\' + oct;
        if (prefix === '0') return '0' + oct;
        return oct;
      })
      .join(sep);
  },
});

defineOp({
  id: 'octal-decode',
  name: 'Octal Decode',
  category: OP_CATEGORIES.ENCODING,
  description: 'Decodes octal (base-8) byte values back to text.',
  direction: 'decode',
  aliases: ['octal', 'base8', 'oct'],
  keywords: ['octal', 'decode', 'oct', 'base8'],
  inputType: 'text',
  outputType: 'text',
  icon: '8',
  options: [],
  execute(input, options) {
    const parts = input
      .trim()
      .split(/(?=\\[0-7]{1,3})|(?<=\\[0-7]{1,3})|(?=0[0-7]{3})|(?<=0[0-7]{3})|\s+/);
    const bytes = [];
    for (const part of parts) {
      if (!part) continue;
      const m =
        part.match(/^\\([0-7]{1,3})$/) || part.match(/^0([0-7]{3})$/) || part.match(/^([0-7]{3})$/);
      if (m) {
        bytes.push(parseInt(m[1], 8));
      }
    }
    if (bytes.length === 0) {
      const cleaned = input
        .replace(/[\\0\s]/g, '')
        .replace(/[^0-7]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      for (const p of cleaned) {
        bytes.push(parseInt(p, 8));
      }
    }
    return bytesToText(new Uint8Array(bytes));
  },
});

defineOp({
  id: 'uppercase',
  name: 'Uppercase',
  category: OP_CATEGORIES.TEXT,
  description: 'Converts all text to uppercase.',
  direction: 'transform',
  aliases: ['upper', 'caps', 'capitalize'],
  keywords: ['uppercase', 'upper', 'caps', 'transform'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Aa',
  options: [],
  execute(input, options) {
    return input.toUpperCase();
  },
});

defineOp({
  id: 'lowercase',
  name: 'Lowercase',
  category: OP_CATEGORIES.TEXT,
  description: 'Converts all text to lowercase.',
  direction: 'transform',
  aliases: ['lower'],
  keywords: ['lowercase', 'lower', 'transform'],
  inputType: 'text',
  outputType: 'text',
  icon: 'aa',
  options: [],
  execute(input, options) {
    return input.toLowerCase();
  },
});

defineOp({
  id: 'titlecase',
  name: 'Title Case',
  category: OP_CATEGORIES.TEXT,
  description: 'Converts text to Title Case (capitalize first letter of each word).',
  direction: 'transform',
  aliases: ['title', 'capitalize'],
  keywords: ['title', 'case', 'capitalize', 'transform'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Tc',
  options: [],
  execute(input, options) {
    return input.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  },
});

defineOp({
  id: 'reverse',
  name: 'Reverse',
  category: OP_CATEGORIES.TEXT,
  description: 'Reverses the entire input string, preserving Unicode characters.',
  direction: 'transform',
  aliases: ['reverse', 'flip'],
  keywords: ['reverse', 'flip', 'backwards'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Rev',
  options: [
    {
      id: 'mode',
      label: 'Mode',
      type: 'select',
      default: 'all',
      choices: [
        { value: 'all', label: 'Reverse entire input' },
        { value: 'lines', label: 'Reverse each line' },
        { value: 'words', label: 'Reverse words in each line' },
        { value: 'line-order', label: 'Reverse line order' },
      ],
    },
  ],
  execute(input, options) {
    const mode = options.mode || 'all';
    const reverseStr = (s) => Array.from(s).reverse().join('');
    if (mode === 'all') return reverseStr(input);
    if (mode === 'lines') return input.split('\n').map(reverseStr).join('\n');
    if (mode === 'words')
      return input
        .split('\n')
        .map((l) => l.split(/(\s+)/).reverse().join(''))
        .join('\n');
    if (mode === 'line-order') return input.split('\n').reverse().join('\n');
    return reverseStr(input);
  },
});

defineOp({
  id: 'trim',
  name: 'Trim Whitespace',
  category: OP_CATEGORIES.TEXT,
  description: 'Removes leading and trailing whitespace.',
  direction: 'transform',
  aliases: ['trim', 'strip'],
  keywords: ['trim', 'whitespace', 'strip', 'clean'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Tr',
  options: [
    {
      id: 'mode',
      label: 'Mode',
      type: 'select',
      default: 'both',
      choices: [
        { value: 'both', label: 'Both ends' },
        { value: 'start', label: 'Start only' },
        { value: 'end', label: 'End only' },
        { value: 'lines', label: 'Each line (both ends)' },
        { value: 'all', label: 'Remove all whitespace' },
      ],
    },
  ],
  execute(input, options) {
    const mode = options.mode || 'both';
    if (mode === 'both') return input.trim();
    if (mode === 'start') return input.trimStart();
    if (mode === 'end') return input.trimEnd();
    if (mode === 'lines')
      return input
        .split('\n')
        .map((l) => l.trim())
        .join('\n');
    if (mode === 'all') return input.replace(/\s+/g, '');
    return input.trim();
  },
});

defineOp({
  id: 'sort-lines',
  name: 'Sort Lines',
  category: OP_CATEGORIES.TEXT,
  description: 'Sorts lines of text alphabetically.',
  direction: 'transform',
  aliases: ['sort'],
  keywords: ['sort', 'lines', 'alphabetical'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Az',
  options: [
    {
      id: 'order',
      label: 'Order',
      type: 'select',
      default: 'asc',
      choices: [
        { value: 'asc', label: 'Ascending (A-Z)' },
        { value: 'desc', label: 'Descending (Z-A)' },
      ],
    },
    {
      id: 'case',
      label: 'Case sensitivity',
      type: 'select',
      default: 'insensitive',
      choices: [
        { value: 'insensitive', label: 'Case insensitive' },
        { value: 'sensitive', label: 'Case sensitive' },
      ],
    },
    {
      id: 'numeric',
      label: 'Numeric sort',
      type: 'select',
      default: 'no',
      choices: [
        { value: 'no', label: 'Lexicographic' },
        { value: 'yes', label: 'Numeric (natural sort)' },
      ],
    },
  ],
  execute(input, options) {
    const lines = input.split('\n');
    const numeric = options.numeric === 'yes';
    const caseSens = options.case === 'sensitive';
    const asc = options.order !== 'desc';
    const sorted = lines.sort((a, b) => {
      const aa = caseSens ? a : a.toLowerCase();
      const bb = caseSens ? b : b.toLowerCase();
      if (numeric) return aa.localeCompare(bb, undefined, { numeric: true });
      return aa.localeCompare(bb);
    });
    return (asc ? sorted : sorted.reverse()).join('\n');
  },
});

defineOp({
  id: 'unique-lines',
  name: 'Unique Lines',
  category: OP_CATEGORIES.TEXT,
  description: 'Removes duplicate lines, keeping only unique lines.',
  direction: 'transform',
  aliases: ['unique', 'dedup', 'deduplicate'],
  keywords: ['unique', 'deduplicate', 'dedup', 'lines'],
  inputType: 'text',
  outputType: 'text',
  icon: 'U',
  options: [
    {
      id: 'case',
      label: 'Case sensitivity',
      type: 'select',
      default: 'sensitive',
      choices: [
        { value: 'sensitive', label: 'Case sensitive' },
        { value: 'insensitive', label: 'Case insensitive' },
      ],
    },
    {
      id: 'keep',
      label: 'Keep',
      type: 'select',
      default: 'first',
      choices: [
        { value: 'first', label: 'First occurrence' },
        { value: 'last', label: 'Last occurrence' },
      ],
    },
  ],
  execute(input, options) {
    const lines = input.split('\n');
    const caseSens = options.case !== 'insensitive';
    const keepLast = options.keep === 'last';
    const seen = new Set();
    const result = [];
    const process = keepLast ? lines.slice().reverse() : lines;
    for (const line of process) {
      const key = caseSens ? line : line.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(line);
      }
    }
    return (keepLast ? result.reverse() : result).join('\n');
  },
});

defineOp({
  id: 'prefix-lines',
  name: 'Prefix Lines',
  category: OP_CATEGORIES.TEXT,
  description: 'Adds a prefix to each line of text.',
  direction: 'transform',
  aliases: ['prefix'],
  keywords: ['prefix', 'prepend', 'lines'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Pre',
  options: [
    { id: 'prefix', label: 'Prefix text', type: 'text', default: '// ' },
    {
      id: 'skip-empty',
      label: 'Skip empty lines',
      type: 'select',
      default: 'no',
      choices: [
        { value: 'no', label: 'Prefix all lines' },
        { value: 'yes', label: 'Skip empty lines' },
      ],
    },
  ],
  execute(input, options) {
    const prefix = options.prefix !== undefined ? options.prefix : '// ';
    const skipEmpty = options['skip-empty'] === 'yes';
    return input
      .split('\n')
      .map((l) => (skipEmpty && l.trim() === '' ? l : prefix + l))
      .join('\n');
  },
});

defineOp({
  id: 'suffix-lines',
  name: 'Suffix Lines',
  category: OP_CATEGORIES.TEXT,
  description: 'Adds a suffix to each line of text.',
  direction: 'transform',
  aliases: ['suffix', 'append'],
  keywords: ['suffix', 'append', 'lines'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Suf',
  options: [
    { id: 'suffix', label: 'Suffix text', type: 'text', default: ',' },
    {
      id: 'skip-empty',
      label: 'Skip empty lines',
      type: 'select',
      default: 'yes',
      choices: [
        { value: 'yes', label: 'Skip empty lines' },
        { value: 'no', label: 'Suffix all lines' },
      ],
    },
  ],
  execute(input, options) {
    const suffix = options.suffix !== undefined ? options.suffix : ',';
    const skipEmpty = options['skip-empty'] !== 'no';
    return input
      .split('\n')
      .map((l) => (skipEmpty && l.trim() === '' ? l : l + suffix))
      .join('\n');
  },
});

defineOp({
  id: 'find-replace',
  name: 'Find and Replace',
  category: OP_CATEGORIES.TEXT,
  description: 'Finds text or a regular expression and replaces it.',
  direction: 'transform',
  aliases: ['find', 'replace', 'regex', 'substitution'],
  keywords: ['find', 'replace', 'regex', 'substitution', 'search'],
  inputType: 'text',
  outputType: 'text',
  icon: 'F/R',
  options: [
    { id: 'find', label: 'Find', type: 'text', default: '' },
    { id: 'replace', label: 'Replace with', type: 'text', default: '' },
    {
      id: 'mode',
      label: 'Match mode',
      type: 'select',
      default: 'literal',
      choices: [
        { value: 'literal', label: 'Literal text' },
        { value: 'regex', label: 'Regular expression' },
      ],
    },
    {
      id: 'flags',
      label: 'Flags (regex)',
      type: 'select',
      default: 'gi',
      choices: [
        { value: 'gi', label: 'Global, case insensitive' },
        { value: 'g', label: 'Global, case sensitive' },
        { value: 'i', label: 'First match, case insensitive' },
        { value: '', label: 'First match, case sensitive' },
      ],
    },
  ],
  execute(input, options) {
    const find = options.find || '';
    const replace = options.replace || '';
    const mode = options.mode || 'literal';
    if (!find) return input;
    if (mode === 'regex') {
      try {
        const flags = options.flags || 'gi';
        const regex = new RegExp(find, flags);
        return input.replace(regex, replace);
      } catch (e) {
        throw new Error(`Invalid regular expression: ${e.message}`);
      }
    }
    return input.split(find).join(replace);
  },
});

defineOp({
  id: 'split',
  name: 'Split',
  category: OP_CATEGORIES.TEXT,
  description: 'Splits text by a delimiter, producing one item per line.',
  direction: 'transform',
  aliases: ['split'],
  keywords: ['split', 'delimiter', 'separator'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Sp',
  options: [
    { id: 'delimiter', label: 'Delimiter', type: 'text', default: ',' },
    {
      id: 'mode',
      label: 'Delimiter type',
      type: 'select',
      default: 'literal',
      choices: [
        { value: 'literal', label: 'Literal' },
        { value: 'regex', label: 'Regular expression' },
      ],
    },
    {
      id: 'trim',
      label: 'Trim items',
      type: 'select',
      default: 'yes',
      choices: [
        { value: 'yes', label: 'Trim whitespace from each item' },
        { value: 'no', label: 'Keep as-is' },
      ],
    },
    {
      id: 'filter-empty',
      label: 'Empty items',
      type: 'select',
      default: 'keep',
      choices: [
        { value: 'keep', label: 'Keep empty items' },
        { value: 'remove', label: 'Remove empty items' },
      ],
    },
  ],
  execute(input, options) {
    const delim = options.delimiter !== undefined ? options.delimiter : ',';
    const mode = options.mode || 'literal';
    let parts;
    if (mode === 'regex') {
      try {
        parts = input.split(new RegExp(delim));
      } catch (e) {
        throw new Error(`Invalid regular expression: ${e.message}`);
      }
    } else {
      const escaped = delim.replace(/\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      parts = input.split(escaped);
    }
    if (options.trim !== 'no') parts = parts.map((p) => p.trim());
    if (options['filter-empty'] === 'remove') parts = parts.filter(Boolean);
    return parts.join('\n');
  },
});

defineOp({
  id: 'join',
  name: 'Join Lines',
  category: OP_CATEGORIES.TEXT,
  description: 'Joins multiple lines into one, using a delimiter.',
  direction: 'transform',
  aliases: ['join', 'merge'],
  keywords: ['join', 'merge', 'lines', 'delimiter'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Jn',
  options: [
    { id: 'delimiter', label: 'Delimiter', type: 'text', default: ', ' },
    {
      id: 'filter-empty',
      label: 'Empty lines',
      type: 'select',
      default: 'remove',
      choices: [
        { value: 'remove', label: 'Skip empty lines' },
        { value: 'keep', label: 'Include empty lines' },
      ],
    },
  ],
  execute(input, options) {
    const delim = options.delimiter !== undefined ? options.delimiter : ', ';
    const actualDelim = delim.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    let lines = input.split('\n');
    if (options['filter-empty'] !== 'keep') lines = lines.filter((l) => l.trim() !== '');
    return lines.join(actualDelim);
  },
});

defineOp({
  id: 'json-format',
  name: 'JSON Format',
  category: OP_CATEGORIES.FORMATTING,
  description: 'Parses and pretty-prints JSON with configurable indentation.',
  direction: 'transform',
  aliases: ['json', 'format', 'pretty', 'beautify'],
  keywords: ['json', 'format', 'pretty', 'indent', 'beautify'],
  inputType: 'text',
  outputType: 'text',
  icon: '{}',
  options: [
    {
      id: 'indent',
      label: 'Indentation',
      type: 'select',
      default: '2',
      choices: [
        { value: '2', label: '2 spaces' },
        { value: '4', label: '4 spaces' },
        { value: 'tab', label: 'Tab' },
      ],
    },
    {
      id: 'sort',
      label: 'Sort keys',
      type: 'select',
      default: 'no',
      choices: [
        { value: 'no', label: 'Original order' },
        { value: 'yes', label: 'Alphabetical' },
      ],
    },
  ],
  execute(input, options) {
    if (!input.trim()) return '';
    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
    const indent = options.indent === 'tab' ? '\t' : parseInt(options.indent || '2');
    if (options.sort === 'yes') {
      parsed = sortObjectKeys(parsed);
    }
    return JSON.stringify(parsed, null, indent);
  },
});

defineOp({
  id: 'json-minify',
  name: 'JSON Minify',
  category: OP_CATEGORIES.FORMATTING,
  description: 'Minifies JSON by removing all unnecessary whitespace.',
  direction: 'transform',
  aliases: ['json', 'minify', 'compact'],
  keywords: ['json', 'minify', 'compact', 'compress'],
  inputType: 'text',
  outputType: 'text',
  icon: '{}',
  options: [],
  execute(input, options) {
    if (!input.trim()) return '';
    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
    return JSON.stringify(parsed);
  },
});

defineOp({
  id: 'json-validate',
  name: 'JSON Validate',
  category: OP_CATEGORIES.FORMATTING,
  description: 'Validates JSON and reports detailed errors if invalid.',
  direction: 'transform',
  aliases: ['json', 'validate', 'check', 'lint'],
  keywords: ['json', 'validate', 'check', 'lint'],
  inputType: 'text',
  outputType: 'text',
  icon: '{}',
  options: [],
  execute(input, options) {
    if (!input.trim()) return 'Empty input.';
    try {
      const parsed = JSON.parse(input);
      const type = Array.isArray(parsed) ? 'array' : typeof parsed;
      const keys = type === 'object' && parsed !== null ? Object.keys(parsed).length : null;
      let info = `Valid JSON.\nType: ${type}`;
      if (keys !== null) info += `\nTop-level keys: ${keys}`;
      const str = JSON.stringify(parsed);
      info += `\nMinified length: ${str.length} characters`;
      return info;
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
  },
});

defineOp({
  id: 'query-string-parse',
  name: 'Query String Parse',
  category: OP_CATEGORIES.FORMATTING,
  description: 'Parses a URL query string into a readable key-value format.',
  direction: 'decode',
  aliases: ['query', 'qs', 'url params', 'querystring'],
  keywords: ['query', 'string', 'url', 'params', 'parse'],
  inputType: 'text',
  outputType: 'text',
  icon: 'QS',
  options: [
    {
      id: 'format',
      label: 'Output format',
      type: 'select',
      default: 'json',
      choices: [
        { value: 'json', label: 'JSON object' },
        { value: 'table', label: 'Key: Value pairs' },
      ],
    },
  ],
  execute(input, options) {
    let qs = input.trim();
    if (qs.includes('?')) qs = qs.split('?').slice(1).join('?');
    if (!qs)
      throw new Error('No query string found. Input should be a URL or query string like a=1&b=2');
    const params = {};
    for (const pair of qs.split('&')) {
      if (!pair) continue;
      const [k, ...v] = pair.split('=');
      try {
        const key = decodeURIComponent(k.replace(/\+/g, ' '));
        const val = v.length ? decodeURIComponent(v.join('=').replace(/\+/g, ' ')) : '';
        if (key in params) {
          params[key] = Array.isArray(params[key]) ? [...params[key], val] : [params[key], val];
        } else {
          params[key] = val;
        }
      } catch (e) {
        params[k] = v.join('=');
      }
    }
    const fmt = options.format || 'json';
    if (fmt === 'json') return JSON.stringify(params, null, 2);
    return Object.entries(params)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n');
  },
});

defineOp({
  id: 'query-string-build',
  name: 'Query String Build',
  category: OP_CATEGORIES.FORMATTING,
  description: 'Builds a URL query string from JSON or key:value pairs.',
  direction: 'encode',
  aliases: ['query', 'qs', 'url params'],
  keywords: ['query', 'string', 'url', 'params', 'build'],
  inputType: 'text',
  outputType: 'text',
  icon: 'QS',
  options: [],
  execute(input, options) {
    let obj;
    try {
      obj = JSON.parse(input.trim());
    } catch (e) {
      obj = {};
      for (const line of input.trim().split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
          const k = line.substring(0, colonIdx).trim();
          const v = line.substring(colonIdx + 1).trim();
          if (k) obj[k] = v;
        }
      }
    }
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
      if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
      else params.append(k, String(v));
    }
    return params.toString();
  },
});

defineOp({
  id: 'hexdump',
  name: 'Hexdump',
  category: OP_CATEGORIES.BINARY,
  description: 'Produces a classic hex dump showing offset, hex bytes, and ASCII representation.',
  direction: 'transform',
  aliases: ['hexdump', 'xxd', 'dump'],
  keywords: ['hexdump', 'xxd', 'dump', 'hex', 'inspect', 'binary'],
  inputType: 'text',
  outputType: 'text',
  icon: 'hxd',
  options: [
    {
      id: 'width',
      label: 'Bytes per row',
      type: 'select',
      default: '16',
      choices: [
        { value: '8', label: '8 bytes' },
        { value: '16', label: '16 bytes' },
        { value: '32', label: '32 bytes' },
      ],
    },
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      default: 'classic',
      choices: [
        { value: 'classic', label: 'Classic (offset | hex | ascii)' },
        { value: 'xxd', label: 'xxd style' },
      ],
    },
  ],
  help: {
    what: 'Produces a readable hex dump of the input, showing each byte in hexadecimal alongside a printable ASCII representation.',
    expects: 'Any text. Non-ASCII characters are shown as their UTF-8 byte sequences.',
    produces: 'A formatted hex dump with offsets, hex values, and ASCII preview.',
    examples: [
      {
        input: 'Hello World',
        output: '00000000  48 65 6c 6c 6f 20 57 6f  72 6c 64              |Hello World|',
      },
    ],
  },
  execute(input, options) {
    const bytes = textToBytes(input);
    const width = parseInt(options.width || '16');
    const lines = [];
    for (let i = 0; i < bytes.length; i += width) {
      const row = bytes.slice(i, i + width);
      const offset = i.toString(16).padStart(8, '0');
      const hexParts = Array.from(row).map((b) => b.toString(16).padStart(2, '0'));
      const half = Math.floor(width / 2);
      const hexLeft = hexParts.slice(0, half).join(' ');
      const hexRight = hexParts.slice(half).join(' ');
      const hexFull = (hexLeft + '  ' + hexRight).padEnd(width * 3 + 1, ' ');
      const ascii = Array.from(row)
        .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
        .join('');
      lines.push(`${offset}  ${hexFull} |${ascii}|`);
    }
    if (bytes.length === 0) return '(empty)';
    lines.push(`${bytes.length.toString(16).padStart(8, '0')}  (${bytes.length} bytes)`);
    return lines.join('\n');
  },
});

defineOp({
  id: 'char-inspect',
  name: 'Character Inspect',
  category: OP_CATEGORIES.BINARY,
  description:
    'Shows detailed information about each character: code point, hex, decimal, UTF-8 bytes.',
  direction: 'transform',
  aliases: ['inspect', 'char', 'codepoint', 'charcode'],
  keywords: ['inspect', 'character', 'codepoint', 'charcode', 'unicode', 'bytes'],
  inputType: 'text',
  outputType: 'text',
  icon: 'chr',
  options: [
    {
      id: 'limit',
      label: 'Limit characters',
      type: 'select',
      default: '100',
      choices: [
        { value: '50', label: 'First 50' },
        { value: '100', label: 'First 100' },
        { value: '500', label: 'First 500' },
        { value: 'all', label: 'All (may be slow)' },
      ],
    },
  ],
  execute(input, options) {
    if (!input) return '(empty input)';
    const limit = options.limit === 'all' ? Infinity : parseInt(options.limit || '100');
    const chars = Array.from(input);
    const display = chars.slice(0, limit);
    const lines = ['Char  U+       Decimal  Hex     Name/UTF-8 bytes', '-'.repeat(60)];
    for (const ch of display) {
      const cp = ch.codePointAt(0);
      const hex = cp.toString(16).toUpperCase().padStart(4, '0');
      const utf8 = Array.from(textToBytes(ch))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      const displayCh =
        cp < 32
          ? ['\\n', '\\r', '\\t', '\\0'][
              cp === 10 ? 0 : cp === 13 ? 1 : cp === 9 ? 2 : cp === 0 ? 3 : -1
            ] || `\\x${cp.toString(16).padStart(2, '0')}`
          : ch;
      lines.push(
        `${displayCh.padEnd(5)} U+${hex}  ${String(cp).padStart(7)}  ${hex.padEnd(6)}  utf8: ${utf8}`,
      );
    }
    if (chars.length > limit) {
      lines.push(`\n... ${chars.length - limit} more characters not shown`);
    }
    return lines.join('\n');
  },
});

defineOp({
  id: 'word-count',
  name: 'Word Count',
  category: OP_CATEGORIES.ANALYSIS,
  description: 'Counts characters, bytes, words, and lines in the input.',
  direction: 'transform',
  aliases: ['count', 'stats', 'wc', 'analyze'],
  keywords: ['count', 'words', 'chars', 'bytes', 'lines', 'analyze', 'stats'],
  inputType: 'text',
  outputType: 'text',
  icon: '#',
  options: [],
  execute(input, options) {
    const chars = Array.from(input).length;
    const bytes = textToBytes(input).length;
    const lines = input.split('\n').length;
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    const sentences = (input.match(/[.!?]+\s/g) || []).length + (input.match(/[.!?]+$/) ? 1 : 0);
    const paragraphs = input
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean).length;
    const nonAscii = Array.from(input).filter((c) => c.codePointAt(0) > 127).length;
    return [
      `Characters:    ${chars.toLocaleString()}`,
      `Bytes (UTF-8): ${bytes.toLocaleString()}`,
      `Words:         ${words.toLocaleString()}`,
      `Lines:         ${lines.toLocaleString()}`,
      `Sentences:     ${sentences.toLocaleString()}`,
      `Paragraphs:    ${paragraphs.toLocaleString()}`,
      `Non-ASCII:     ${nonAscii.toLocaleString()}`,
    ].join('\n');
  },
});

defineOp({
  id: 'sha256',
  name: 'SHA-256 Hash',
  category: OP_CATEGORIES.HASHING,
  description: 'Computes a SHA-256 cryptographic hash using the browser Web Crypto API.',
  direction: 'transform',
  aliases: ['sha256', 'sha-256', 'hash'],
  keywords: ['sha256', 'hash', 'crypto', 'digest', 'checksum'],
  inputType: 'text',
  outputType: 'text',
  icon: 'H',
  async: true,
  options: [
    {
      id: 'encoding',
      label: 'Output format',
      type: 'select',
      default: 'hex',
      choices: [
        { value: 'hex', label: 'Hexadecimal' },
        { value: 'base64', label: 'Base64' },
      ],
    },
  ],
  help: {
    what: "Computes a SHA-256 hash of the input text. Uses the browser's built-in Web Crypto API. Hashing is a one-way function: you cannot reverse a hash to get the original input.",
    expects: 'Any text. The input is encoded as UTF-8 before hashing.',
    produces: 'A 256-bit (32 byte) hash value, shown in hexadecimal or Base64.',
    notes:
      'SHA-256 is not encryption. You cannot decrypt a hash. The same input always produces the same hash.',
  },
  async execute(input, options) {
    const bytes = textToBytes(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = new Uint8Array(hashBuffer);
    if (options.encoding === 'base64') return bytesToBase64(hashArray, false, true);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },
});

defineOp({
  id: 'sha512',
  name: 'SHA-512 Hash',
  category: OP_CATEGORIES.HASHING,
  description: 'Computes a SHA-512 cryptographic hash using the browser Web Crypto API.',
  direction: 'transform',
  aliases: ['sha512', 'sha-512', 'hash'],
  keywords: ['sha512', 'hash', 'crypto', 'digest'],
  inputType: 'text',
  outputType: 'text',
  icon: 'H',
  async: true,
  options: [
    {
      id: 'encoding',
      label: 'Output format',
      type: 'select',
      default: 'hex',
      choices: [
        { value: 'hex', label: 'Hexadecimal' },
        { value: 'base64', label: 'Base64' },
      ],
    },
  ],
  async execute(input, options) {
    const bytes = textToBytes(input);
    const hashBuffer = await crypto.subtle.digest('SHA-512', bytes);
    const hashArray = new Uint8Array(hashBuffer);
    if (options.encoding === 'base64') return bytesToBase64(hashArray, false, true);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },
});

defineOp({
  id: 'sha1',
  name: 'SHA-1 Hash',
  category: OP_CATEGORIES.HASHING,
  description:
    'Computes a SHA-1 hash. Note: SHA-1 is considered cryptographically weak for security purposes.',
  direction: 'transform',
  aliases: ['sha1', 'sha-1', 'hash'],
  keywords: ['sha1', 'hash', 'digest'],
  inputType: 'text',
  outputType: 'text',
  icon: 'H',
  async: true,
  options: [
    {
      id: 'encoding',
      label: 'Output format',
      type: 'select',
      default: 'hex',
      choices: [
        { value: 'hex', label: 'Hexadecimal' },
        { value: 'base64', label: 'Base64' },
      ],
    },
  ],
  help: {
    notes:
      'SHA-1 is not recommended for new security-sensitive applications due to known collision vulnerabilities. Use SHA-256 or SHA-512 for security purposes.',
  },
  async execute(input, options) {
    const bytes = textToBytes(input);
    const hashBuffer = await crypto.subtle.digest('SHA-1', bytes);
    const hashArray = new Uint8Array(hashBuffer);
    if (options.encoding === 'base64') return bytesToBase64(hashArray, false, true);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },
});

defineOp({
  id: 'sha384',
  name: 'SHA-384 Hash',
  category: OP_CATEGORIES.HASHING,
  description: 'Computes a SHA-384 cryptographic hash.',
  direction: 'transform',
  aliases: ['sha384', 'sha-384', 'hash'],
  keywords: ['sha384', 'hash', 'digest'],
  inputType: 'text',
  outputType: 'text',
  icon: 'H',
  async: true,
  options: [
    {
      id: 'encoding',
      label: 'Output format',
      type: 'select',
      default: 'hex',
      choices: [
        { value: 'hex', label: 'Hexadecimal' },
        { value: 'base64', label: 'Base64' },
      ],
    },
  ],
  async execute(input, options) {
    const bytes = textToBytes(input);
    const hashBuffer = await crypto.subtle.digest('SHA-384', bytes);
    const hashArray = new Uint8Array(hashBuffer);
    if (options.encoding === 'base64') return bytesToBase64(hashArray, false, true);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  },
});

defineOp({
  id: 'normalize-whitespace',
  name: 'Normalize Whitespace',
  category: OP_CATEGORIES.TEXT,
  description: 'Replaces consecutive whitespace with single spaces, standardizes line endings.',
  direction: 'transform',
  aliases: ['normalize', 'whitespace'],
  keywords: ['normalize', 'whitespace', 'space', 'clean'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Nw',
  options: [
    {
      id: 'lines',
      label: 'Line endings',
      type: 'select',
      default: 'lf',
      choices: [
        { value: 'lf', label: 'LF (Unix)' },
        { value: 'crlf', label: 'CRLF (Windows)' },
        { value: 'keep', label: 'Keep original' },
      ],
    },
    {
      id: 'collapse',
      label: 'Spaces',
      type: 'select',
      default: 'yes',
      choices: [
        { value: 'yes', label: 'Collapse multiple spaces to one' },
        { value: 'no', label: 'Keep multiple spaces' },
      ],
    },
    {
      id: 'blank-lines',
      label: 'Blank lines',
      type: 'select',
      default: 'keep',
      choices: [
        { value: 'keep', label: 'Keep blank lines' },
        { value: 'remove', label: 'Remove blank lines' },
        { value: 'collapse', label: 'Collapse multiple blank lines to one' },
      ],
    },
  ],
  execute(input, options) {
    let result = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (options.collapse !== 'no') result = result.replace(/[^\S\n]+/g, ' ');
    if (options['blank-lines'] === 'remove')
      result = result
        .split('\n')
        .filter((l) => l.trim())
        .join('\n');
    else if (options['blank-lines'] === 'collapse') result = result.replace(/\n{3,}/g, '\n\n');
    if (options.lines === 'crlf') result = result.replace(/\n/g, '\r\n');
    return result;
  },
});

defineOp({
  id: 'csv-to-json',
  name: 'CSV to JSON',
  category: OP_CATEGORIES.FORMATTING,
  description: 'Converts CSV data to a JSON array of objects using the first row as keys.',
  direction: 'transform',
  aliases: ['csv', 'json', 'convert'],
  keywords: ['csv', 'json', 'convert', 'table'],
  inputType: 'text',
  outputType: 'text',
  icon: 'CSV',
  options: [
    {
      id: 'delimiter',
      label: 'Delimiter',
      type: 'select',
      default: 'comma',
      choices: [
        { value: 'comma', label: 'Comma' },
        { value: 'tab', label: 'Tab' },
        { value: 'semicolon', label: 'Semicolon' },
        { value: 'pipe', label: 'Pipe' },
      ],
    },
    {
      id: 'header',
      label: 'First row',
      type: 'select',
      default: 'yes',
      choices: [
        { value: 'yes', label: 'First row is header' },
        { value: 'no', label: 'No header (use index as key)' },
      ],
    },
  ],
  execute(input, options) {
    const delim = { comma: ',', tab: '\t', semicolon: ';', pipe: '|' }[
      options.delimiter || 'comma'
    ];
    const hasHeader = options.header !== 'no';
    const rows = parseCSV(input, delim);
    if (rows.length === 0) return '[]';
    let keys;
    let dataRows;
    if (hasHeader) {
      keys = rows[0];
      dataRows = rows.slice(1);
    } else {
      keys = rows[0].map((_, i) => String(i));
      dataRows = rows;
    }
    const result = dataRows.map((row) => {
      const obj = {};
      keys.forEach((k, i) => {
        obj[k] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });
    return JSON.stringify(result, null, 2);
  },
});

defineOp({
  id: 'json-to-csv',
  name: 'JSON to CSV',
  category: OP_CATEGORIES.FORMATTING,
  description: 'Converts a JSON array of objects to CSV format.',
  direction: 'transform',
  aliases: ['json', 'csv', 'convert'],
  keywords: ['json', 'csv', 'convert', 'export'],
  inputType: 'text',
  outputType: 'text',
  icon: 'CSV',
  options: [
    {
      id: 'delimiter',
      label: 'Delimiter',
      type: 'select',
      default: 'comma',
      choices: [
        { value: 'comma', label: 'Comma' },
        { value: 'tab', label: 'Tab' },
        { value: 'semicolon', label: 'Semicolon' },
      ],
    },
  ],
  execute(input, options) {
    const delim = { comma: ',', tab: '\t', semicolon: ';' }[options.delimiter || 'comma'];
    let data;
    try {
      data = JSON.parse(input.trim());
    } catch (e) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }
    if (!Array.isArray(data)) throw new Error('JSON input must be an array of objects.');
    if (data.length === 0) return '';
    const keys = [
      ...new Set(data.flatMap((obj) => (typeof obj === 'object' && obj ? Object.keys(obj) : []))),
    ];
    const csvEscape = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (s.includes(delim) || s.includes('"') || s.includes('\n'))
        return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const rows = [keys.map(csvEscape).join(delim)];
    for (const row of data) {
      rows.push(keys.map((k) => csvEscape(row[k])).join(delim));
    }
    return rows.join('\n');
  },
});

function parseCSV(text, delim) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i <= text.length; i++) {
    const ch = i < text.length ? text[i] : null;
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuote = false;
      } else if (ch !== null) {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === delim) {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === null) {
        if (ch === '\n' && field === '' && row.length === 0) continue;
        row.push(field);
        field = '';
        if (row.some((c) => c !== '') || rows.length > 0) rows.push(row);
        row = [];
      } else if (ch !== '\r') {
        field += ch;
      }
    }
  }
  return rows;
}

function sortObjectKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (typeof obj === 'object' && obj !== null) {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach((k) => {
        sorted[k] = sortObjectKeys(obj[k]);
      });
    return sorted;
  }
  return obj;
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes) {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function bytesToBase64(bytes, urlSafe, padding) {
  const standard = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const url = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const chars = urlSafe ? url : standard;
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : padding ? '=' : '';
    result += i + 2 < len ? chars[b2 & 63] : padding ? '=' : '';
  }
  return result;
}

function base64ToBytes(str) {
  const standard = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  const bytes = [];
  for (let i = 0; i < padded.length; i += 4) {
    const b0 = standard.indexOf(padded[i]);
    const b1 = standard.indexOf(padded[i + 1]);
    const b2 = standard.indexOf(padded[i + 2]);
    const b3 = standard.indexOf(padded[i + 3]);
    if (b0 < 0 || b1 < 0) {
      if (padded[i] === '=') break;
      throw new Error(`Invalid Base64 character "${padded[i]}" at position ${i}`);
    }
    bytes.push((b0 << 2) | (b1 >> 4));
    if (b2 >= 0) bytes.push(((b1 & 15) << 4) | (b2 >> 2));
    if (b3 >= 0) bytes.push(((b2 & 3) << 6) | b3);
  }
  return new Uint8Array(bytes);
}

window.RefractOps = {
  all: OPERATIONS,
  categories: OP_CATEGORIES,
  get(id) {
    return OPERATIONS.find((op) => op.id === id);
  },
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return OPERATIONS;
    return OPERATIONS.filter((op) => {
      return (
        op.name.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        (op.aliases || []).some((a) => a.toLowerCase().includes(q)) ||
        (op.keywords || []).some((k) => k.toLowerCase().includes(q)) ||
        op.category.toLowerCase().includes(q)
      );
    });
  },
};

defineOp({
  id: 'js-escape',
  name: 'JavaScript String Escape',
  category: OP_CATEGORIES.ENCODING,
  description: 'Escapes a string for use inside a JavaScript string literal.',
  direction: 'encode',
  aliases: ['javascript', 'js', 'escape', 'string'],
  keywords: ['javascript', 'js', 'escape', 'string', 'literal'],
  inputType: 'text',
  outputType: 'text',
  icon: 'JS',
  options: [
    {
      id: 'quotes',
      label: 'String delimiter',
      type: 'select',
      default: 'single',
      choices: [
        { value: 'single', label: "Single quote (')" },
        { value: 'double', label: 'Double quote (")' },
        { value: 'backtick', label: 'Backtick template literal (`)' },
      ],
    },
    {
      id: 'unicode',
      label: 'Non-ASCII',
      type: 'select',
      default: 'keep',
      choices: [
        { value: 'keep', label: 'Keep as-is' },
        { value: 'escape', label: 'Escape as \\uHHHH' },
      ],
    },
  ],
  help: {
    what: 'Escapes a string so it can safely be embedded in a JavaScript string literal.',
    examples: [
      { input: "She said 'hello'", output: "She said \\'hello\\'" },
      { input: 'Line1\nLine2', output: 'Line1\\nLine2' },
    ],
  },
  execute(input, options) {
    const quotes = options.quotes || 'single';
    const escapeUnicode = options.unicode === 'escape';
    let result = '';
    for (const ch of input) {
      const cp = ch.codePointAt(0);
      if (ch === '\\') {
        result += '\\\\';
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
      } else if (ch === '\0') {
        result += '\\0';
      } else if (quotes === 'single' && ch === "'") {
        result += "\\'";
      } else if (quotes === 'double' && ch === '"') {
        result += '\\"';
      } else if (quotes === 'backtick' && ch === '`') {
        result += '\\`';
      } else if (quotes === 'backtick' && ch === '$' && false) {
        result += '\\$';
      } else if (cp < 32 || cp === 127) {
        result += '\\x' + cp.toString(16).padStart(2, '0');
      } else if (escapeUnicode && cp > 127) {
        if (cp > 0xffff) {
          const high = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
          const low = ((cp - 0x10000) % 0x400) + 0xdc00;
          result +=
            '\\u' + high.toString(16).padStart(4, '0') + '\\u' + low.toString(16).padStart(4, '0');
        } else {
          result += '\\u' + cp.toString(16).padStart(4, '0');
        }
      } else {
        result += ch;
      }
    }
    return result;
  },
});

defineOp({
  id: 'js-unescape',
  name: 'JavaScript String Unescape',
  category: OP_CATEGORIES.ENCODING,
  description: 'Unescapes JavaScript string escape sequences back to their original characters.',
  direction: 'decode',
  aliases: ['javascript', 'js', 'unescape'],
  keywords: ['javascript', 'js', 'unescape', 'decode'],
  inputType: 'text',
  outputType: 'text',
  icon: 'JS',
  options: [],
  execute(input, options) {
    try {
      let s = input.trim();
      if (
        (s.startsWith("'") && s.endsWith("'")) ||
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith('`') && s.endsWith('`'))
      ) {
        s = s.slice(1, -1);
      }
      return JSON.parse('"' + s.replace(/\\'/g, "'").replace(/\\`/g, '`') + '"');
    } catch (e) {
      throw new Error('Invalid JavaScript escape sequence: ' + e.message);
    }
  },
});

defineOp({
  id: 'utf8-encode',
  name: 'UTF-8 Encode (to bytes)',
  category: OP_CATEGORIES.ENCODING,
  description: 'Shows the UTF-8 byte sequence for each character in the input.',
  direction: 'encode',
  aliases: ['utf8', 'utf-8', 'bytes'],
  keywords: ['utf8', 'utf-8', 'bytes', 'encode'],
  inputType: 'text',
  outputType: 'text',
  icon: 'U8',
  options: [
    {
      id: 'format',
      label: 'Output format',
      type: 'select',
      default: 'hex-space',
      choices: [
        { value: 'hex-space', label: 'Hex bytes with spaces (e2 82 ac)' },
        { value: 'hex-none', label: 'Hex bytes continuous (e282ac)' },
        { value: 'decimal', label: 'Decimal bytes (226 130 172)' },
      ],
    },
  ],
  help: {
    what: 'Converts text to its UTF-8 byte representation.',
    expects: 'Any Unicode text.',
    produces: 'The UTF-8 byte sequence in the chosen format.',
    examples: [
      {
        input: 'A',
        output: '41 (single byte: ASCII characters are identical in UTF-8)',
      },
      { input: '€', output: 'e2 82 ac (three bytes in UTF-8)' },
      { input: '😀', output: 'f0 9f 98 80 (four bytes in UTF-8)' },
    ],
    notes:
      'UTF-8 is a variable-width encoding. ASCII characters (U+0000 to U+007F) use 1 byte. Characters up to U+07FF use 2 bytes. Characters up to U+FFFF use 3 bytes. Characters up to U+10FFFF use 4 bytes.',
  },
  execute(input, options) {
    const fmt = options.format || 'hex-space';
    const bytes = new TextEncoder().encode(input);
    if (fmt === 'hex-none') {
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    if (fmt === 'decimal') {
      return Array.from(bytes).join(' ');
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
  },
});

defineOp({
  id: 'utf16-encode',
  name: 'UTF-16 Encode (to code units)',
  category: OP_CATEGORIES.ENCODING,
  description: 'Shows the UTF-16 code unit values for each character.',
  direction: 'encode',
  aliases: ['utf16', 'utf-16', 'ucs2'],
  keywords: ['utf16', 'utf-16', 'code units', 'encode'],
  inputType: 'text',
  outputType: 'text',
  icon: 'U16',
  options: [
    {
      id: 'endian',
      label: 'Byte order',
      type: 'select',
      default: 'be',
      choices: [
        { value: 'be', label: 'Big-endian (UTF-16 BE)' },
        { value: 'le', label: 'Little-endian (UTF-16 LE)' },
      ],
    },
    {
      id: 'format',
      label: 'Format',
      type: 'select',
      default: 'hex-space',
      choices: [
        { value: 'hex-space', label: 'Hex pairs with spaces' },
        { value: 'decimal', label: 'Decimal code units' },
      ],
    },
  ],
  execute(input, options) {
    const endian = options.endian || 'be';
    const fmt = options.format || 'hex-space';
    const units = [];
    for (let i = 0; i < input.length; i++) {
      units.push(input.charCodeAt(i));
    }
    if (fmt === 'decimal') return units.join(' ');
    return units
      .map((u) => {
        const hi = (u >> 8) & 0xff;
        const lo = u & 0xff;
        const bytes = endian === 'be' ? [hi, lo] : [lo, hi];
        return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
      })
      .join(' ');
  },
});

defineOp({
  id: 'ascii-table',
  name: 'ASCII Code Lookup',
  category: OP_CATEGORIES.BINARY,
  description: 'Shows the ASCII/Unicode code point for each character in the input.',
  direction: 'transform',
  aliases: ['ascii', 'charcode', 'code'],
  keywords: ['ascii', 'charcode', 'decimal', 'code', 'lookup'],
  inputType: 'text',
  outputType: 'text',
  icon: 'asc',
  options: [
    {
      id: 'base',
      label: 'Output base',
      type: 'select',
      default: 'decimal',
      choices: [
        { value: 'decimal', label: 'Decimal' },
        { value: 'hex', label: 'Hexadecimal' },
        { value: 'both', label: 'Both' },
      ],
    },
    {
      id: 'separator',
      label: 'Separator',
      type: 'select',
      default: 'space',
      choices: [
        { value: 'space', label: 'Space' },
        { value: 'newline', label: 'Newline' },
        { value: 'comma', label: 'Comma' },
      ],
    },
  ],
  execute(input, options) {
    const base = options.base || 'decimal';
    const sep = { space: ' ', newline: '\n', comma: ',' }[options.separator || 'space'];
    const units = [];
    for (const ch of input) {
      const cp = ch.codePointAt(0);
      if (base === 'decimal') units.push(cp);
      else if (base === 'hex') units.push(cp.toString(16).toUpperCase());
      else units.push(cp + '(0x' + cp.toString(16).toUpperCase() + ')');
    }
    return units.join(sep);
  },
});

defineOp({
  id: 'from-charcode',
  name: 'Code Points to Text',
  category: OP_CATEGORIES.BINARY,
  description: 'Converts numeric code points (decimal or hex) back to text characters.',
  direction: 'decode',
  aliases: ['charcode', 'fromcharcode', 'codepoint'],
  keywords: ['charcode', 'code points', 'decode', 'ascii'],
  inputType: 'text',
  outputType: 'text',
  icon: 'asc',
  options: [
    {
      id: 'base',
      label: 'Input base',
      type: 'select',
      default: 'decimal',
      choices: [
        { value: 'decimal', label: 'Decimal' },
        { value: 'hex', label: 'Hexadecimal' },
        { value: 'auto', label: 'Auto (0x prefix = hex)' },
      ],
    },
  ],
  execute(input, options) {
    const base = options.base || 'decimal';
    const parts = input
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean);
    return parts
      .map((p) => {
        p = p.replace(/^0x/i, '');
        const n = parseInt(
          p,
          base === 'decimal' ? 10 : base === 'hex' ? 16 : p.match(/^[0-9]+$/) ? 10 : 16,
        );
        if (isNaN(n)) throw new Error(`"${p}" is not a valid ${base} number`);
        if (n < 0 || n > 0x10ffff)
          throw new Error(`Code point ${n} is out of Unicode range (0 to 1114111)`);
        return String.fromCodePoint(n);
      })
      .join('');
  },
});

defineOp({
  id: 'line-numbers',
  name: 'Add Line Numbers',
  category: OP_CATEGORIES.TEXT,
  description: 'Prefixes each line with its line number.',
  direction: 'transform',
  aliases: ['line numbers', 'number lines'],
  keywords: ['line', 'numbers', 'prefix', 'count'],
  inputType: 'text',
  outputType: 'text',
  icon: '#L',
  options: [
    { id: 'start', label: 'Starting number', type: 'text', default: '1' },
    {
      id: 'separator',
      label: 'Separator',
      type: 'select',
      default: 'dot-space',
      choices: [
        { value: 'dot-space', label: '. (1. line)' },
        { value: 'colon-space', label: ': (1: line)' },
        { value: 'tab', label: 'Tab (1\\tline)' },
        { value: 'pipe', label: '| (1 | line)' },
      ],
    },
    {
      id: 'pad',
      label: 'Pad numbers',
      type: 'select',
      default: 'yes',
      choices: [
        { value: 'yes', label: 'Pad with spaces' },
        { value: 'no', label: 'No padding' },
      ],
    },
  ],
  execute(input, options) {
    const lines = input.split('\n');
    const start = parseInt(options.start || '1') || 1;
    const width = options.pad !== 'no' ? String(lines.length + start - 1).length : 0;
    const sep = {
      'dot-space': '. ',
      'colon-space': ': ',
      tab: '\t',
      pipe: ' | ',
    }[options.separator || 'dot-space'];
    return lines
      .map((line, i) => {
        const num = String(i + start).padStart(width, ' ');
        return num + sep + line;
      })
      .join('\n');
  },
});

defineOp({
  id: 'count-occurrences',
  name: 'Count Occurrences',
  category: OP_CATEGORIES.ANALYSIS,
  description: 'Counts how many times each unique line appears in the input.',
  direction: 'transform',
  aliases: ['count', 'frequency', 'occurrences'],
  keywords: ['count', 'occurrences', 'frequency', 'unique', 'analysis'],
  inputType: 'text',
  outputType: 'text',
  icon: 'Cnt',
  options: [
    {
      id: 'sort',
      label: 'Sort by',
      type: 'select',
      default: 'count-desc',
      choices: [
        { value: 'count-desc', label: 'Count (most frequent first)' },
        { value: 'count-asc', label: 'Count (least frequent first)' },
        { value: 'alpha', label: 'Alphabetical' },
      ],
    },
    {
      id: 'case',
      label: 'Case',
      type: 'select',
      default: 'sensitive',
      choices: [
        { value: 'sensitive', label: 'Case sensitive' },
        { value: 'insensitive', label: 'Case insensitive' },
      ],
    },
  ],
  execute(input, options) {
    const lines = input.split('\n');
    const counts = new Map();
    const origCase = new Map();
    for (const line of lines) {
      const key = options.case === 'insensitive' ? line.toLowerCase() : line;
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!origCase.has(key)) origCase.set(key, line);
    }
    let entries = [...counts.entries()];
    if (options.sort === 'count-desc') entries.sort((a, b) => b[1] - a[1]);
    else if (options.sort === 'count-asc') entries.sort((a, b) => a[1] - b[1]);
    else entries.sort((a, b) => a[0].localeCompare(b[0]));
    const maxCount = Math.max(...entries.map((e) => e[1]));
    const width = String(maxCount).length;
    return entries.map(([k, n]) => `${String(n).padStart(width)} ${origCase.get(k)}`).join('\n');
  },
});

defineOp({
  id: 'to-morse',
  name: 'Text to Morse Code',
  category: OP_CATEGORIES.ENCODING,
  description: 'Encodes ASCII text as Morse code.',
  direction: 'encode',
  aliases: ['morse', 'dots', 'dashes'],
  keywords: ['morse', 'encode', 'telegraph', 'dots', 'dashes'],
  inputType: 'text',
  outputType: 'text',
  icon: '.-',
  options: [
    {
      id: 'separator',
      label: 'Letter separator',
      type: 'select',
      default: 'space',
      choices: [
        { value: 'space', label: 'Space' },
        { value: 'slash', label: '/' },
      ],
    },
  ],
  execute(input, options) {
    const MORSE = {
      A: '.-',
      B: '-...',
      C: '-.-.',
      D: '-..',
      E: '.',
      F: '..-.',
      G: '--.',
      H: '....',
      I: '..',
      J: '.---',
      K: '-.-',
      L: '.-..',
      M: '--',
      N: '-.',
      O: '---',
      P: '.--.',
      Q: '--.-',
      R: '.-.',
      S: '...',
      T: '-',
      U: '..-',
      V: '...-',
      W: '.--',
      X: '-..-',
      Y: '-.--',
      Z: '--..',
      0: '-----',
      1: '.----',
      2: '..---',
      3: '...--',
      4: '....-',
      5: '.....',
      6: '-....',
      7: '--...',
      8: '---..',
      9: '----.',
      '.': '.-.-.-',
      ',': '--..--',
      '?': '..--..',
      '!': '-.-.--',
      "'": '----.',
      '-': '-....-',
      '/': '-..-.',
      '(': '-.--.',
      ')': `-.--.-`,
      '"': '.-..-.',
      '@': '.--.-.',
      '+': '.-.-.',
    };
    const sep = options.separator === 'slash' ? ' / ' : ' ';
    return input
      .toUpperCase()
      .split('')
      .map((ch) => {
        if (ch === ' ') return '/';
        return MORSE[ch] || '?';
      })
      .join(sep);
  },
});

defineOp({
  id: 'rot13',
  name: 'ROT13',
  category: OP_CATEGORIES.ENCODING,
  description:
    'Applies the ROT13 substitution cipher, rotating letters by 13 positions. Encoding and decoding are identical.',
  direction: 'encode',
  aliases: ['rot13', 'caesar', 'rotate'],
  keywords: ['rot13', 'caesar', 'cipher', 'rotate', 'letters'],
  inputType: 'text',
  outputType: 'text',
  icon: 'R13',
  options: [
    {
      id: 'variant',
      label: 'Variant',
      type: 'select',
      default: 'rot13',
      choices: [
        { value: 'rot13', label: 'ROT13 (letters)' },
        { value: 'rot47', label: 'ROT47 (printable ASCII)' },
        { value: 'custom', label: 'Custom shift' },
      ],
    },
    {
      id: 'shift',
      label: 'Shift amount (custom)',
      type: 'text',
      default: '13',
    },
  ],
  execute(input, options) {
    const variant = options.variant || 'rot13';
    if (variant === 'rot47') {
      return input.replace(/[\x21-\x7E]/g, (ch) => {
        return String.fromCharCode(((ch.charCodeAt(0) - 33 + 47) % 94) + 33);
      });
    }
    const shift = variant === 'custom' ? parseInt(options.shift) || 13 : 13;
    return input.replace(/[A-Za-z]/g, (ch) => {
      const base = ch >= 'a' ? 97 : 65;
      return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26) + base);
    });
  },
});
