/**
 * InferenceEngine.ts
 * 
 * Coordinates all local CV and audio inference:
 * - Face detection (MediaPipe)
 * - Head-pose estimation
 * - Gaze estimation
 * - Object detection (phone, paper, etc.)
 * - Audio VAD and speaker detection
 */

import * as tf from '@tensorflow/tfjs';
import { FaceDetection } from '@mediapipe/face_detection';
import { FaceMesh } from '@mediapipe/face_mesh';

export interface InferenceResult {
  timestamp: string;
  frame_id: string;
  face_bbox: number[] | null;
  tracking_id: string | null;
  head_pose: {
    yaw: number;
    pitch: number;
    roll: number;
  } | null;
  gaze_vector: number[] | null;
  gaze_on_screen: boolean;
  objects: Array<{
    label: string;
    confidence: number;
    bbox: number[];
  }>;
  audio_vad: boolean;
  audio_volume: number;
  multi_person: boolean;
  face_present: boolean;
}

export class InferenceEngine {
  private faceDetection: any;
  private faceMesh: any;
  private gazeModel: tf.LayersModel | null = null;
  private objectModel: tf.GraphModel | null = null;
  
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioDataArray: Uint8Array | null = null;
  
  private frameCounter = 0;
  private trackingId: string | null = null;
  private lastFaceTime: number = Date.now();
  
  private initialized = false;

  constructor() {}

  async initialize(): Promise<void> {
    console.log('Initializing InferenceEngine...');
    
    // Initialize TensorFlow.js
    await tf.ready();
    await tf.setBackend('webgl');
    
    // Initialize MediaPipe Face Detection
    this.faceDetection = new FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      }
    });
    
    await this.faceDetection.setOptions({
      model: 'short',
      minDetectionConfidence: 0.5
    });
    
    // Initialize MediaPipe Face Mesh for landmarks (needed for head-pose & gaze)
    this.faceMesh = new FaceMesh({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });
    
    await this.faceMesh.setOptions({
      maxNumFaces: 3,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    // Load gaze estimation model (simplified - in production use WebGazer.js or custom model)
    this.gazeModel = await this.loadGazeModel();
    
    // Load object detection model (lightweight MobileNet SSD)
    this.objectModel = await this.loadObjectDetectionModel();
    
    this.initialized = true;
    console.log('✓ InferenceEngine initialized');
  }

  async processFrame(
    videoElement: HTMLVideoElement,
    audioStream?: MediaStream
  ): Promise<InferenceResult> {
    if (!this.initialized) {
      throw new Error('InferenceEngine not initialized');
    }

    const frameId = `f-${String(this.frameCounter++).padStart(6, '0')}`;
    const timestamp = new Date().toISOString();

    // Run face detection
    const faceResults = await this.detectFaces(videoElement);
    
    // Run object detection
    const objectResults = await this.detectObjects(videoElement);
    
    // Process audio
    const audioResults = this.processAudio();

    // Build result
    const result: InferenceResult = {
      timestamp,
      frame_id: frameId,
      face_bbox: faceResults.bbox,
      tracking_id: this.trackingId,
      head_pose: faceResults.headPose,
      gaze_vector: faceResults.gazeVector,
      gaze_on_screen: faceResults.gazeOnScreen,
      objects: objectResults,
      audio_vad: audioResults.vad,
      audio_volume: audioResults.volume,
      multi_person: faceResults.faceCount > 1,
      face_present: faceResults.faceCount > 0
    };

    return result;
  }

  private async detectFaces(videoElement: HTMLVideoElement): Promise<{
    bbox: number[] | null;
    faceCount: number;
    headPose: { yaw: number; pitch: number; roll: number } | null;
    gazeVector: number[] | null;
    gazeOnScreen: boolean;
  }> {
    return new Promise((resolve) => {
      this.faceMesh.onResults((results: any) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
          // No face detected - check timeout
          if (Date.now() - this.lastFaceTime > 2000) {
            this.trackingId = null;
          }
          
          resolve({
            bbox: null,
            faceCount: 0,
            headPose: null,
            gazeVector: null,
            gazeOnScreen: false
          });
          return;
        }

        this.lastFaceTime = Date.now();
        
        const landmarks = results.multiFaceLandmarks[0];
        const faceCount = results.multiFaceLandmarks.length;
        
        // Generate/maintain tracking ID
        if (!this.trackingId) {
          this.trackingId = `track-${Date.now()}`;
        }
        
        // Compute bounding box from landmarks
        const bbox = this.computeBoundingBox(landmarks, videoElement.videoWidth, videoElement.videoHeight);
        
        // Estimate head pose from facial landmarks
        const headPose = this.estimateHeadPose(landmarks);
        
        // Estimate gaze direction
        const gazeVector = this.estimateGaze(landmarks, headPose);
        const gazeOnScreen = this.isGazeOnScreen(gazeVector, headPose);
        
        resolve({
          bbox,
          faceCount,
          headPose,
          gazeVector,
          gazeOnScreen
        });
      });

      this.faceMesh.send({ image: videoElement });
    });
  }

  private async detectObjects(videoElement: HTMLVideoElement): Promise<Array<{
    label: string;
    confidence: number;
    bbox: number[];
  }>> {
    // Simplified object detection - in production use YOLOv8 or MobileNet SSD
    // Looking for: phone, paper, second monitor, headphones, hands
    
    const objects: Array<{ label: string; confidence: number; bbox: number[] }> = [];
    
    if (!this.objectModel) return objects;

    try {
      // Convert video frame to tensor
      const tensor = tf.browser.fromPixels(videoElement);
      const resized = tf.image.resizeBilinear(tensor, [300, 300]);
      const normalized = resized.div(255.0).expandDims(0);
      
      // Run inference
      const predictions = await this.objectModel.executeAsync(normalized) as tf.Tensor[];
      
      const boxes = await predictions[0].array();
      const scores = await predictions[1].array();
      const classes = await predictions[2].array();
      
      // Filter for relevant objects
      const relevantClasses = {
        67: 'phone',      // cell phone
        73: 'book',       // book/paper
        62: 'monitor',    // TV/monitor
        77: 'cell phone', // alternate
      };
      
      for (let i = 0; i < scores[0].length; i++) {
        const score = scores[0][i];
        const classId = classes[0][i];
        
        if (score > 0.5 && relevantClasses[classId as keyof typeof relevantClasses]) {
          const box = boxes[0][i];
          objects.push({
            label: relevantClasses[classId as keyof typeof relevantClasses],
            confidence: score,
            bbox: box
          });
        }
      }
      
      tensor.dispose();
      resized.dispose();
      normalized.dispose();
      predictions.forEach(p => p.dispose());
      
    } catch (error) {
      console.error('Object detection error:', error);
    }

    return objects;
  }

  private processAudio(): { vad: boolean; volume: number } {
    if (!this.analyser || !this.audioDataArray) {
      return { vad: false, volume: 0 };
    }

    this.analyser.getByteTimeDomainData(this.audioDataArray);
    
    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < this.audioDataArray.length; i++) {
      const normalized = (this.audioDataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.audioDataArray.length);
    const volume = rms;
    
    // Simple VAD: if volume > threshold, voice detected
    const vad = volume > 0.02;
    
    return { vad, volume };
  }

  setupAudioAnalysis(audioStream: MediaStream): void {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(audioStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    source.connect(this.analyser);
    
    this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  private computeBoundingBox(landmarks: any[], width: number, height: number): number[] {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    landmarks.forEach((landmark: any) => {
      const x = landmark.x * width;
      const y = landmark.y * height;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    
    return [minX, minY, maxX - minX, maxY - minY];
  }

  private estimateHeadPose(landmarks: any[]): { yaw: number; pitch: number; roll: number } {
    // Simplified head-pose estimation using key landmarks
    // In production, use PnP algorithm with camera intrinsics
    
    // Key points: nose tip, chin, left eye, right eye, left mouth, right mouth
    const noseTip = landmarks[1];
    const chin = landmarks[152];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    
    // Yaw (left-right rotation): based on eye position relative to nose
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const yaw = (noseTip.x - eyeMidX) * 90; // Approximate
    
    // Pitch (up-down rotation): based on nose-chin distance
    const pitch = (noseTip.y - chin.y) * 90;
    
    // Roll (tilt): based on eye alignment
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
    
    return { yaw, pitch, roll };
  }

  private estimateGaze(landmarks: any[], headPose: { yaw: number; pitch: number; roll: number }): number[] {
    // Simplified gaze estimation
    // In production, use iris landmarks and proper gaze model
    
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseTip = landmarks[1];
    
    // Estimate gaze direction based on eye position and head pose
    const gazeX = (leftEye.x + rightEye.x) / 2 - noseTip.x + headPose.yaw / 90;
    const gazeY = (leftEye.y + rightEye.y) / 2 - noseTip.y + headPose.pitch / 90;
    
    return [gazeX, gazeY];
  }

  private isGazeOnScreen(gazeVector: number[], headPose: { yaw: number; pitch: number; roll: number }): boolean {
    // Determine if gaze is on screen
    // Consider both gaze vector and head pose
    
    const [gazeX, gazeY] = gazeVector;
    const { yaw, pitch } = headPose;
    
    // Simple thresholds
    const onScreenX = Math.abs(gazeX) < 0.3 && Math.abs(yaw) < 30;
    const onScreenY = Math.abs(gazeY) < 0.3 && Math.abs(pitch) < 25;
    
    return onScreenX && onScreenY;
  }

  private async loadGazeModel(): Promise<tf.LayersModel | null> {
    // Placeholder - in production load actual gaze estimation model
    // Could use WebGazer.js or custom trained model
    return null;
  }

  private async loadObjectDetectionModel(): Promise<tf.GraphModel | null> {
    try {
      // Load MobileNet SSD from TensorFlow Hub
      const model = await tf.loadGraphModel(
        'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1',
        { fromTFHub: true }
      );
      return model;
    } catch (error) {
      console.warn('Could not load object detection model:', error);
      return null;
    }
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    if (this.gazeModel) {
      this.gazeModel.dispose();
    }
    
    if (this.objectModel) {
      this.objectModel.dispose();
    }
  }
}
