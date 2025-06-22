"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Edit, Trash2, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AttendanceRecord {
  _id: string
  userId: string
  userName: string
  date: string
  checkIn: string
  checkOut?: string
  status: "present" | "absent" | "late"
  hoursWorked: number
}

export default function AttendanceManagement() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [newRecord, setNewRecord] = useState({
    userId: "",
    date: "",
    checkIn: "",
    checkOut: "",
    status: "present" as "present" | "absent" | "late",
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchAttendanceRecords()
  }, [])

  const fetchAttendanceRecords = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch("http://localhost:5000/api/attendance/admin/summary", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
      }
    } catch (error) {
      console.error("Failed to fetch attendance records:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRecord = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch("http://localhost:5000/api/attendance/admin/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRecord),
      })

      if (response.ok) {
        setMessage({ type: "success", text: "Attendance record added successfully" })
        setShowAddForm(false)
        setNewRecord({
          userId: "",
          date: "",
          checkIn: "",
          checkOut: "",
          status: "present",
        })
        fetchAttendanceRecords()
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.message || "Failed to add record" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error" })
    }
  }

  const handleUpdateRecord = async () => {
    if (!editingRecord) return

    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`http://localhost:5000/api/attendance/admin/${editingRecord._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingRecord),
      })

      if (response.ok) {
        setMessage({ type: "success", text: "Attendance record updated successfully" })
        setEditingRecord(null)
        fetchAttendanceRecords()
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.message || "Failed to update record" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error" })
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) return

    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`http://localhost:5000/api/attendance/admin/${recordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setMessage({ type: "success", text: "Attendance record deleted successfully" })
        setRecords((prev) => prev.filter((record) => record._id !== recordId))
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.message || "Failed to delete record" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error" })
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading attendance records...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <p className="text-gray-600">Manage and monitor employee attendance records</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Record</span>
        </Button>
      </div>

      {/* Messages */}
      {message && (
        <Alert className={message.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          <AlertDescription className={message.type === "success" ? "text-green-800" : "text-red-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Add Record Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Attendance Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userId">Employee ID</Label>
                <Input
                  id="userId"
                  value={newRecord.userId}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, userId: e.target.value }))}
                  placeholder="Enter employee ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newRecord.date}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check In</Label>
                <Input
                  id="checkIn"
                  type="time"
                  value={newRecord.checkIn}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, checkIn: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check Out</Label>
                <Input
                  id="checkOut"
                  type="time"
                  value={newRecord.checkOut}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, checkOut: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={newRecord.status}
                  onChange={(e) => setNewRecord((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleAddRecord}>Add Record</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>Recent attendance entries for all employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {records.length > 0 ? (
              records.map((record) => (
                <div key={record._id} className="flex items-center justify-between p-4 border rounded-lg">
                  {editingRecord && editingRecord._id === record._id ? (
                    // Edit Mode
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <Label className="text-xs">Employee</Label>
                        <div className="font-medium">{record.userName}</div>
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={editingRecord.date.split("T")[0]}
                          onChange={(e) =>
                            setEditingRecord((prev) => (prev ? { ...prev, date: e.target.value } : null))
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Check In</Label>
                        <Input
                          type="time"
                          value={editingRecord.checkIn}
                          onChange={(e) =>
                            setEditingRecord((prev) => (prev ? { ...prev, checkIn: e.target.value } : null))
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Check Out</Label>
                        <Input
                          type="time"
                          value={editingRecord.checkOut || ""}
                          onChange={(e) =>
                            setEditingRecord((prev) => (prev ? { ...prev, checkOut: e.target.value } : null))
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <select
                          value={editingRecord.status}
                          onChange={(e) =>
                            setEditingRecord((prev) => (prev ? { ...prev, status: e.target.value as any } : null))
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm h-8"
                        >
                          <option value="present">Present</option>
                          <option value="late">Late</option>
                          <option value="absent">Absent</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{record.userName}</div>
                        <div className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {record.checkIn}
                        </div>
                        {record.checkOut && <div className="text-xs text-gray-500">Out: {record.checkOut}</div>}
                      </div>
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
                  )}

                  <div className="flex items-center space-x-2">
                    {editingRecord && editingRecord._id === record._id ? (
                      <>
                        <Button size="sm" onClick={handleUpdateRecord}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingRecord(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditingRecord(record)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRecord(record._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">No attendance records found</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
