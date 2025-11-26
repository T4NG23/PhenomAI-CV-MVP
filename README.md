# Phenomitor

An AI-powered behavioral monitoring system that detects observable anomalies during remote sessions. The system provides human-readable reports without making claims about intent or truthfulness.

**Developed by William Hudson Tang**

## Purpose

This system helps interviewers by:
- Monitoring webcam and audio streams during interviews
- Detecting observable behavioral patterns (gaze, objects, audio anomalies)
- Generating post-interview reports with timestamped evidence
- Providing reviewers with objective data for follow-up questions

## Ethical Framework

- **Explicit consent required** - Candidates must opt-in
- **No intent claims** - System only reports observable behaviors
- **Human oversight** - All anomalies require human review
- **Privacy-first** - Local processing option, automatic data deletion
- **Accessibility** - Accommodation flow for candidates with disabilities

## Architecture

```
phenomitor/
├── web-client/          # React/TS app with MediaPipe CV models
├── api-gateway/         # FastAPI for auth & user management
├── realtime-engine/     # Node.js WebSocket server & event fusion
├── cv-inference/        # Python microservice for heavy CV models
├── vlm-service/         # Python VLM/VQA post-processing
├── demo-data/           # Pre-recorded sessions for demo mode
├── infra/               # Docker Compose & deployment configs
├── docs/                # Architecture & compliance documentation
└── backend/             # Legacy (to be migrated)
```

## Quick Start

### Live Interview Mode

```bash
# Start all services
npm run start:all

# Or manually:
docker-compose up -d
npm run dev
```

### Demo Mode

```bash
# Run with pre-recorded demo data
npm run demo

# This will:
# 1. Load a pre-recorded interview session
# 2. Simulate real-time events
# 3. Generate a sample report
```

## Demo Mode Features

Demo mode uses pre-recorded data to showcase:
- Real-time anomaly detection
- Gaze tracking and off-screen detection
- Object detection (phone, paper, second monitor)
- Multi-person detection
- Audio anomaly flagging
- VLM-generated reports

Perfect for:
- Sales demonstrations
- Testing new features
- Training interviewers
- Compliance audits

## Core Features

### Real-time Detection
- Face detection & head-pose estimation
- Gaze tracking (on/off screen)
- Object detection (phone, paper, monitor, other people)
- Audio monitoring (VAD, overlapping speakers, source changes)
- Lip-sync verification

### Anomaly Detection
- Behavioral scoring (gaze, object presence, audio)
- Baseline modeling per candidate
- Configurable thresholds
- Confidence levels

### VLM Post-Processing
- Natural language explanations
- Frame-level evidence citations
- Recruiter-friendly summaries
- Follow-up question suggestions

## Tech Stack

- **Frontend**: React, TypeScript, MediaPipe, TensorFlow.js
- **Backend**: FastAPI (Python), Node.js (real-time)
- **CV Models**: MediaPipe, YOLO, custom pose detection
- **VLM**: LLaVA/Qwen-VL compatible models
- **Storage**: PostgreSQL, S3-compatible object store
- **Real-time**: WebSockets (Socket.io)
- **Deployment**: Docker, Docker Compose

## Requirements

- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- GPU (optional, for faster CV inference)

## Google Cloud Configuration

This project uses Google Cloud services for AI features:

- **Project Name**: PhenomAICV
- **Project ID**: gen-lang-client-0687044721
- **Project Number**: 15971132718

To enable Gemini API:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Select project `gen-lang-client-0687044721`
3. Create API key
4. Add to `.env.local` as `GOOGLE_API_KEY=your-key-here`

## Privacy & Compliance

- GDPR/CCPA compliant data handling
- Encrypted storage and transmission
- Configurable data retention
- Audit logging
- DSAR export tools
- Consent management

## Event Schema

```json
{
  "session_id": "sess-123",
  "timestamp": "2025-11-25T14:05:02Z",
  "frame_id": "f-0001",
  "face_bbox": [x, y, w, h],
  "head_pose": {"yaw": -12.2, "pitch": 3.4, "roll": 0.7},
  "gaze_vector": [0.2, -0.8],
  "objects": [{"label": "phone", "confidence": 0.85}],
  "audio_vad": true
}
```

## Building the Executable

Create a standalone executable for distribution:

```bash
npm run build:exe
```

This creates a portable package in the `dist` folder containing:
- Start/stop scripts for Windows, macOS, and Linux
- All necessary Docker images
- Configuration files
- Documentation

## Testing

```bash
# Run all tests
npm test

# Run E2E demo test
npm run test:e2e:demo

# Privacy compliance tests
npm run test:privacy
```

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Privacy & Ethics](./docs/privacy.md)
- [API Reference](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Demo Mode Guide](./docs/demo-mode.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

## License

See [LICENSE](./LICENSE) file.

## Important Notice

This system is designed to **support human decision-making**, not replace it. All flagged anomalies must be reviewed by qualified human reviewers. The system does not determine guilt, truthfulness, or intent.