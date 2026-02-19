// Environment setup - runs before Jest loads modules
global.__DEV__ = true;

// Polyfill TextDecoder/TextEncoder for Node
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
