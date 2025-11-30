import React, { useRef, useState, useEffect } from 'react';
import { Button } from './Button';

interface WebcamCaptureProps {
  onCapture: (imageBase64: string) => void;
  onRetake?: () => void;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onRetake }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
    if (onRetake) onRetake();
  };

  if (error) {
    return <div className="p-4 bg-red-900/50 text-red-200 rounded-xl text-center">{error}</div>;
  }

  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden border border-stone-800 shadow-2xl aspect-video group">
      {capturedImage ? (
        <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
      ) : (
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        />
      )}
      
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
        {!capturedImage ? (
           <button 
             onClick={handleCapture}
             className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-red-600 hover:bg-red-500 transition-colors shadow-lg"
             aria-label="Take Photo"
           >
             <div className="w-14 h-14 rounded-full border-2 border-transparent"></div>
           </button>
        ) : (
           <Button onClick={handleRetake} variant="secondary">Retake Photo</Button>
        )}
      </div>
    </div>
  );
};