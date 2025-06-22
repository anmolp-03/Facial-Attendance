"use client"
import './globals.css'
import { useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import FaceScanner from "@/components/face-scanner"
import GeofenceChecker from "@/components/geofence-checker"

export default function HomePage() {
  const [scanResult, setScanResult] = useState<{
    success: boolean
    message: string
    name?: string
    employeeId?: string
  } | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null)

  const handleScanComplete = async (imageData: string) => {
    if (!isWithinGeofence) {
      setScanResult({
        success: false,
        message: "You must be within office premises to mark attendance.",
      })
      return
    }

    setIsScanning(true)
    try {
      // Send to Python Flask backend for face recognition
      const response = await fetch("http://localhost:8000/face-recognition/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      })

      const result = await response.json()
      setScanResult(result)

      // If face recognition successful, mark attendance in Node.js backend
      if (result.success && result.employeeId) {
        await fetch("http://localhost:5000/api/attendance/mark", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: result.employeeId,
            timestamp: new Date().toISOString(),
          }),
        })
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: "Network error. Please try again.",
      })
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <GeofenceChecker onLocationUpdate={setIsWithinGeofence} />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Camera className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">FaceAttend Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={isWithinGeofence ? "default" : "destructive"}>
                {isWithinGeofence === null
                  ? "Checking Location..."
                  : isWithinGeofence
                    ? "Within Office"
                    : "Outside Office"}
              </Badge>
              <Link href="/login">
                <Button variant="outline">Employee Login</Button>
              </Link>
              <Link href="/admin/login">
                <Button>Admin Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Employee Attendance System</h2>
          <p className="text-lg text-gray-600">Simply scan your face to mark attendance</p>
        </div>

        {/* Face Scanner Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Face Recognition Scanner</CardTitle>
            <CardDescription className="text-center">
              Position your face within the camera frame and click scan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FaceScanner onScanComplete={handleScanComplete} isScanning={isScanning} disabled={!isWithinGeofence} />

            {/* Scan Result */}
            {scanResult && (
              <Alert className={scanResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                <AlertDescription className="text-center">
                  <div className={`font-medium ${scanResult.success ? "text-green-800" : "text-red-800"}`}>
                    {scanResult.message}
                  </div>
                  {scanResult.success && scanResult.name && (
                    <div className="mt-2 text-lg font-bold text-green-800">Welcome, {scanResult.name}!</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Ensure you are within office premises</li>
                <li>• Look directly at the camera</li>
                <li>• Keep your face well-lit and visible</li>
                <li>• Click "Scan Face" when ready</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">99.8%</div>
              <div className="text-sm text-gray-600">Recognition Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">&lt;2s</div>
              <div className="text-sm text-gray-600">Average Scan Time</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">24/7</div>
              <div className="text-sm text-gray-600">System Availability</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
