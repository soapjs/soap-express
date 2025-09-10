import { spawn } from 'child_process';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import * as path from 'path';
import { readdirSync } from 'fs';

// Handle process termination gracefully
let isShuttingDown = false;

process.on('SIGINT', async () => {
  if (isShuttingDown) {
    console.log('🛑 Force exiting...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log('🛑 Received SIGINT, cleaning up...');
  await teardownApp();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (isShuttingDown) {
    console.log('🛑 Force exiting...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log('🛑 Received SIGTERM, cleaning up...');
  await teardownApp();
  process.exit(0);
});

let appProcess: any;
let appUrl: string;

async function setupApp(): Promise<string> {
  console.log('🚀 Starting SoapExpress app for integration tests...');
  
  // Build the app first
  console.log('🔨 Building the application...');
  const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  
  await new Promise((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve(void 0);
      } else {
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });
  });
  
  // Start SoapExpress app locally
  console.log('🚀 Starting local SoapExpress app...');
  appProcess = spawn('node', ['build/examples/example.js'], {
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: '3000'
    }
  });
  
  appUrl = 'http://localhost:3000';
  
  // Wait a bit for the app to be fully ready
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log(`✅ SoapExpress app started locally`);
  console.log(`🔗 App URL: ${appUrl}`);
  
  return appUrl;
}

async function teardownApp(): Promise<void> {
  if (appProcess) {
    console.log('🛑 Stopping SoapExpress app...');
    appProcess.kill();
    console.log('✅ SoapExpress app stopped');
  }
}

async function runTestFile(testFile: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running test: ${testFile}`);
    
    const testProcess = spawn('npx', [
      'jest',
      '--config=jest.config.integration.json',
      '--testPathPattern=' + testFile,
      '--verbose',
      '--forceExit'
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        SOAP_EXPRESS_URL: appUrl,
        TEST_APP_URL: appUrl
      }
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Test passed: ${testFile}`);
        resolve(true);
      } else {
        console.log(`❌ Test failed: ${testFile} (exit code: ${code})`);
        resolve(false);
      }
    });

    testProcess.on('error', (error) => {
      console.error(`❌ Error running test ${testFile}:`, error);
      resolve(false);
    });
  });
}

async function runAllIntegrationTests(): Promise<void> {
  const testFiles = readdirSync(path.join(__dirname, '..', 'integration')).filter(file => file.endsWith('.test.ts'));

  try {
    // Setup SoapExpress app container
    await setupApp();
    
    // Wait a bit for container to be fully ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📋 Running integration tests...');
    
    const results: { file: string; passed: boolean }[] = [];
    
    for (const testFile of testFiles) {
      const passed = await runTestFile(testFile);
      results.push({ file: testFile, passed });
    }
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.file}`);
    });
    
    console.log(`\n📈 Total: ${results.length} tests`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error during test execution:', error);
    process.exit(1);
  } finally {
    await teardownApp();
  }
}


// Run the tests
runAllIntegrationTests();
