import "@testing-library/jest-dom";

// src/lib/openai.ts constructs the OpenAI client at import time, which throws
// without a key. next/jest doesn't load .env.local, so give tests a dummy key.
// Tests must mock any actual API call — this key can't reach OpenAI.
process.env.OPENAI ??= "test-key-not-real";
