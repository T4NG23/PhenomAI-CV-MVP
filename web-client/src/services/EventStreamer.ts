/**
 * EventStreamer.ts
 * 
 * Manages WebSocket connection to realtime-engine
 * Batches and streams inference events
 */

import { io, Socket } from 'socket.io-client';
import { InferenceResult } from './InferenceEngine';

export interface StreamConfig {
  serverUrl: string;
  sessionId: string;
  candidateId?: string;
  batchSize?: number;
  batchIntervalMs?: number;
}

export class EventStreamer {
  private socket: Socket | null = null;
  private eventQueue: InferenceResult[] = [];
  private config: StreamConfig;
  private batchTimer: NodeJS.Timeout | null = null;
  private connected = false;

  constructor(config: StreamConfig) {
    this.config = {
      batchSize: 10,
      batchIntervalMs: 100,
      ...config
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket'],
        auth: {
          sessionId: this.config.sessionId,
          candidateId: this.config.candidateId
        }
      });

      this.socket.on('connect', () => {
        console.log('✓ Connected to realtime-engine');
        this.connected = true;
        this.startBatchTimer();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('✗ Disconnected from realtime-engine');
        this.connected = false;
        this.stopBatchTimer();
      });

      this.socket.on('anomaly_detected', (anomaly) => {
        console.log('⚠️  Anomaly detected:', anomaly);
        // Emit event for UI to handle
        window.dispatchEvent(new CustomEvent('anomaly', { detail: anomaly }));
      });

      this.socket.on('baseline_computed', (baseline) => {
        console.log('📊 Baseline computed:', baseline);
        window.dispatchEvent(new CustomEvent('baseline', { detail: baseline }));
      });
    });
  }

  queueEvent(event: InferenceResult): void {
    this.eventQueue.push(event);

    // Flush if batch size reached
    if (this.eventQueue.length >= (this.config.batchSize || 10)) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.eventQueue.length === 0 || !this.socket || !this.connected) {
      return;
    }

    const batch = this.eventQueue.splice(0, this.eventQueue.length);
    
    this.socket.emit('event_batch', {
      session_id: this.config.sessionId,
      events: batch,
      timestamp: new Date().toISOString()
    });

    console.log(`📤 Sent batch of ${batch.length} events`);
  }

  private startBatchTimer(): void {
    this.batchTimer = setInterval(() => {
      this.flush();
    }, this.config.batchIntervalMs || 100);
  }

  private stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  disconnect(): void {
    this.stopBatchTimer();
    this.flush(); // Send remaining events
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}
