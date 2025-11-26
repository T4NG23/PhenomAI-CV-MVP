import React, { useState, useRef, useEffect } from 'react';
import { InferenceEngine, InferenceResult } from './services/InferenceEngine';
import { EventStreamer } from './services/EventStreamer';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [stats, setStats] = useState({
    framesProcessed: 0,
    eventsStreamed: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inferenceEngineRef = useRef<InferenceEngine | null>(null);
  const eventStreamerRef = useRef<EventStreamer | null>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for anomalies from WebSocket
    const handleAnomaly = (event: any) => {
      setAnomalies(prev => [...prev, ...event.detail]);
    };

    const handleScore = (event: any) => {
      setCurrentScore(event.detail.score);
    };

    window.addEventListener('anomaly', handleAnomaly as EventListener);
    window.addEventListener('anomaly_score', handleScore as EventListener);

    return () => {
      window.removeEventListener('anomaly', handleAnomaly as EventListener);
      window.removeEventListener('anomaly_score', handleScore as EventListener);
    };
  }, []);

  const handleConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = e.target as HTMLFormElement;
    const candidateName = (form.elements.namedItem('candidateName') as HTMLInputElement).value;
    const candidateEmail = (form.elements.namedItem('candidateEmail') as HTMLInputElement).value;

    try {
      // Create session
      const sessionResponse = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateName,
          candidate_email: candidateEmail,
        }),
      });

      const sessionData = await sessionResponse.json();
      const newSessionId = sessionData.session_id;

      // Record consent
      await fetch(`${API_URL}/sessions/${newSessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: newSessionId,
          consent_given: true,
          consent_text: CONSENT_TEXT,
          consent_version: '1.0',
          candidate_name: candidateName,
          candidate_email: candidateEmail,
        }),
      });

      setSessionId(newSessionId);
      setConsentGiven(true);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
    }
  };

  const startInterview = async () => {
    if (!sessionId) return;

    try {
      // Get camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize inference engine
      inferenceEngineRef.current = new InferenceEngine();
      await inferenceEngineRef.current.initialize();
      inferenceEngineRef.current.setupAudioAnalysis(stream);

      // Initialize event streamer
      eventStreamerRef.current = new EventStreamer({
        serverUrl: WS_URL,
        sessionId: sessionId,
      });
      await eventStreamerRef.current.connect();

      setIsRecording(true);

      // Start processing frames
      processingIntervalRef.current = setInterval(async () => {
        if (videoRef.current && inferenceEngineRef.current && eventStreamerRef.current) {
          const result = await inferenceEngineRef.current.processFrame(videoRef.current);
          
          // Draw overlays
          drawOverlays(result);
          
          // Stream to backend
          eventStreamerRef.current.queueEvent(result);
          
          setStats(prev => ({
            framesProcessed: prev.framesProcessed + 1,
            eventsStreamed: prev.eventsStreamed + 1,
          }));
        }
      }, 100); // 10 FPS

    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  };

  const stopInterview = () => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }

    if (eventStreamerRef.current) {
      eventStreamerRef.current.disconnect();
    }

    if (inferenceEngineRef.current) {
      inferenceEngineRef.current.dispose();
    }

    setIsRecording(false);
  };

  const drawOverlays = (result: InferenceResult) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw face bounding box
    if (result.face_bbox) {
      const [x, y, w, h] = result.face_bbox;
      ctx.strokeStyle = result.gaze_on_screen ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
    }

    // Draw object detections
    result.objects.forEach(obj => {
      const [x1, y1, x2, y2] = obj.bbox;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = '#ffff00';
      ctx.font = '16px Arial';
      ctx.fillText(`${obj.label} (${(obj.confidence * 100).toFixed(0)}%)`, x1, y1 - 5);
    });

    // Draw gaze indicator
    if (!result.gaze_on_screen) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('⚠️ OFF-SCREEN', 20, 35);
    }
  };

  if (!consentGiven) {
    return (
      <div className="consent-container">
        <h1>Interview Integrity Monitoring</h1>
        <div className="consent-box">
          <h2>Candidate Consent Required</h2>
          <div className="consent-text">
            <p><strong>What we monitor:</strong></p>
            <ul>
              <li>Face position and head pose (yaw, pitch, roll)</li>
              <li>Gaze direction (on-screen vs off-screen)</li>
              <li>Visible objects (phone, paper, books, other people)</li>
              <li>Audio activity (voice detection, not content)</li>
            </ul>
            <p><strong>What we DO NOT do:</strong></p>
            <ul>
              <li>Record or analyze the content of what you say</li>
              <li>Read text from screens or papers (no OCR)</li>
              <li>Make judgments about your intent or truthfulness</li>
              <li>Store raw video permanently (deleted after report generation)</li>
            </ul>
            <p><strong>Your rights:</strong></p>
            <ul>
              <li>All data is encrypted and access-controlled</li>
              <li>You can request to see your data at any time</li>
              <li>You can opt out and use an alternative evaluation method</li>
              <li>Data is deleted within 30 days unless required for compliance</li>
            </ul>
            <p><strong>Accommodations:</strong> If you have a disability affecting gaze, posture, or behavior, please indicate below and a human reviewer will be assigned.</p>
          </div>
          
          <form onSubmit={handleConsentSubmit}>
            <input type="text" name="candidateName" placeholder="Your Name" required />
            <input type="email" name="candidateEmail" placeholder="Your Email" required />
            
            <label>
              <input type="checkbox" required />
              I have read and understood the monitoring disclosure
            </label>
            
            <label>
              <input type="checkbox" required />
              I consent to this interview being monitored as described
            </label>
            
            <label>
              <input type="checkbox" />
              I am requesting accommodations (will escalate to human reviewer)
            </label>
            
            <button type="submit">Start Interview</button>
            <button type="button" onClick={() => alert('Alternative evaluation: Contact recruiter@example.com')}>
              Opt Out (Use Alternative Method)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>Interview Integrity Monitor</h1>
        <div className="session-info">
          <span>Session: {sessionId?.substring(0, 8)}</span>
          <span className={`status ${isRecording ? 'recording' : 'stopped'}`}>
            {isRecording ? '🔴 Recording' : '⚫ Stopped'}
          </span>
        </div>
      </header>

      <div className="main-content">
        <div className="video-section">
          <div className="video-container">
            <video ref={videoRef} autoPlay muted />
            <canvas ref={canvasRef} className="overlay-canvas" />
          </div>
          
          <div className="controls">
            {!isRecording ? (
              <button onClick={startInterview} className="btn-start">
                Start Interview
              </button>
            ) : (
              <button onClick={stopInterview} className="btn-stop">
                End Interview
              </button>
            )}
          </div>
        </div>

        <div className="sidebar">
          <div className="stats-panel">
            <h3>Session Statistics</h3>
            <div className="stat">
              <span>Frames Processed:</span>
              <span>{stats.framesProcessed}</span>
            </div>
            <div className="stat">
              <span>Events Streamed:</span>
              <span>{stats.eventsStreamed}</span>
            </div>
            <div className="stat">
              <span>Anomaly Score:</span>
              <span className={`score ${currentScore > 0.7 ? 'high' : currentScore > 0.4 ? 'medium' : 'low'}`}>
                {(currentScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="anomalies-panel">
            <h3>Detected Flags ({anomalies.length})</h3>
            <div className="anomalies-list">
              {anomalies.length === 0 ? (
                <p className="no-anomalies">No anomalies detected</p>
              ) : (
                anomalies.map((anomaly, idx) => (
                  <div key={idx} className={`anomaly anomaly-${anomaly.severity}`}>
                    <div className="anomaly-header">
                      <span className="anomaly-type">{anomaly.anomaly_type}</span>
                      <span className="anomaly-severity">{anomaly.severity}</span>
                    </div>
                    <p className="anomaly-description">{anomaly.description}</p>
                    <span className="anomaly-time">{new Date(anomaly.detected_at).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CONSENT_TEXT = `I consent to having my interview monitored by an AI system that detects observable behaviors including face position, gaze direction, visible objects, and audio activity. I understand this is for interview integrity purposes only and that all detections require human review. I understand my rights and data handling policies as described above.`;

export default App;
