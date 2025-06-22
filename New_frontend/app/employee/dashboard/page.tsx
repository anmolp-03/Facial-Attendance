"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, TrendingUp, Award, LogOut, User, BarChart3, DollarSign } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface AttendanceRecord {
  _id: string
  date: string
  checkIn: string
  checkOut?: string
  status: "present" | "absent" | "late"
  hoursWorked: number
}

interface AttendanceSummary {
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  averageHours: number
  attendanceRate: number
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    setUser(JSON.parse(userData))
    fetchAttendanceData(token)
  }, [router])

  const fetchAttendanceData = async (token: string) => {
    try {
      const [recordsResponse, summaryResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/my-records`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attendance/my-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json()
        setAttendanceRecords(recordsData.data || [])
      }

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setSummary(summaryData.data)
      }
    } catch (error) {
      console.error("Failed to fetch attendance data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  // Prepare chart data
  const chartData = attendanceRecords.slice(-7).map((record) => ({
    date: new Date(record.date).toLocaleDateString("en-US", { weekday: "short" }),
    hours: record.hoursWorked || 0,
    status: record.status,
  }))

  const monthlyData = [
    { month: "Jan", attendance: 95, hours: 168 },
    { month: "Feb", attendance: 92, hours: 160 },
    { month: "Mar", attendance: 98, hours: 176 },
    { month: "Apr", attendance: 90, hours: 158 },
    { month: "May", attendance: 96, hours: 172 },
    { month: "Jun", attendance: 94, hours: 165 },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Employee Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{summary?.attendanceRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Hours/Day</p>
                  <p className="text-2xl font-bold text-gray-900">{summary?.averageHours?.toFixed(1) || 0}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Present Days</p>
                  <p className="text-2xl font-bold text-gray-900">{summary?.presentDays || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Award className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Late Days</p>
                  <p className="text-2xl font-bold text-gray-900">{summary?.lateDays || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="attendance">Attendance History</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Info</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Hours Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Hours Trend</CardTitle>
                  <CardDescription>Your daily working hours for the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      hours: {
                        label: "Hours Worked",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="hours"
                          stroke="var(--color-hours)"
                          strokeWidth={2}
                          dot={{ fill: "var(--color-hours)" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Monthly Attendance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                  <CardDescription>Attendance rate and hours worked by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      attendance: {
                        label: "Attendance %",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="attendance" fill="var(--color-attendance)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance Records</CardTitle>
                <CardDescription>Your attendance history for the current month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.slice(0, 10).map((record) => (
                      <div key={record._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-sm font-medium">
                              {new Date(record.date).toLocaleDateString("en-US", { weekday: "short" })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">Check-in: {record.checkIn}</div>
                            {record.checkOut && (
                              <div className="text-sm text-gray-600">Check-out: {record.checkOut}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-sm font-medium">{record.hoursWorked}h</div>
                            <div className="text-xs text-gray-500">worked</div>
                          </div>
                          <Badge
                            variant={
                              record.status === "present"
                                ? "default"
                                : record.status === "late"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {record.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">No attendance records found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Information</CardTitle>
                <CardDescription>Your salary calculation based on attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">$3,200</div>
                    <div className="text-sm text-gray-600">Base Salary</div>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-700">${(summary?.presentDays || 0) * 150}</div>
                    <div className="text-sm text-gray-600">Attendance Bonus</div>
                  </div>
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-700">
                      ${3200 + (summary?.presentDays || 0) * 150}
                    </div>
                    <div className="text-sm text-gray-600">Total Earnings</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
