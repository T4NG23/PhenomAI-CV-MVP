# Demo Mode Guide

This guide explains how to use the Interview Integrity system in demo mode.

## Overview

Demo mode allows you to showcase the system's capabilities without needing a live interview. It uses pre-recorded sessions with known anomalies to demonstrate detection features.

## Demo Scenarios

### 1. Session with Phone Detected
- **Duration**: 30 minutes
- **Anomaly**: Candidate looks at phone between 5:00-7:30
- **Detects**: Object detection (phone), downward gaze, head pose changes

### 2. Session with Second Person
- **Duration**: 30 minutes
- **Anomaly**: Another person enters frame at 10:00-12:30
- **Detects**: Multi-person detection, audio anomalies (multiple voices)

### 3. Session with Gaze Anomalies
- **Duration**: 30 minutes
- **Anomaly**: Frequent off-screen gazes throughout
- **Detects**: High off-screen gaze rate, head turning patterns

### 4. Clean Session
- **Duration**: 30 minutes
- **Anomaly**: None
- **Purpose**: Baseline comparison, shows normal behavior

## Running Demo Mode

### Quick Start

```bash
npm run demo
```

This will:
1. Display available demo scenarios
2. Let you select one
3. Start the system with that scenario
4. Open the UI in your browser

### Full Docker Mode

```bash
npm run demo:full
```

This starts all services in demo mode:
- Demo UI at http://localhost:3100
- API at http://localhost:8010
- WebSocket at ws://localhost:3011

### Manual Selection

```bash
# Start demo infrastructure
docker-compose -f infra/docker-compose.demo.yml up -d

# Access UI
open http://localhost:3100
```

## Demo Data Structure

```
demo-data/
├── session-with-phone/
│   ├── events.json          # Event stream
│   ├── metadata.json        # Session info
│   ├── frames/              # Sample frames (optional)
│   └── report.json          # Generated report
├── session-with-second-person/
├── session-with-gaze-anomalies/
├── session-clean/
└── sql/
    └── init.sql             # Demo database seed
```

## Event Format

Each `events.json` contains an array of events:

```json
{
  "session_id": "demo-1",
  "timestamp": "2025-11-25T14:05:02Z",
  "frame_id": "f-000300",
  "face_bbox": [120, 80, 300, 400],
  "head_pose": {
    "yaw": -12.2,
    "pitch": -25.4,
    "roll": 0.7
  },
  "gaze_vector": [0.2, -0.8],
  "objects": [
    {
      "label": "phone",
      "confidence": 0.87
    }
  ],
  "audio_vad": true
}
```

## Demo UI Features

The demo UI includes:

1. **Playback Controls**
   - Play/pause simulation
   - Speed control (1x, 2x, 5x)
   - Skip to flagged events

2. **Live Metrics**
   - Real-time anomaly scores
   - Gaze heatmap
   - Object timeline
   - Audio activity

3. **Report Generation**
   - Automatic report at end
   - VLM explanations
   - Downloadable PDF

4. **Comparison Mode**
   - Run multiple scenarios side-by-side
   - Compare metrics
   - A/B testing for thresholds

## Creating Custom Demo Data

### 1. Record a Session

```bash
# Record from actual interview (with consent)
npm run record-demo --session-id custom-demo-1
```

### 2. Generate Synthetic Data

```bash
# Use the demo generator
node scripts/generate-demo-data.js \
  --duration 1800 \
  --anomaly-type phone \
  --anomaly-start 300 \
  --anomaly-duration 150
```

### 3. Manual Creation

Create a directory in `demo-data/` with:

- `events.json` - Event stream (see format above)
- `metadata.json` - Session metadata
- `frames/` (optional) - Sample video frames

## Demo Playback Settings

Edit `infra/docker-compose.demo.yml` to configure:

```yaml
environment:
  DEMO_MODE: "true"
  DEMO_SPEED: "1.0"              # Playback speed multiplier
  DEMO_REALTIME: "true"          # True = realtime, false = fast
  DEMO_AUTO_REPORT: "true"       # Generate report automatically
  DEMO_LOOP: "false"             # Loop session when complete
```

## Use Cases

### Sales Demonstrations
- Show capabilities to prospects
- No privacy concerns (pre-recorded)
- Consistent experience

### Training Interviewers
- Practice using the interface
- Understand anomaly types
- Learn report interpretation

### Testing Features
- Validate new detection algorithms
- Test UI changes
- Benchmark performance

### Compliance Audits
- Show system behavior
- Demonstrate fairness
- Validate privacy controls

## Stopping Demo Mode

```bash
# Using npm
npm run stop:all

# Or manually
docker-compose -f infra/docker-compose.demo.yml down
```

## Troubleshooting

### Demo won't start
- Ensure Docker is running
- Check ports 3100, 8010, 3011 are available
- Verify demo data exists: `ls demo-data/`

### Events playing too fast
- Adjust `DEMO_SPEED` in docker-compose.demo.yml
- Set `DEMO_REALTIME: "true"` for 1:1 playback

### Missing data
```bash
# Regenerate demo data
npm run demo:generate
```

### VLM service slow
- VLM processing is intentionally delayed in demo
- For faster demos, set `DEMO_AUTO_REPORT: "false"`
- Generate reports manually after playback

## Advanced: Multi-Session Comparison

Run multiple demos simultaneously:

```bash
# Terminal 1
DEMO_SESSION=phone DEMO_PORT=3101 npm run demo

# Terminal 2
DEMO_SESSION=gaze DEMO_PORT=3102 npm run demo

# Terminal 3
DEMO_SESSION=clean DEMO_PORT=3103 npm run demo
```

Then access:
- http://localhost:3101 (phone scenario)
- http://localhost:3102 (gaze scenario)
- http://localhost:3103 (clean baseline)

## Demo API Endpoints

When demo mode is running:

```bash
# List available scenarios
curl http://localhost:8010/demo/scenarios

# Get scenario details
curl http://localhost:8010/demo/scenarios/session-with-phone

# Start playback
curl -X POST http://localhost:8010/demo/sessions \
  -H "Content-Type: application/json" \
  -d '{"scenario": "session-with-phone", "speed": 2.0}'

# Get current playback status
curl http://localhost:8010/demo/sessions/{session_id}/status
```

## Tips for Effective Demos

1. **Start with clean session** - Show normal behavior first
2. **Explain before playing** - Set context for what to watch for
3. **Use 2x speed** - Keeps demos engaging without being too fast
4. **Highlight specific timestamps** - Point out when anomalies occur
5. **Show the report** - Demonstrate VLM explanations
6. **Discuss edge cases** - Use multi-person scenario to show limitations

## Next Steps

- [Build an executable](../README.md#building-the-executable) for distribution
- [Configure thresholds](./configuration.md) for your use case
- [Add custom scenarios](./extending-demos.md) specific to your needs
