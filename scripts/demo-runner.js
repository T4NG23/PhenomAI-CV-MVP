#!/usr/bin/env node

/**
 * Demo Runner Script
 * 
 * Runs the interview integrity system in demo mode with pre-recorded data.
 * This simulates a full interview session with anomalies and generates a report.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEMO_DATA_DIR = path.join(__dirname, '..', 'demo-data');
const DEMO_SESSIONS = [
  'session-with-phone',
  'session-with-second-person',
  'session-with-gaze-anomalies',
  'session-clean'
];

console.log('🎬 Interview Integrity MVP - Demo Mode\n');

function displayMenu() {
  console.log('Available demo scenarios:');
  console.log('1. Session with phone detected');
  console.log('2. Session with second person entering frame');
  console.log('3. Session with frequent off-screen gazes');
  console.log('4. Clean session (no anomalies)');
  console.log('5. Run all scenarios sequentially');
  console.log('0. Exit\n');
}

function checkDemoData() {
  if (!fs.existsSync(DEMO_DATA_DIR)) {
    console.error('❌ Demo data directory not found!');
    console.log('Creating demo data structure...\n');
    fs.mkdirSync(DEMO_DATA_DIR, { recursive: true });
    createDemoStructure();
  }
  
  const hasDemoFiles = DEMO_SESSIONS.some(session => 
    fs.existsSync(path.join(DEMO_DATA_DIR, session))
  );
  
  if (!hasDemoFiles) {
    console.log('⚠️  No demo session data found. Generating sample data...\n');
    generateDemoData();
  }
}

function createDemoStructure() {
  const dirs = [
    'session-with-phone',
    'session-with-second-person',
    'session-with-gaze-anomalies',
    'session-clean',
    'sql'
  ];
  
  dirs.forEach(dir => {
    const dirPath = path.join(DEMO_DATA_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  console.log('✅ Demo data structure created\n');
}

function generateDemoData() {
  console.log('Generating demo session data...');
  
  // Generate sample event logs for each scenario
  DEMO_SESSIONS.forEach((session, index) => {
    const sessionDir = path.join(DEMO_DATA_DIR, session);
    const eventsFile = path.join(sessionDir, 'events.json');
    const metadataFile = path.join(sessionDir, 'metadata.json');
    
    // Sample events
    const events = generateSampleEvents(session, index + 1);
    const metadata = {
      session_id: `demo-${index + 1}`,
      candidate_name: `Demo Candidate ${index + 1}`,
      interviewer_name: 'Demo Interviewer',
      duration_minutes: 30,
      timestamp: new Date().toISOString(),
      scenario: session.replace(/-/g, ' ')
    };
    
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  });
  
  console.log('✅ Demo data generated\n');
}

function generateSampleEvents(sessionType, sessionId) {
  const events = [];
  const baseTime = new Date('2025-11-25T14:00:00Z');
  
  // Generate 1800 events (30 minutes at 1 event/second)
  for (let i = 0; i < 1800; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 1000);
    
    const event = {
      session_id: `demo-${sessionId}`,
      timestamp: timestamp.toISOString(),
      frame_id: `f-${String(i).padStart(6, '0')}`,
      face_bbox: [120 + Math.random() * 20, 80 + Math.random() * 20, 300, 400],
      head_pose: {
        yaw: (Math.random() - 0.5) * 30,
        pitch: (Math.random() - 0.5) * 20,
        roll: (Math.random() - 0.5) * 10
      },
      gaze_vector: [Math.random() - 0.5, Math.random() - 0.5],
      objects: [],
      audio_vad: Math.random() > 0.3
    };
    
    // Add scenario-specific anomalies
    if (sessionType === 'session-with-phone' && i >= 300 && i <= 450) {
      event.objects.push({ label: 'phone', confidence: 0.85 + Math.random() * 0.1 });
      event.head_pose.pitch = -25 - Math.random() * 10; // Looking down
    }
    
    if (sessionType === 'session-with-second-person' && i >= 600 && i <= 750) {
      event.objects.push({ label: 'person', confidence: 0.78 + Math.random() * 0.15 });
      event.audio_vad = true; // More audio activity
    }
    
    if (sessionType === 'session-with-gaze-anomalies') {
      if (i % 120 >= 60 && i % 120 < 90) { // Every 2 minutes, look away for 30s
        event.gaze_vector = [0.8 + Math.random() * 0.2, Math.random() - 0.5];
        event.head_pose.yaw = 45 + Math.random() * 15;
      }
    }
    
    events.push(event);
  }
  
  return events;
}

function runDemo(scenarioIndex) {
  if (scenarioIndex < 1 || scenarioIndex > 4) {
    console.log('Invalid scenario selection\n');
    return;
  }
  
  const scenario = DEMO_SESSIONS[scenarioIndex - 1];
  console.log(`\n🎥 Running demo: ${scenario.replace(/-/g, ' ')}\n`);
  
  // Start the demo
  console.log('Starting services...');
  const dockerCompose = spawn('docker-compose', [
    '-f', path.join(__dirname, '..', 'infra', 'docker-compose.demo.yml'),
    'up', '-d'
  ]);
  
  dockerCompose.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  
  dockerCompose.stderr.on('data', (data) => {
    console.error(data.toString());
  });
  
  dockerCompose.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Demo services started!');
      console.log('\n📊 Access the demo at: http://localhost:3100');
      console.log('📈 API endpoint: http://localhost:8010');
      console.log('🔌 WebSocket: ws://localhost:3011');
      console.log('\nPress Ctrl+C to stop the demo\n');
    } else {
      console.error(`\n❌ Failed to start demo services (exit code: ${code})`);
    }
  });
}

function stopDemo() {
  console.log('\n🛑 Stopping demo services...');
  const dockerCompose = spawn('docker-compose', [
    '-f', path.join(__dirname, '..', 'infra', 'docker-compose.demo.yml'),
    'down'
  ]);
  
  dockerCompose.on('close', (code) => {
    console.log('✅ Demo stopped\n');
    process.exit(0);
  });
}

// Main execution
checkDemoData();
displayMenu();

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Select a scenario (0-5): ', (answer) => {
  const choice = parseInt(answer);
  
  if (choice === 0) {
    console.log('Exiting...\n');
    process.exit(0);
  } else if (choice === 5) {
    console.log('Running all scenarios sequentially...\n');
    // Run all scenarios
    for (let i = 1; i <= 4; i++) {
      runDemo(i);
    }
  } else {
    runDemo(choice);
  }
  
  rl.close();
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  stopDemo();
});
