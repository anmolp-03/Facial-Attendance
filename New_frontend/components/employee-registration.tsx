"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Camera } from "lucide-react"
import FaceScanner from "./face-scanner"

interface EmployeeRegistrationProps {
  onSuccess: () => void
}

export default function EmployeeRegistration({ onSuccess }: EmployeeRegistrationProps) {
  const [step, setStep] = useState<"info" | "face">("info")
  const [employeeData, setEmployeeData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    position: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      })

      const data = await response.json()

      if (response.ok) {
        setStep("face")
        setSuccess("Employee registered! Now capture their face for recognition.")
      } else {
        setError(data.message || "Registration failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFaceUpload = async (imageData: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) {
        setError("Admin token not found. Please log in again.");
        setIsLoading(false);
        return;
      }
      // Upload face to Node.js backend (update existing user)
      const response = await fetch("http://localhost:5000/api/auth/add-face-to-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: employeeData.email,
          faceImage: imageData,
        }),
      })

      const result = await response.json()

      if (response.ok && result.faceImageUrl) {
        setSuccess("Employee face registered successfully!")
        setTimeout(() => {
          onSuccess()
          // Reset form
          setEmployeeData({
            name: "",
            email: "",
            password: "",
            department: "",
            position: "",
          })
          setStep("info")
          setSuccess(null)
        }, 2000)
      } else {
        setError(result.message || "Face registration failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5" />
          <span>Register New Employee</span>
        </CardTitle>
        <CardDescription>Add a new employee to the system with face recognition setup</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" disabled={step === "face"}>
              Employee Info
            </TabsTrigger>
            <TabsTrigger value="face" disabled={step === "info"}>
              Face Registration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={employeeData.name}
                    onChange={(e) => setEmployeeData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={employeeData.email}
                    onChange={(e) => setEmployeeData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={employeeData.password}
                  onChange={(e) => setEmployeeData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={employeeData.department}
                    onChange={(e) => setEmployeeData((prev) => ({ ...prev, department: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={employeeData.position}
                    onChange={(e) => setEmployeeData((prev) => ({ ...prev, position: e.target.value }))}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Registering..." : "Register Employee"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="face" className="space-y-4">
            <div className="text-center mb-4">
              <Camera className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <h3 className="text-lg font-medium">Face Registration</h3>
              <p className="text-sm text-gray-600">Capture {employeeData.name}'s face for recognition system</p>
            </div>

            <FaceScanner onScanComplete={handleFaceUpload} isScanning={isLoading} />

            <Button onClick={() => setStep("info")} variant="outline" className="w-full" disabled={isLoading}>
              Back to Employee Info
            </Button>
          </TabsContent>
        </Tabs>

        {/* Messages */}
        {error && (
          <Alert className="border-red-500 bg-red-50 mt-4">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 mt-4">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
