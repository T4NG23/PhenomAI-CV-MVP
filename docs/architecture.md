# Interview Integrity MVP - Architecture

## System Overview

The Interview Integrity MVP is a distributed system designed to monitor remote interviews in real-time and generate post-session reports with observable behavioral data.

## Design Principles

1. **Privacy-first**: Local processing where possible, minimal data retention
2. **Ethical AI**: No intent detection, only observable behaviors
3. **Human-in-the-loop**: All anomalies require human review
4. **Modular**: Services can be deployed independently
5. **Observable**: Comprehensive logging and monitoring

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CANDIDATE                                │
│                    (Webcam + Microphone)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ WebRTC Stream
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       WEB CLIENT                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  MediaPipe   │  │  TF.js Gaze  │  │ Audio VAD    │          │
│  │  Face/Pose   │  │  Estimation  │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                 │
│                             │                                    │
│                    Event Batching & Buffering                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ WebSocket (Socket.io)
                             │ Event Stream
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REALTIME ENGINE (Node.js)                      │
│  ┌──────────────────────────────────────────────────────┐       │
│  │          Event Fusion & Aggregation                  │       │
│  │  • Sliding window metrics (30s, 1min, 5min)         │       │
│  │  • Baseline computation                              │       │
│  │  • Anomaly scoring                                   │       │
│  │  • Rule-based flagging                               │       │
│  └──────────────────────────────────────────────────────┘       │
│         │                                        │               │
│         │ Store Events                           │ Emit Flags    │
│         ▼                                        ▼               │
│  ┌──────────────┐                        ┌──────────────┐       │
│  │  PostgreSQL  │                        │ WebSocket    │       │
│  │  Event Log   │                        │ to Dashboard │       │
│  └──────────────┘                        └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   CV INFERENCE SERVICE   │   │     API GATEWAY          │
│       (Python)           │   │     (FastAPI)            │
│                          │   │                          │
│  • Heavy object detect   │   │  • Authentication        │
│  • YOLO models           │   │  • Session management    │
│  • Scene analysis        │   │  • Consent tracking      │
│  • Optional GPU accel    │   │  • Report API            │
└──────────────────────────┘   └──────────────────────────┘
              │
              │ (Post-session)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VLM SERVICE (Python)                          │
│  ┌──────────────────────────────────────────────────────┐       │
│  │    Vision Language Model (LLaVA/Qwen-VL)             │       │
│  │  • Scene description generation                      │       │
│  │  • VQA (Visual Question Answering)                   │       │
│  │  • Explanation generation                            │       │
│  │  • Report summarization                              │       │
│  └──────────────────────────────────────────────────────┘       │
│                             │                                    │
│                             ▼                                    │
│                  ┌────────────────────┐                          │
│                  │  Report Generator  │                          │
│                  │  (HTML/PDF)        │                          │
│                  └────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTERVIEWER DASHBOARD                         │
│  • Live stream view with overlays                                │
│  • Real-time anomaly flags                                       │
│  • Timeline with clickable events                                │
│  • Post-interview report viewer                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### Web Client (React + TypeScript)

**Responsibilities:**
- Capture webcam and microphone streams
- Run lightweight CV models in-browser (MediaPipe, TensorFlow.js)
- Batch and stream events to realtime engine
- Display interviewer dashboard
- Handle consent flow

**Key Technologies:**
- React 19
- TypeScript
- MediaPipe (face detection, head-pose estimation)
- TensorFlow.js (gaze estimation)
- Web Audio API (VAD, audio analysis)
- Socket.io-client (WebSocket connection)

**Event Flow:**
1. Capture frame from webcam (30 FPS)
2. Downsample to 10 FPS for inference
3. Run MediaPipe face detection
4. Extract head-pose (yaw, pitch, roll)
5. Estimate gaze vector
6. Detect basic objects (phone, paper)
7. Analyze audio stream (VAD, volume)
8. Batch events (100ms windows)
9. Emit to realtime engine via WebSocket

### Realtime Engine (Node.js + Express)

**Responsibilities:**
- Accept WebSocket connections from clients
- Receive and validate event streams
- Compute sliding-window metrics
- Detect anomalies using configurable rules
- Persist events to database
- Emit real-time alerts to dashboard

**Key Technologies:**
- Node.js 18+
- Express
- Socket.io (WebSocket)
- PostgreSQL client
- Redis (optional, for session state)

**Metrics Computed:**
- Off-screen gaze rate (30s, 1min, 5min windows)
- Object presence duration
- Face absence duration
- Audio anomaly rate
- Multi-person detection count
- Head-pose variation (standard deviation)

**Anomaly Rules:**
```javascript
{
  "off_screen_gaze": {
    "threshold": 0.6,  // 60% of window
    "window": "1min",
    "severity": "medium"
  },
  "object_phone": {
    "threshold": 5,    // 5 seconds continuous
    "severity": "high"
  },
  "multi_person": {
    "threshold": 1,    // any detection
    "severity": "high"
  }
}
```

### CV Inference Service (Python + PyTorch)

**Responsibilities:**
- Heavy object detection (YOLO)
- Scene analysis
- Provide higher-accuracy alternative to client-side inference
- GPU-accelerated when available

**Key Technologies:**
- FastAPI
- PyTorch / ONNX Runtime
- YOLOv8 (object detection)
- OpenCV

**API Endpoints:**
```
POST /detect/objects
POST /detect/scene
GET /models/status
```

### VLM Service (Python)

**Responsibilities:**
- Generate natural language scene descriptions
- Answer visual questions (VQA)
- Create human-readable explanations for anomalies
- Summarize sessions into reports

**Key Technologies:**
- FastAPI
- HuggingFace Transformers
- LLaVA / Qwen-VL (or similar VLM)
- PIL (image processing)

**API Endpoints:**
```
POST /vlm/describe       # Scene description
POST /vlm/vqa            # Visual Q&A
POST /vlm/explain        # Explain anomaly
POST /vlm/summarize      # Generate report
```

**Example VLM Output:**
```json
{
  "description": "The candidate is looking down and to the right. A rectangular object consistent with a mobile phone is visible in their hands between timestamps 05:12 and 07:24.",
  "confidence": 0.82,
  "evidence_frames": ["f-09360", "f-10080", "f-13320"],
  "timestamp_ranges": [
    {"start": "05:12", "end": "07:24"}
  ]
}
```

### API Gateway (FastAPI)

**Responsibilities:**
- User authentication and authorization
- Session creation and management
- Consent recording and verification
- Report generation API
- Webhook management

**Key Technologies:**
- FastAPI
- PostgreSQL
- JWT authentication
- Pydantic (data validation)

**API Endpoints:**
```
POST /auth/login
POST /sessions/create
POST /sessions/{id}/consent
GET  /sessions/{id}/events
GET  /sessions/{id}/report
POST /webhooks/register
```

### PostgreSQL Database

**Schema:**

```sql
-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  candidate_id UUID,
  interviewer_id UUID,
  consent_token TEXT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  status VARCHAR(20)
);

-- Events
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  timestamp TIMESTAMP,
  frame_id VARCHAR(50),
  event_type VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anomalies
CREATE TABLE anomalies (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  detected_at TIMESTAMP,
  anomaly_type VARCHAR(50),
  severity VARCHAR(20),
  confidence FLOAT,
  metadata JSONB,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_notes TEXT
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  generated_at TIMESTAMP,
  vlm_summary TEXT,
  metrics JSONB,
  file_path TEXT
);
```

## Data Flow

### Real-time Interview Flow

1. **Session Start**
   - Interviewer creates session via API Gateway
   - Candidate joins and provides consent
   - Web client establishes WebSocket connection
   - Realtime engine initializes session state

2. **During Interview**
   - Web client captures and processes A/V at 10 FPS
   - Events batched every 100ms and sent via WebSocket
   - Realtime engine aggregates metrics in sliding windows
   - Anomalies detected and flagged in real-time
   - Dashboard updates via WebSocket push

3. **Session End**
   - Web client sends end-session event
   - Realtime engine finalizes metrics
   - Events persisted to database
   - Post-processing job queued for VLM service

4. **Report Generation**
   - VLM service fetches events and sample frames
   - Generates natural language descriptions
   - Creates HTML/PDF report
   - Report stored and notification sent

### Demo Mode Flow

1. **Demo Start**
   - Demo runner loads pre-recorded events
   - Simulates WebSocket connection
   - Replays events at configurable speed

2. **Playback**
   - Events sent to realtime engine
   - Metrics computed in real-time
   - Dashboard displays as if live

3. **Demo End**
   - Report generated automatically
   - Demo can loop or stop

## Security & Privacy

### Data Protection
- **Encryption at rest**: AES-256 for stored events
- **Encryption in transit**: TLS 1.3 for all connections
- **Access control**: JWT-based authentication, RBAC

### Privacy Controls
- **Local-only mode**: All processing in web client, no backend
- **Frame retention**: Optional, configurable TTL (default: 24h)
- **Event anonymization**: Remove PII from events
- **Consent management**: Explicit opt-in required

### Audit Trail
- All actions logged with timestamps
- Immutable audit log for compliance
- DSAR export tools for GDPR compliance

## Deployment

### Development
```bash
docker-compose up -d
npm run dev
```

### Production
- Kubernetes manifests in `infra/k8s/`
- Helm charts for easy deployment
- Auto-scaling for realtime engine and VLM service
- Managed PostgreSQL (RDS, CloudSQL, etc.)
- CDN for web client static assets

### Executable Distribution
```bash
npm run build:exe
```
Creates standalone package with Docker Compose

## Performance Considerations

### Latency Targets
- Client inference: <50ms per frame
- WebSocket round-trip: <100ms
- Anomaly detection: <200ms
- Dashboard update: <500ms

### Throughput
- 10 events/second per session
- Support 100+ concurrent sessions
- VLM processing: 1-2 minutes per session (post-processing)

### Resource Requirements
- Web client: Modern browser, 2GB RAM
- Realtime engine: 2 vCPU, 4GB RAM per 50 sessions
- CV inference: 4 vCPU, 8GB RAM, optional GPU
- VLM service: 8 vCPU, 16GB RAM, recommended GPU (8GB+ VRAM)

## Monitoring & Observability

### Metrics
- Event ingestion rate
- Anomaly detection latency
- WebSocket connection count
- Model inference time
- VLM generation time

### Logging
- Structured JSON logs
- Correlation IDs across services
- Log levels: DEBUG, INFO, WARN, ERROR

### Alerting
- Connection failures
- High anomaly rates (potential model drift)
- Service health checks
- Database query performance

## Extensibility

### Adding New Detections
1. Update event schema in `realtime-engine/schemas/event.schema.json`
2. Add inference code in web client or CV service
3. Update anomaly rules in `realtime-engine/config/rules.json`
4. Add VLM prompt template in `vlm-service/prompts/`

### Custom VLM Models
- Swap models in `vlm-service/config.py`
- Supported: LLaVA, Qwen-VL, BLIP, InstructBLIP
- API contract remains the same

### Integrations
- Webhook events for external systems
- REST API for programmatic access
- SDKs available (JS, Python)

## Next Steps

- [Privacy & Ethics Guide](./privacy.md)
- [API Reference](./api.md)
- [Deployment Guide](./deployment.md)
- [Demo Mode Guide](./demo-mode.md)
