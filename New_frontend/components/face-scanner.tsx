"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FaceScannerProps {
  onScanComplete: (imageData: string) => void
  isScanning: boolean
  disabled?: boolean
}

export default function FaceScanner({ onScanComplete, isScanning, disabled }: FaceScannerProps) {
  console.log("FaceScanner render: isScanning=", isScanning, "disabled=", disabled);
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Cleanup function to stop camera
  const stopCamera = useCallback(() => {
    console.log("stopCamera called");
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
        console.log("Stopped track:", track.kind)
      })
      setStream(null)
      console.log("Stream set to null");
    }
    setIsCameraActive(false)
    setIsLoading(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
      console.log("videoRef.current.srcObject set to null");
    }
  }, [stream])

  // Set video stream and handlers to video element when stream changes
  useEffect(() => {
    console.log("useEffect [stream]: stream=", stream, "videoRef.current=", videoRef.current);
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      console.log("useEffect: videoRef.current.srcObject set:", videoRef.current.srcObject);

      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded");
        videoRef.current?.play()
          .then(() => {
            console.log("Video playing");
            setIsCameraActive(true);
            setIsLoading(false);
          })
          .catch((playError) => {
            console.error("Error playing video:", playError);
            setError("Failed to start video playback");
            setIsLoading(false);
          });
      };

      videoRef.current.onerror = (videoError) => {
        console.error("Video error:", videoError);
        setError("Video playback error");
        setIsLoading(false);
      };

      // Fallback: set isCameraActive after 2 seconds if not already set
      const timer = setTimeout(() => {
        if (!isCameraActive) {
          console.log("Fallback: Forcing isCameraActive to true after timeout");
          setIsCameraActive(true);
          setIsLoading(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [stream, isCameraActive]);

  // Start camera function
  const startCamera = useCallback(async () => {
    console.log("startCamera called, disabled=", disabled);
    if (disabled) {
      setError("Camera disabled - you must be within office premises")
      console.log("Camera is disabled by geofence");
      return
    }

    setIsLoading(true)
    setError(null)
    console.log("Requesting camera access...")

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      })

      console.log("Camera access granted:", mediaStream)

      setStream(mediaStream)
      console.log("setStream called with:", mediaStream);
    } catch (err) {
      console.error("Camera error:", err)
      let errorMessage = "Failed to access camera. "

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage += "Please allow camera permissions and try again."
        } else if (err.name === "NotFoundError") {
          errorMessage += "No camera found on this device."
        } else if (err.name === "NotReadableError") {
          errorMessage += "Camera is already in use by another application."
        } else {
          errorMessage += err.message
        }
      } else {
        errorMessage += "Please check camera permissions."
      }

      setError(errorMessage)
      setIsLoading(false)
    }
  }, [disabled])

  // Capture image function
  const captureImage = useCallback(() => {
    console.log("captureImage called, isCameraActive=", isCameraActive);
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      setError("Camera not ready. Please try again.")
      console.log("captureImage failed: videoRef.current=", videoRef.current, "canvasRef.current=", canvasRef.current, "isCameraActive=", isCameraActive);
      return
    }

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        setError("Canvas not supported")
        console.log("Canvas context not supported");
        return
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      console.log("Capturing image:", canvas.width, "x", canvas.height)

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1]

      if (!imageData) {
        setError("Failed to capture image")
        console.log("Failed to capture image: imageData is empty");
        return
      }

      console.log("Image captured successfully")

      // Stop camera after capture
      stopCamera()

      // Send to parent component
      onScanComplete(imageData)
    } catch (captureError) {
      console.error("Capture error:", captureError)
      setError("Failed to capture image. Please try again.")
    }
  }, [isCameraActive, onScanComplete, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("Cleanup: stopped track", track.kind);
        });
      }
    }
  }, [stream])

  return (
    <div className="space-y-4">
      {/* Camera Preview */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video max-w-md mx-auto border-2 border-gray-200">
        {/* Always render video for debugging */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          onLoadedData={() => console.log("video element onLoadedData event fired")}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-500 rounded-full opacity-50"></div>
        </div>
        {/* Show overlay if not active or loading */}
        {!isCameraActive && !isLoading && (
          <div className="w-full h-full flex items-center justify-center absolute inset-0 bg-white bg-opacity-80">
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Camera Preview</p>
            </div>
          </div>
        )}
        {/* Show loading spinner */}
        {isLoading && (
          <div className="w-full h-full flex items-center justify-center absolute inset-0 bg-white bg-opacity-80">
            <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-2 animate-spin" />
            <p className="text-gray-500 ml-2">Starting camera...</p>
          </div>
        )}
        {/* Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Scanning face...</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Canvas for Image Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Status */}
      {isCameraActive && (
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Camera Active
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        {!isCameraActive && !isLoading ? (
          <Button onClick={startCamera} disabled={disabled || isScanning} className="flex items-center space-x-2">
            <Camera className="h-4 w-4" />
            <span>Start Camera</span>
          </Button>
        ) : isCameraActive ? (
          <>
            <Button
              onClick={captureImage}
              disabled={isScanning}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  <span>Scan Face</span>
                </>
              )}
            </Button>
            <Button
              onClick={stopCamera}
              variant="outline"
              disabled={isScanning}
              className="flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          </>
        ) : (
          <Button disabled className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Starting...</span>
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Alert className="border-red-500 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      {isCameraActive && (
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <h4 className="font-medium text-blue-900 mb-2">Ready to Scan!</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Position your face within the circle</li>
            <li>• Look directly at the camera</li>
            <li>• Ensure good lighting</li>
            <li>• Click "Scan Face" when ready</li>
          </ul>
        </div>
      )}
    </div>
  )
}

