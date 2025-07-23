"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Edit, Trash2, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface AttendanceRecord {
  _id: string
  userId: string
  userName: string
  date: string
  checkIn: string
  checkOut?: string
  status: "present" | "absent" | "late"
  hoursWorked: number
  checkInTime?: string
  checkOutTime?: string
}

interface Employee {
  _id: string
  name: string
  email: string
  department?: string
  position?: string
  createdAt: string
  role?: string
  faceEmbeddings?: any[]
  faceImageUrl?: string
  employeeId?: string
  leavingDate?: string
}

export default function AttendanceManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'employeeId'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'former'>('active');

  useEffect(() => {
    fetchEmployees()
  }, [search, sortBy, sortOrder, activeTab])

  useEffect(() => {
    if (selectedEmployee) {
      fetchAttendanceForEmployee(selectedEmployee._id)
    } else {
      setAttendanceRecords([])
    }
  }, [selectedEmployee])

  const fetchEmployees = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)
      const response = await fetch(`http://localhost:5000/api/auth/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        // Only show employees (not admins)
        const all = Array.isArray(data) ? data : data.users || []
        setEmployees(all.filter((emp: Employee) => emp.role !== 'admin'))
      }
    } catch (error) {
      setEmployees([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAttendanceForEmployee = async (employeeId: string) => {
    setAttendanceLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`http://localhost:5000/api/attendance/admin/user/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) {
        const data = await response.json()
        setAttendanceRecords(data)
      } else {
        setAttendanceRecords([])
      }
    } catch {
      setAttendanceRecords([])
    } finally {
      setAttendanceLoading(false)
    }
  }

  const getDurationString = (checkIn: string, checkOut: string) => {
    const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    if (isNaN(ms) || ms <= 0) return '--';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours} hr ${minutes} min`;
  };

  const getTotalDurationString = (records: AttendanceRecord[]) => {
    let totalMs = 0;
    records.forEach(r => {
      if (r.checkInTime && r.checkOutTime) {
        totalMs += new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime();
      }
    });
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    return `${hours} hr ${minutes} min`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Directory</CardTitle>
        <CardDescription>View and manage attendance records for all employees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
            <Tabs defaultValue={activeTab} onValueChange={v => setActiveTab(v as 'active' | 'former')} className="w-full md:w-auto">
              <TabsList>
                <TabsTrigger value="active">Current Employees</TabsTrigger>
                <TabsTrigger value="former">Former Employees</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              type="text"
              className="border rounded px-3 py-2 w-full md:w-80"
              placeholder="Search employees by name, email, or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
              <SelectTrigger className="w-40">Sort by</SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="employeeId">Employee ID</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={v => setSortOrder(v as any)}>
              <SelectTrigger className="w-24">Order</SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">A-Z</SelectItem>
                <SelectItem value="desc">Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading employees...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.filter(emp => activeTab === 'active' ? !emp.leavingDate : !!emp.leavingDate).length > 0 ? (
                employees
                  .filter(emp => activeTab === 'active' ? !emp.leavingDate : !!emp.leavingDate)
                  .map(employee => (
                    <div key={employee._id} className="bg-white rounded-lg border border-gray-200 shadow-md p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition"
                      onClick={() => setSelectedEmployee(employee)}>
                      <Avatar>
                        <AvatarImage src={employee.faceImageUrl} alt={employee.name} />
                        <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{employee.name}</div>
                        <div className="text-xs text-gray-400 font-mono">ID: {employee.employeeId}</div>
                        {employee.department && <Badge variant="secondary">{employee.department}</Badge>}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-500 col-span-full">No employees found</div>
              )}
            </div>
          )}
          {/* Calendar view for all attendance records */}
          {(() => {
            const allAttendanceStatusByDate: Record<string, string> = {};
            attendanceRecords.forEach(record => {
              const dateStr = new Date(record.date).toISOString().slice(0, 10);
              // Prioritize present > late > absent
              if (!allAttendanceStatusByDate[dateStr] || allAttendanceStatusByDate[dateStr] === 'absent') {
                allAttendanceStatusByDate[dateStr] = record.status;
              }
            });
            return (
              <div>
                <Calendar
                  tileClassName={({ date, view }) => {
                    if (view === 'month') {
                      const dateStr = date.toISOString().slice(0, 10);
                      const status = allAttendanceStatusByDate[dateStr];
                      if (status) {
                        return `calendar-status calendar-status--${status}`;
                      }
                    }
                    return null;
                  }}
                />
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="flex items-center"><span style={{background:'#4ade80',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>Present</span>
                  <span className="flex items-center"><span style={{background:'#facc15',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>Late</span>
                  <span className="flex items-center"><span style={{background:'#f87171',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>Absent</span>
                  <span className="flex items-center"><span style={{background:'#38bdf8',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>On Leave</span>
                </div>
              </div>
            );
          })()}
          <Dialog open={!!selectedEmployee} onOpenChange={open => { if (!open) setSelectedEmployee(null) }}>
            <DialogContent className="max-w-2xl w-full">
              <DialogTitle>Attendance Records</DialogTitle>
              {selectedEmployee && (
                <div>
                  <div className="flex items-center gap-4 mb-4 justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={selectedEmployee.faceImageUrl} alt={selectedEmployee.name} />
                        <AvatarFallback>{selectedEmployee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-lg">{selectedEmployee.name}</div>
                        <div className="text-xs text-gray-400 font-mono">ID: {selectedEmployee.employeeId}</div>
                        {selectedEmployee.department && <Badge variant="secondary">{selectedEmployee.department}</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm text-gray-500">Total Hours:</span><br />
                      <span className="font-bold text-lg">{getTotalDurationString(attendanceRecords)}</span>
                    </div>
                  </div>
                  {/* Calendar view for attendance status */}
                  <div className="mb-6">
                    {/* Build a map of date strings to status */}
                    {(() => {
                      const attendanceStatusByDate: Record<string, string> = {};
                      attendanceRecords.forEach(record => {
                        const dateStr = new Date(record.date).toISOString().slice(0, 10);
                        attendanceStatusByDate[dateStr] = record.status;
                      });
                      return (
                        <div>
                          <Calendar
                            tileClassName={({ date, view }) => {
                              if (view === 'month') {
                                const dateStr = date.toISOString().slice(0, 10);
                                const status = attendanceStatusByDate[dateStr];
                                if (status) {
                                  return `calendar-status calendar-status--${status}`;
                                }
                              }
                              return null;
                            }}
                          />
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="flex items-center"><span style={{background:'#4ade80',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>Present</span>
                            <span className="flex items-center"><span style={{background:'#facc15',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>Late</span>
                            <span className="flex items-center"><span style={{background:'#f87171',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>Absent</span>
                            <span className="flex items-center"><span style={{background:'#38bdf8',borderRadius:'50%',display:'inline-block',width:16,height:16,marginRight:6}}></span>On Leave</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Check-in</th>
                          <th className="px-3 py-2 text-left">Check-out</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceLoading ? (
                          <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                        ) : attendanceRecords.length > 0 ? (
                          attendanceRecords.map(record => (
                            <tr key={record._id} className="border-b">
                              <td className="px-3 py-2">{new Date(record.date).toLocaleDateString()}</td>
                              <td className="px-3 py-2">{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                              <td className="px-3 py-2">{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                              <td className="px-3 py-2"><Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'destructive'}>{record.status}</Badge></td>
                              <td className="px-3 py-2">{record.checkInTime && record.checkOutTime ? getDurationString(record.checkInTime, record.checkOutTime) : '--'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={5} className="text-center py-4 text-gray-500">No attendance records found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
