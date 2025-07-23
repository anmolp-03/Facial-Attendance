"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Lock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [showReset, setShowReset] = useState(false);
  const [resetForm, setResetForm] = useState({ adminEmail: "", adminPassword: "", employeeEmail: "", newPassword: "" });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("token", data.token)
        localStorage.setItem("user", JSON.stringify(data.user))
        router.push("/employee/dashboard")
      } else {
        setError(data.message || "Login failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/admin-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetForm),
      });
      const data = await response.json();
      if (response.ok) {
        setResetSuccess("Password reset successfully.");
        setResetForm({ adminEmail: "", adminPassword: "", employeeEmail: "", newPassword: "" });
      } else {
        setResetError(data.message || "Reset failed");
      }
    } catch {
      setResetError("Network error. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Employee Login</CardTitle>
            <CardDescription>Access your attendance dashboard and analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={credentials.email}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              {error && (
                <Alert className="border-red-500 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Lock className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline focus:outline-none"
                  onClick={() => setShowReset(true)}
                >
                  Forgot Password?
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need admin access?{" "}
                <Link href="/admin/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Admin Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        {/* Forgot Password Modal */}
        <Dialog open={showReset} onOpenChange={setShowReset}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin Password Reset</DialogTitle>
              <DialogDescription>Admin can reset an employee's password here.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={resetForm.adminEmail}
                  onChange={e => setResetForm(f => ({ ...f, adminEmail: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="adminPassword">Admin Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={resetForm.adminPassword}
                  onChange={e => setResetForm(f => ({ ...f, adminPassword: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="employeeEmail">Employee Email</Label>
                <Input
                  id="employeeEmail"
                  type="email"
                  value={resetForm.employeeEmail}
                  onChange={e => setResetForm(f => ({ ...f, employeeEmail: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={resetForm.newPassword}
                  onChange={e => setResetForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                />
              </div>
              {resetError && <Alert className="border-red-500 bg-red-50"><AlertDescription className="text-red-800">{resetError}</AlertDescription></Alert>}
              {resetSuccess && <Alert className="border-green-500 bg-green-50"><AlertDescription className="text-green-800">{resetSuccess}</AlertDescription></Alert>}
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
