// src/components/VoiceRecorder.ts
// Voice Recording Interface for Sentari Pipeline
// Integrates with existing transcript processing system

// Type declarations for browser APIs
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface VoiceRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  audioBlob: Blob | null;
  transcript: string;
  error: string | null;
  recordingDuration: number;
}

export interface VoiceRecorderCallbacks {
  onTranscriptReady: (transcript: string) => void;
  onRecordingStateChange: (state: VoiceRecorderState) => void;
  onError: (error: string) => void;
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recognition: SpeechRecognition | null = null;
  private recordingStartTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  
  private state: VoiceRecorderState = {
    isRecording: false,
    isProcessing: false,
    audioBlob: null,
    transcript: '',
    error: null,
    recordingDuration: 0
  };
  
  private callbacks: VoiceRecorderCallbacks;
  
  constructor(callbacks: VoiceRecorderCallbacks) {
    this.callbacks = callbacks;
    this.setupSpeechRecognition();
  }
  
  /**
   * Initialize speech recognition for real-time transcription
   */
  private setupSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      if (this.recognition) {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          this.state.transcript = finalTranscript + interimTranscript;
          this.updateState();
        };
        
        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          this.state.error = `Speech recognition error: ${event.error}`;
          this.updateState();
          this.callbacks.onError(this.state.error);
        };
      }
    } else {
      this.state.error = 'Speech recognition not supported in this browser';
      this.updateState();
    }
  }
  
  /**
   * Start recording audio and speech recognition
   */
  async startRecording(): Promise<void> {
    try {
      this.state.error = null;
      this.audioChunks = [];
      this.state.transcript = '';
      this.state.recordingDuration = 0;
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Initialize MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.state.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.updateState();
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.state.isRecording = true;
      this.recordingStartTime = Date.now();
      
      // Start duration timer
      this.durationInterval = setInterval(() => {
        this.state.recordingDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.updateState();
      }, 1000);
      
      // Start speech recognition
      if (this.recognition) {
        this.recognition.start();
      }
      
      this.updateState();
      
    } catch (error) {
      this.state.error = `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`;
      this.updateState();
      this.callbacks.onError(this.state.error);
    }
  }
  
  /**
   * Stop recording and process the audio
   */
  stopRecording(): void {
    try {
      // Stop MediaRecorder
      if (this.mediaRecorder && this.state.isRecording) {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      
      // Stop speech recognition
      if (this.recognition) {
        this.recognition.stop();
      }
      
      // Stop duration timer
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }
      
      this.state.isRecording = false;
      this.state.isProcessing = true;
      this.updateState();
      
      // Process the transcript
      this.processTranscript();
      
    } catch (error) {
      this.state.error = `Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`;
      this.updateState();
      this.callbacks.onError(this.state.error);
    }
  }
  
  /**
   * Process the recorded transcript
   */
  private async processTranscript(): Promise<void> {
    try {
      // Use the transcript from speech recognition if available
      let finalTranscript = this.state.transcript;
      
      // If no transcript from speech recognition, try to process audio blob
      if (!finalTranscript && this.state.audioBlob) {
        finalTranscript = await this.processAudioBlob(this.state.audioBlob);
      }
      
      // Clean up the transcript
      finalTranscript = this.cleanTranscript(finalTranscript);
      
      if (finalTranscript.trim()) {
        this.callbacks.onTranscriptReady(finalTranscript);
      } else {
        this.state.error = 'No speech detected. Please try again.';
        this.callbacks.onError(this.state.error);
      }
      
    } catch (error) {
      this.state.error = `Failed to process transcript: ${error instanceof Error ? error.message : String(error)}`;
      this.callbacks.onError(this.state.error);
    } finally {
      this.state.isProcessing = false;
      this.updateState();
    }
  }
  
  /**
   * Process audio blob to text (fallback method)
   */
  private async processAudioBlob(blob: Blob): Promise<string> {
    // This is a fallback method - in a real implementation, you might use:
    // - Google Cloud Speech-to-Text API
    // - Azure Speech Services
    // - AWS Transcribe
    // - Or other speech-to-text services
    
    return new Promise((resolve) => {
      // For demo purposes, we'll return a placeholder
      // In production, you would send the blob to a speech-to-text service
      setTimeout(() => {
        resolve('Audio processing not implemented in demo mode. Please use text input or ensure speech recognition is working.');
      }, 1000);
    });
  }
  
  /**
   * Clean and format the transcript
   */
  private cleanTranscript(transcript: string): string {
    return transcript
      .trim()
      .replace(/\s+/g, ' ') // Remove extra whitespace
      .replace(/^\s+|\s+$/g, ''); // Trim start/end
  }
  
  /**
   * Update state and notify callbacks
   */
  private updateState(): void {
    this.callbacks.onRecordingStateChange({ ...this.state });
  }
  
  /**
   * Get current state
   */
  getState(): VoiceRecorderState {
    return { ...this.state };
  }
  
  /**
   * Check if voice recording is supported
   */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
           !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
  
  /**
   * Get supported audio formats
   */
  static getSupportedFormats(): string[] {
    const formats = [];
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      formats.push('audio/webm;codecs=opus');
    }
    if (MediaRecorder.isTypeSupported('audio/mp4')) {
      formats.push('audio/mp4');
    }
    if (MediaRecorder.isTypeSupported('audio/wav')) {
      formats.push('audio/wav');
    }
    return formats;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.recognition) {
      this.recognition.stop();
    }
    
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
  }
} 