import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateImage, generateText } from '../services/ai.service.js';

// Setup environment
const __filename = typeof import.meta.url !== 'undefined' ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();
dotenv.config({ path: path.join(__dirname, __filename ? '../../.env' : '.env') });

async function runTests() {
  console.log('🚀 STARTING AI SERVICE TESTS\n');
  let passCount = 0;
  let failCount = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      console.log(`[TEST] ${name}...`);
      await fn();
      console.log(`✅ PASSED: ${name}\n`);
      passCount++;
    } catch (err: any) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${err.message}\n`);
      failCount++;
    }
  };

  // --- TEXT GENERATION TESTS ---
  await test('Text Generation (Gemini)', async () => {
    const text = await generateText('Say "Hello World" in Vietnamese');
    if (!text || text.length < 5) throw new Error('Result too short or empty');
    console.log(`   Sample: "${text.substring(0, 50)}..."`);
  });

  // --- IMAGE DISCOVERY TESTS ---
  await test('Image Discovery: Priority Keywords', async () => {
    const topic = 'Luxury Watch';
    const keywords = ['silver', 'macro', 'swiss'];
    const url = await generateImage(topic, '', keywords);
    if (!url.includes('http')) throw new Error('Invalid URL returned');
    // Ensure it didn't use the topic if keywords exist (internal logic check via console would be better, but we check if it returns a URL)
  });

  await test('Image Discovery: Fallback to Topic', async () => {
    const topic = 'Vietnamese Landscape';
    const url = await generateImage(topic);
    if (!url.includes('http')) throw new Error('Invalid URL returned');
  });

  await test('Image Discovery: Cloudinary Integration', async () => {
    // This implicitly tests if the buffer is fetched and uploaded
    const url = await generateImage('Minimalist Office');
    if (process.env.CLOUDINARY_CLOUD_NAME && !url.includes('cloudinary.com')) {
       throw new Error('Image was not uploaded to Cloudinary');
    }
  });

  console.log('----------------------------------------');
  console.log(`SUMMARY: ${passCount} passed, ${failCount} failed.`);
  console.log('----------------------------------------');

  if (failCount > 0) process.exit(1);
}

runTests();
