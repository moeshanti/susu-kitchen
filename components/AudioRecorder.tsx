import React, { useState, useRef } from 'react';
import { Button } from './Button';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-8 bg-stone-900/50 rounded-xl border border-stone-800">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-stone-800'}`}>
        {isRecording ? (
             <div className="w-8 h-8 bg-red-500 rounded-sm"></div>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
        )}
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-medium text-stone-200">
            {isRecording ? "Listening to Mama..." : "Tell us your recipe"}
        </h3>
        <p className="text-sm text-stone-500 mt-1">
            {isRecording ? "Describe ingredients and steps naturally." : "Click to start recording."}
        </p>
      </div>

      {!isRecording ? (
        <Button onClick={startRecording} variant="gold" disabled={isProcessing}>
          Start Recording
        </Button>
      ) : (
        <Button onClick={stopRecording} variant="danger">
          Stop & Generate
        </Button>
      )}
    </div>
  );
};