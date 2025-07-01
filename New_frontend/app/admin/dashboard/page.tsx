"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Calendar, TrendingUp, Shield, LogOut, Eye, Edit, Trash2 } from "lucide-react"
import EmployeeRegistration from "@/components/employee-registration"
import AttendanceManagement from "@/components/attendance-management"
import FaceScanner from "@/components/face-scanner"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
  joiningDate?: string
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    todayAttendanceRate: null as number | null,
    avgAttendanceRate: null as number | null,
    newThisMonth: null as number | null,
  })
  const [showFaceModal, setShowFaceModal] = useState<string | null>(null)
  const [faceUploadLoading, setFaceUploadLoading] = useState(false)
  const [faceUploadError, setFaceUploadError] = useState<string | null>(null)
  const [faceUploadSuccess, setFaceUploadSuccess] = useState<string | null>(null)
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', department: '', position: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [showFaceUpdate, setShowFaceUpdate] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState<null | string>(null)
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'employeeId'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [roleFilter, setRoleFilter] = useState<'all' | 'employee' | 'admin'>('all')
  const [showNoFaceOnly, setShowNoFaceOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [markLeftEmployee, setMarkLeftEmployee] = useState<Employee | null>(null)
  const [showMarkLeftAdminModal, setShowMarkLeftAdminModal] = useState(false)
  const [showMarkLeftEmpModal, setShowMarkLeftEmpModal] = useState(false)
  const [markLeftAdminPassword, setMarkLeftAdminPassword] = useState('')
  const [markLeftEmpEmail, setMarkLeftEmpEmail] = useState('')
  const [markLeftEmpPassword, setMarkLeftEmpPassword] = useState('')
  const [markLeftAdminError, setMarkLeftAdminError] = useState<string | null>(null)
  const [markLeftEmpError, setMarkLeftEmpError] = useState<string | null>(null)
  const [markLeftLoading, setMarkLeftLoading] = useState(false)
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null)
  const [showDeleteAdminModal, setShowDeleteAdminModal] = useState(false)
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('')
  const [deleteAdminError, setDeleteAdminError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    const adminData = localStorage.getItem("admin")
    console.log("adminData", adminData)
    console.log("token", token)

    if (!token || !adminData) {
      router.push("/admin/login")
      return
    }

    if (adminData && adminData !== "undefined") {
      setAdmin(JSON.parse(adminData));
      fetchEmployees(token);
      fetchStats(token);
    } else {
      setAdmin(null); // or handle as not logged in
    }
  }, [])

  const fetchEmployees = async (token: string) => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)
      const response = await fetch(`http://localhost:5000/api/auth/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setEmployees(Array.isArray(data) ? data : data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async (token: string) => {
    try {
      // 1. Today's attendance rate
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const summaryRes = await fetch(`http://localhost:5000/api/attendance/admin/summary?period=daily&startDate=${todayStr}&endDate=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let todayAttendanceRate = null;
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        // Calculate overall attendance rate for today
        let total = 0, present = 0;
        summary.forEach((rec: any) => {
          total += (rec.totalPresent || 0) + (rec.totalLate || 0) + (rec.totalAbsent || 0) + (rec.totalOnLeave || 0);
          present += (rec.totalPresent || 0) + (rec.totalLate || 0);
        });
        todayAttendanceRate = total > 0 ? Math.round((present / total) * 100) : null;
      }
      // 2. Average attendance rate (last 30 days)
      const avgRes = await fetch(`http://localhost:5000/api/attendance/admin/summary?period=daily`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let avgAttendanceRate = null;
      if (avgRes.ok) {
        const summary = await avgRes.json();
        let total = 0, present = 0;
        summary.forEach((rec: any) => {
          total += (rec.totalPresent || 0) + (rec.totalLate || 0) + (rec.totalAbsent || 0) + (rec.totalOnLeave || 0);
          present += (rec.totalPresent || 0) + (rec.totalLate || 0);
        });
        avgAttendanceRate = total > 0 ? Math.round((present / total) * 100) : null;
      }
      // 3. New employees this month
      const usersRes = await fetch("http://localhost:5000/api/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      let newThisMonth = null;
      if (usersRes.ok) {
        const data = await usersRes.json();
        const now = new Date();
        const usersArr = Array.isArray(data) ? data : data.users || [];
        newThisMonth = usersArr.filter((u: any) => {
          const created = new Date(u.createdAt);
          return !u.leavingDate && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
        }).length;
      }
      setStats({ todayAttendanceRate, avgAttendanceRate, newThisMonth });
    } catch (err) {
      setStats({ todayAttendanceRate: null, avgAttendanceRate: null, newThisMonth: null });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return

    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`http://localhost:5000/api/auth/users/${employeeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setEmployees((prev) => prev.filter((emp) => emp._id !== employeeId))
      }
    } catch (error) {
      console.error("Failed to delete employee:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("admin")
    router.push("/")
  }

  const handleViewEmployee = (employee: Employee) => {
    setViewEmployee(employee)
  }
  const handleEditEmployee = (employee: Employee) => {
    setShowAuthModal(employee._id)
    setEditEmployee(null)
    setEditForm({ name: '', email: '', department: '', position: '' })
    setEditError(null)
    setEditSuccess(null)
    setShowFaceUpdate(false)
  }
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }
  const handleEditSave = async () => {
    if (!editEmployee) return
    setEditLoading(true)
    setEditError(null)
    setEditSuccess(null)
    const token = localStorage.getItem("adminToken")
    try {
      const res = await fetch(`http://localhost:5000/api/auth/users/${editEmployee._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (res.ok) {
        setEditSuccess("Employee updated successfully!")
        setEditEmployee(null)
        fetchEmployees(token!)
      } else {
        setEditError(data.message || "Failed to update employee.")
      }
    } catch {
      setEditError("Network error")
    } finally {
      setEditLoading(false)
    }
  }

  const handleAddFace = (employee: Employee, imageData: string) => {
    setFaceUploadLoading(true)
    setFaceUploadError(null)
    setFaceUploadSuccess(null)
    const token = localStorage.getItem("adminToken")
    fetch("http://localhost:5000/api/auth/add-face-to-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email: employee.email, faceImage: imageData }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setFaceUploadSuccess("Face registered successfully!")
          setShowFaceModal(null)
          fetchEmployees(token!)
        } else {
          setFaceUploadError(data.message || "Failed to register face.")
        }
      })
      .catch(() => setFaceUploadError("Network error"))
      .finally(() => setFaceUploadLoading(false))
  }

  const handleUpdateFace = (imageData: string) => {
    if (!editEmployee) return
    setFaceUploadLoading(true)
    setFaceUploadError(null)
    setFaceUploadSuccess(null)
    const token = localStorage.getItem("adminToken")
    fetch("http://localhost:5000/api/auth/add-face-to-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email: editEmployee.email, faceImage: imageData }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setFaceUploadSuccess("Face updated successfully!")
          setShowFaceUpdate(false)
          fetchEmployees(token!)
        } else {
          setFaceUploadError(data.message || "Failed to update face.")
        }
      })
      .catch(() => setFaceUploadError("Network error"))
      .finally(() => setFaceUploadLoading(false))
  }

  const handleAuthSubmit = async (employee: Employee) => {
    setAuthLoading(true)
    setAuthError(null)
    const token = localStorage.getItem("adminToken")
    try {
      const res = await fetch("http://localhost:5000/api/auth/admin/reauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ password: authPassword }),
      })
      if (res.ok) {
        setShowAuthModal(null)
        setAuthPassword('')
        setEditEmployee(employee)
        setEditForm({
          name: employee.name || '',
          email: employee.email || '',
          department: employee.department || '',
          position: employee.position || '',
        })
      } else {
        setAuthError("Incorrect password. Please try again.")
      }
    } catch {
      setAuthError("Network error")
    } finally {
      setAuthLoading(false)
    }
  }

  // Refetch employees when filters/sort/search change
  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    if (token) fetchEmployees(token)
  }, [search, sortBy, sortOrder, roleFilter])

  // Fetch attendance trend when Reports tab is active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('reports')) fetchAttendanceTrend();
    }
  }, []);

  const fetchAttendanceTrend = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/analytics/attendance-trend');
      const data = await res.json();
      setAttendanceTrend(Array.isArray(data.trend) ? data.trend : []);
    } catch {
      setAttendanceTrend([]);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
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
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">System Management Panel</p>
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
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{employees.filter(emp => !emp.leavingDate).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayAttendanceRate !== null ? `${stats.todayAttendanceRate}%` : '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgAttendanceRate !== null ? `${stats.avgAttendanceRate}%` : '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">New This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth !== null ? stats.newThisMonth : '--'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList>
            <TabsTrigger value="employees">Employee Management</TabsTrigger>
            <TabsTrigger value="register">Register Employee</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Management</TabsTrigger>
            <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Directory</CardTitle>
                <CardDescription>Manage all registered employees</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Active/Former Employees Toggle */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
                  <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                    <TabsList>
                      <TabsTrigger value="active">Active Employees</TabsTrigger>
                      <TabsTrigger value="former">Former Employees</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {/* Filter & Sort Bar (as before) */}
                <div className="flex flex-col md:flex-row md:items-center md:space-x-2 gap-2 w-full md:w-auto mt-2 md:mt-0 mb-6">
                  <input
                    type="text"
                    className="border rounded px-3 py-2 w-full md:w-80"
                    placeholder="Search by name or department..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <select
                    className="border rounded px-3 py-2"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'name' | 'department' | 'employeeId')}
                  >
                    <option value="name">Sort by Name</option>
                    <option value="department">Sort by Department</option>
                    <option value="employeeId">Sort by Employee ID</option>
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                  >
                    <option value="asc">A-Z</option>
                    <option value="desc">Z-A</option>
                  </select>
                  <select
                    className="border rounded px-3 py-2"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value as 'all' | 'employee' | 'admin')}
                  >
                    <option value="all">All Roles</option>
                    <option value="employee">Employees</option>
                    <option value="admin">Admins</option>
                  </select>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showNoFaceOnly}
                      onChange={e => setShowNoFaceOnly(e.target.checked)}
                    />
                    <span className="text-sm">No Face Registered</span>
                  </label>
                </div>
                {/* Employee List (filtered by activeTab and all other filters) */}
                <div className="space-y-4">
                  {employees
                    .filter(emp => (activeTab === 'active' ? !emp.leavingDate : !!emp.leavingDate))
                    .filter(emp => !showNoFaceOnly || !emp.faceEmbeddings || emp.faceEmbeddings.length === 0)
                    .map((employee) => {
                      const isAdmin = employee.role === 'admin' || employee.email === 'admin@company.com';
                      const needsFace = !employee.faceEmbeddings || employee.faceEmbeddings.length === 0;
                      return (
                        <div key={employee._id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <span className="flex items-center">
                                  {employee.name}
                                  {employee.employeeId ? (
                                    <span className="ml-2 text-xs text-gray-400 font-mono font-normal">ID: {employee.employeeId}</span>
                                  ) : null}
                                </span>
                                {needsFace && !isAdmin && (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">No Face Registered</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">{employee.email}</div>
                              {employee.department && (
                                <Badge variant="secondary" className={isAdmin ? "mt-1 bg-gray-200 text-gray-500" : "mt-1"}>
                                  {employee.department}
                                </Badge>
                              )}
                              {activeTab === 'former' && employee.leavingDate && (
                                <div className="text-sm text-red-500">
                                  Leaving Date: {new Date(employee.leavingDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" disabled={isAdmin} className={isAdmin ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : ""} onClick={() => !isAdmin && handleViewEmployee(employee)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={isAdmin} className={isAdmin ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : ""} onClick={() => !isAdmin && handleEditEmployee(employee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isAdmin}
                              onClick={() => {
                                setDeleteEmployee(employee);
                                setShowDeleteConfirm(true);
                                setDeleteAdminPassword('');
                                setDeleteAdminError(null);
                                setShowDeleteAdminModal(false);
                              }}
                              className={isAdmin ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "text-red-600 hover:text-red-700"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {needsFace && !isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                onClick={() => setShowFaceModal(employee._id)}
                              >
                                Add Face
                              </Button>
                            )}
                            {activeTab === 'active' && !isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                                onClick={() => {
                                  setMarkLeftEmployee(employee);
                                  setShowMarkLeftAdminModal(true);
                                  setMarkLeftAdminPassword('');
                                  setMarkLeftAdminError(null);
                                  setShowMarkLeftEmpModal(false);
                                  setMarkLeftEmpEmail(employee.email || '');
                                  setMarkLeftEmpPassword('');
                                  setMarkLeftEmpError(null);
                                }}
                              >
                                Mark as Left
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  }
                  {employees.filter(emp => (activeTab === 'active' ? !emp.leavingDate : !!emp.leavingDate)).length === 0 && (
                    <div className="text-center py-8 text-gray-500">No employees found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="space-y-6">
            <EmployeeRegistration
              onSuccess={() => {
                const token = localStorage.getItem("adminToken")
                if (token) fetchEmployees(token)
              }}
            />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <AttendanceManagement />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Reports</CardTitle>
                <CardDescription>Comprehensive analytics and reporting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-8">
                  <h3 className="font-semibold mb-2">Attendance Rate (Last 30 Days)</h3>
                  {analyticsLoading ? (
                    <div>Loading chart...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={attendanceTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString()} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={v => `${v.toFixed(1)}%`} labelFormatter={d => new Date(d).toLocaleDateString()} />
                        <Line type="monotone" dataKey="attendanceRate" stroke="#2563eb" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-6 bg-blue-50 rounded-lg text-center">
                    <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-700">94.2%</div>
                    <div className="text-sm text-gray-600">Overall Attendance Rate</div>
                  </div>
                  <div className="p-6 bg-green-50 rounded-lg text-center">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">8.2h</div>
                    <div className="text-sm text-gray-600">Average Work Hours</div>
                  </div>
                  <div className="p-6 bg-purple-50 rounded-lg text-center">
                    <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-700">12%</div>
                    <div className="text-sm text-gray-600">Late Arrival Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Face Registration Modal */}
      {showFaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowFaceModal(null)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Register Face for Employee</h2>
            <p className="mb-4 text-gray-600">Scan the employee's face using the camera below.</p>
            <FaceScanner
              onScanComplete={(img) => {
                const emp = employees.find(e => e._id === showFaceModal)
                if (emp) handleAddFace(emp, img)
              }}
              isScanning={faceUploadLoading}
            />
            {faceUploadError && <div className="text-red-600 mt-2">{faceUploadError}</div>}
            {faceUploadSuccess && <div className="text-green-600 mt-2">{faceUploadSuccess}</div>}
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setViewEmployee(null)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Employee Details</h2>
            <div className="mb-2"><span className="font-semibold">Name:</span> {viewEmployee.name}</div>
            <div className="mb-2"><span className="font-semibold">Email:</span> {viewEmployee.email}</div>
            <div className="mb-2"><span className="font-semibold">Department:</span> {viewEmployee.department}</div>
            <div className="mb-2"><span className="font-semibold">Position:</span> {viewEmployee.position}</div>
            <div className="mb-2">
              <span className="font-semibold">Joining Date:</span> {viewEmployee.joiningDate ? new Date(viewEmployee.joiningDate).toLocaleString() : (viewEmployee.createdAt ? new Date(viewEmployee.createdAt).toLocaleString() : '-')}
            </div>
            {viewEmployee.leavingDate && (
              <div className="mb-2">
                <span className="font-semibold">Leaving Date:</span> {viewEmployee.leavingDate ? new Date(viewEmployee.leavingDate).toLocaleString() : '-'}
              </div>
            )}
            <div className="mb-2"><span className="font-semibold">Role:</span> {viewEmployee.role}</div>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setViewEmployee(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setEditEmployee(null)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Edit Employee</h2>
            <form onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
              <div className="mb-2">
                <label className="block font-semibold mb-1">Name</label>
                <input name="name" value={editForm.name} onChange={handleEditFormChange} className="w-full border rounded px-2 py-1" required />
              </div>
              <div className="mb-2">
                <label className="block font-semibold mb-1">Email</label>
                <input name="email" value={editForm.email} onChange={handleEditFormChange} className="w-full border rounded px-2 py-1" required />
              </div>
              <div className="mb-2">
                <label className="block font-semibold mb-1">Department</label>
                <input name="department" value={editForm.department} onChange={handleEditFormChange} className="w-full border rounded px-2 py-1" />
              </div>
              <div className="mb-2">
                <label className="block font-semibold mb-1">Position</label>
                <input name="position" value={editForm.position} onChange={handleEditFormChange} className="w-full border rounded px-2 py-1" />
              </div>
              {/* Face image preview */}
              <div className="mb-2 flex flex-col items-center">
                {editEmployee.faceImageUrl ? (
                  <img src={editEmployee.faceImageUrl} alt="Employee Face" className="w-24 h-24 rounded-full border mb-2 object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full border mb-2 flex items-center justify-center bg-gray-100 text-gray-400">No Face</div>
                )}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <button type="button" className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded" onClick={() => setShowFaceUpdate(v => !v)}>
                  {showFaceUpdate ? 'Cancel Face Update' : 'Update Face'}
                </button>
                {faceUploadSuccess && <span className="text-green-600 text-sm">{faceUploadSuccess}</span>}
                {faceUploadError && <span className="text-red-600 text-sm">{faceUploadError}</span>}
              </div>
              {showFaceUpdate && (
                <div className="mb-2">
                  <FaceScanner
                    onScanComplete={handleUpdateFace}
                    isScanning={faceUploadLoading}
                  />
                </div>
              )}
              {editError && <div className="text-red-600 mb-2">{editError}</div>}
              {editSuccess && <div className="text-green-600 mb-2">{editSuccess}</div>}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={() => setEditEmployee(null)}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Re-auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowAuthModal(null)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Admin Authorization Required</h2>
            <p className="mb-4 text-gray-600">Please re-enter your admin password to edit employee details.</p>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="Admin password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              disabled={authLoading}
            />
            {authError && <div className="text-red-600 mb-2">{authError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowAuthModal(null)} disabled={authLoading}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={authLoading || !authPassword} onClick={() => {
                const emp = employees.find(e => e._id === showAuthModal)
                if (emp) handleAuthSubmit(emp)
              }}>{authLoading ? 'Verifying...' : 'Verify'}</button>
            </div>
          </div>
        </div>
      )}

      {showMarkLeftAdminModal && markLeftEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowMarkLeftAdminModal(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Admin Authentication Required</h2>
            <p className="mb-4 text-gray-600">Please enter your admin password to continue.</p>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="Admin password"
              value={markLeftAdminPassword}
              onChange={e => setMarkLeftAdminPassword(e.target.value)}
              disabled={markLeftLoading}
            />
            {markLeftAdminError && <div className="text-red-600 mb-2">{markLeftAdminError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowMarkLeftAdminModal(false)} disabled={markLeftLoading}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" disabled={markLeftLoading || !markLeftAdminPassword} onClick={async () => {
                setMarkLeftLoading(true);
                setMarkLeftAdminError(null);
                const token = localStorage.getItem("adminToken");
                try {
                  const res = await fetch("http://localhost:5000/api/auth/admin/reauth", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ password: markLeftAdminPassword }),
                  });
                  if (res.ok) {
                    setShowMarkLeftAdminModal(false);
                    setShowMarkLeftEmpModal(true);
                  } else {
                    setMarkLeftAdminError("Incorrect admin password.");
                  }
                } catch {
                  setMarkLeftAdminError("Network error");
                } finally {
                  setMarkLeftLoading(false);
                }
              }}>{markLeftLoading ? 'Verifying...' : 'Verify'}</button>
            </div>
          </div>
        </div>
      )}

      {showMarkLeftEmpModal && markLeftEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowMarkLeftEmpModal(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Employee Authentication Required</h2>
            <p className="mb-4 text-gray-600">Please enter the employee's password to confirm.</p>
            <input
              type="email"
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="Employee email"
              value={markLeftEmpEmail}
              onChange={e => setMarkLeftEmpEmail(e.target.value)}
              disabled={true}
            />
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="Employee password"
              value={markLeftEmpPassword}
              onChange={e => setMarkLeftEmpPassword(e.target.value)}
              disabled={markLeftLoading}
            />
            {markLeftEmpError && <div className="text-red-600 mb-2">{markLeftEmpError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowMarkLeftEmpModal(false)} disabled={markLeftLoading}>Cancel</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" disabled={markLeftLoading || !markLeftEmpPassword} onClick={async () => {
                setMarkLeftLoading(true);
                setMarkLeftEmpError(null);
                try {
                  // Employee authentication (reuse login endpoint)
                  const res = await fetch("http://localhost:5000/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: markLeftEmpEmail, password: markLeftEmpPassword }),
                  });
                  if (res.ok) {
                    // Now mark as left
                    const token = localStorage.getItem("adminToken");
                    const updateRes = await fetch(`http://localhost:5000/api/auth/users/${markLeftEmployee._id}`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                      },
                      body: JSON.stringify({ leavingDate: new Date().toISOString() }),
                    });
                    if (updateRes.ok) {
                      setShowMarkLeftEmpModal(false);
                      setMarkLeftEmployee(null);
                      fetchEmployees(token!);
                    } else {
                      setMarkLeftEmpError("Failed to mark as left.");
                    }
                  } else {
                    setMarkLeftEmpError("Incorrect employee password.");
                  }
                } catch {
                  setMarkLeftEmpError("Network error");
                } finally {
                  setMarkLeftLoading(false);
                }
              }}>{markLeftLoading ? 'Verifying...' : 'Confirm & Mark as Left'}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && deleteEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowDeleteConfirm(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Confirm Deletion</h2>
            <p className="mb-4 text-gray-600">Are you sure you want to delete <span className="font-semibold">{deleteEmployee.name}</span>? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={() => {
                setShowDeleteConfirm(false);
                setShowDeleteAdminModal(true);
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAdminModal && deleteEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowDeleteAdminModal(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Admin Authentication Required</h2>
            <p className="mb-4 text-gray-600">Please enter your admin password to confirm deletion.</p>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 mb-2"
              placeholder="Admin password"
              value={deleteAdminPassword}
              onChange={e => setDeleteAdminPassword(e.target.value)}
              disabled={deleteLoading}
            />
            {deleteAdminError && <div className="text-red-600 mb-2">{deleteAdminError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowDeleteAdminModal(false)} disabled={deleteLoading}>Cancel</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" disabled={deleteLoading || !deleteAdminPassword} onClick={async () => {
                setDeleteLoading(true);
                setDeleteAdminError(null);
                const token = localStorage.getItem("adminToken");
                try {
                  const res = await fetch("http://localhost:5000/api/auth/admin/reauth", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ password: deleteAdminPassword }),
                  });
                  if (res.ok) {
                    // Proceed with deletion
                    const delRes = await fetch(`http://localhost:5000/api/auth/users/${deleteEmployee._id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (delRes.ok) {
                      setShowDeleteAdminModal(false);
                      setDeleteEmployee(null);
                      fetchEmployees(token!);
                    } else {
                      setDeleteAdminError("Failed to delete employee.");
                    }
                  } else {
                    setDeleteAdminError("Incorrect admin password.");
                  }
                } catch {
                  setDeleteAdminError("Network error");
                } finally {
                  setDeleteLoading(false);
                }
              }}>{deleteLoading ? 'Verifying...' : 'Confirm & Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
