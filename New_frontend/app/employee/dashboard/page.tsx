"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, TrendingUp, Award, LogOut, User, BarChart3, DollarSign, CheckCircle, Clock as ClockIcon, XCircle, AlertCircle, Coffee } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";
import { format } from 'date-fns';
import { DotProps } from 'recharts';
import { Calendar as CalendarIcon } from 'lucide-react';
// Add this at the top of the file to fix the linter error for 'file-saver'
// @ts-ignore
import { saveAs } from 'file-saver';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function ColoredDot(props: DotProps & { index?: number }) {
  const { cx, cy, index } = props;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={COLORS[index ? index % COLORS.length : 0]}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

interface AttendanceRecord {
  _id: string
  date: string
  checkIn: string
  checkOut?: string
  checkInTime?: string
  checkOutTime?: string
  status: "present" | "absent" | "late" | "on leave" | "on_leave"
  hoursWorked: number
  totalHours: number // Added for monthly aggregation
  method: string;
  isLate: boolean;
  overtimeHours: number;
}

interface AttendanceSummary {
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  averageHours: number
  attendanceRate: number
}

const STATUS_COLORS: Record<string, string> = {
  present: "#2563eb",    // Blue
  absent: "#ef4444",     // Red
  late: "#f59e42",       // Orange
  "on leave": "#a78bfa", // Purple
  on_leave: "#a78bfa",   // Purple (for backend variant)
};

// Fix STATUS_COLORS_CAL typing:
const STATUS_COLORS_CAL: Record<string, string> = {
  present: '#2563eb', // blue
  absent: '#ef4444', // red
  late: '#f59e42',   // orange
  on_leave: '#a78bfa',
  'on leave': '#a78bfa',
};

const COLORS = [
  '#2563eb', // blue
  '#22c55e', // green
  '#f59e42', // orange
  '#ef4444', // red
  '#a78bfa', // purple
  '#eab308', // yellow
  '#06b6d4', // cyan
];

// Helper to get YYYY-MM-DD string
function getYMD(date: Date | string) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

// Helper to get YYYY-MM-DD in local time
function getLocalYMD(date: Date | string) {
  const d = new Date(date);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [attendanceView, setAttendanceView] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const recordsPerPage = 10;
  const [calendarDate, setCalendarDate] = useState(new Date());

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
        const recordsData = await recordsResponse.json();
        // Try to use recordsData.data, fallback to recordsData if it's an array
        const records = Array.isArray(recordsData.data) ? recordsData.data : Array.isArray(recordsData) ? recordsData : [];
        setAttendanceRecords(records);
        console.log("Fetched attendanceRecords:", records);
      }

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setSummary(summaryData)
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

  // Filter attendanceRecords by date range
  const filteredRecords = attendanceRecords.filter((rec) => {
    if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
    if (searchTerm && !(
      rec.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(rec.date).toLocaleDateString().includes(searchTerm)
    )) return false;
    if (startDate && new Date(rec.date) < new Date(startDate)) return false;
    if (endDate && new Date(rec.date) > new Date(endDate)) return false;
    return true;
  });
  const paginatedRecords = filteredRecords.slice((page - 1) * recordsPerPage, page * recordsPerPage);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Export to CSV
  function exportToCSV() {
    const header = ['Date', 'Check-in', 'Check-out', 'Status', 'Hours', 'Method', 'Overtime'];
    const rows = filteredRecords.map(rec => [
      new Date(rec.date).toLocaleDateString(),
      rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      rec.status,
      typeof rec.totalHours === 'number' ? rec.totalHours.toFixed(2) : '',
      rec.method || '',
      rec.overtimeHours > 0 ? rec.overtimeHours.toFixed(2) : ''
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'attendance_history.csv');
  }

  // Prepare chart data for selected range
  const chartData = filteredRecords
    .map((record) => ({
      date: new Date(record.date).toLocaleDateString("en-US", { weekday: "short" }),
      hours: record.totalHours || 0,
      status: record.status,
    }))
    .reverse();

  // Attendance breakdown for donut chart
  const breakdown = attendanceRecords.reduce(
    (acc, rec) => {
      if (rec.status === "present") acc.present++;
      else if (rec.status === "late") acc.late++;
      else if (rec.status === "absent") acc.absent++;
      else if (rec.status === "on leave" || rec.status === "on_leave") acc.on_leave++;
      return acc;
    },
    { present: 0, late: 0, absent: 0, on_leave: 0 }
  );
  const donutData = [
    { name: "Present", value: breakdown.present },
    { name: "Late", value: breakdown.late },
    { name: "Absent", value: breakdown.absent },
    { name: "On Leave", value: breakdown.on_leave },
  ];

  // Prepare monthly data from attendanceRecords
  const monthlyAgg: { [key: string]: { present: number; late: number; absent: number; onLeave: number; hours: number; total: number } } = {};
  attendanceRecords.forEach((rec) => {
    const d = new Date(rec.date);
    const month = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    if (!monthlyAgg[month]) monthlyAgg[month] = { present: 0, late: 0, absent: 0, onLeave: 0, hours: 0, total: 0 };
    if (rec.status === "present") monthlyAgg[month].present++;
    if (rec.status === "late") monthlyAgg[month].late++;
    if (rec.status === "absent") monthlyAgg[month].absent++;
    if (rec.status === "on leave" || rec.status === "on_leave") monthlyAgg[month].onLeave++;
    monthlyAgg[month].hours += rec.totalHours || 0; // use totalHours
    monthlyAgg[month].total++;
  });
  const monthlyData = Object.entries(monthlyAgg).map(([month, stats]) => ({
    month,
    attendance: stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0,
    hours: stats.hours,
  }));

  // Map attendanceRecords by date string for quick lookup
  const attendanceByDate = attendanceRecords.reduce((acc, rec) => {
    const d = new Date(rec.date).toDateString();
    acc[d] = rec.status;
    return acc;
  }, {} as Record<string, string>);

  // Aggregate statuses per day, worst status wins
  const statusPriority: Record<string, number> = { absent: 3, late: 2, 'on leave': 1, on_leave: 1, present: 0 };
  const attendanceByDay: Record<string, string> = {};
  attendanceRecords.forEach(rec => {
    const ymd = getLocalYMD(rec.date);
    const prev = attendanceByDay[ymd];
    if (!prev || statusPriority[rec.status] > statusPriority[prev]) {
      attendanceByDay[ymd] = rec.status;
    }
  });

  // Build a Set of all attendance dates (YYYY-MM-DD, local time)
  const attendanceDays = new Set(attendanceRecords.map(rec => getLocalYMD(rec.date)));

  // Log attendance record dates for debugging
  console.log('Attendance records:', attendanceRecords.map(r => r.date));

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
                <CalendarIcon className="h-8 w-8 text-blue-600" />
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
              {/* Weekly Hours Chart with customization */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Weekly Hours Trend</CardTitle>
                    <CardDescription>Your daily working hours for the selected period</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Start</label>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={e => setStartDate(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <label className="text-sm">End</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => setEndDate(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-2"><Settings className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setChartType('bar')}>Bar Chart</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChartType('line')}>Line Chart</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ hours: { label: "Hours Worked", color: "hsl(var(--chart-1))" } }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      {chartData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">No attendance records for this period.</div>
                      ) : chartType === 'bar' ? (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="hours">
                            {chartData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="hours"
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={(props) => {
                              const { key, ...rest } = props;
                              return <ColoredDot {...rest} />;
                            }}
                            activeDot={{ r: 8 }}
                            connectNulls={true}
                          />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Attendance Breakdown Donut Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Breakdown</CardTitle>
                  <CardDescription>Distribution of your attendance statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        labelLine={false}
                        label={({ percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                        isAnimationActive={true}
                      >
                        {donutData.map((entry, idx) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase().replace(' ', '_')] || '#8884d8'} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:gap-0 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Recent Attendance Records</CardTitle>
                  <CardDescription>Your attendance history for the current month</CardDescription>
                </div>
              </CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 pb-3 gap-2">
                <div className="flex flex-wrap gap-3 items-center">
                  <input
                    type="text"
                    placeholder="Search by date or method..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                    className="border rounded px-3 py-2 text-base min-w-[180px] shadow-sm focus:ring-2 focus:ring-blue-200"
                    style={{ fontSize: '1rem', height: '40px' }}
                  />
                  <select
                    className="border rounded px-3 py-2 text-base min-w-[140px] shadow-sm focus:ring-2 focus:ring-blue-200"
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{ fontSize: '1rem', height: '40px' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="on leave">On Leave</option>
                  </select>
                  <label className="text-base font-medium">Start</label>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={e => { setStartDate(e.target.value); setPage(1); }}
                    className="border rounded px-3 py-2 text-base shadow-sm focus:ring-2 focus:ring-blue-200"
                    style={{ fontSize: '1rem', height: '40px', minWidth: '120px' }}
                  />
                  <label className="text-base font-medium">End</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    onChange={e => { setEndDate(e.target.value); setPage(1); }}
                    className="border rounded px-3 py-2 text-base shadow-sm focus:ring-2 focus:ring-blue-200"
                    style={{ fontSize: '1rem', height: '40px', minWidth: '120px' }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-3 md:mt-0 md:ml-6">
                  <span className="hidden md:inline-block h-8 border-l border-gray-300"></span>
                  <Button
                    variant="secondary"
                    onClick={exportToCSV}
                    className="h-10 px-4 text-base font-semibold bg-green-600 text-white hover:bg-green-700 border-green-600 transition-colors duration-200 shadow-md"
                    style={{ minWidth: '120px' }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAttendanceView(attendanceView === 'calendar' ? 'list' : 'calendar')}
                    className={`h-10 px-4 text-base font-semibold border-2 transition-colors duration-200 shadow-md ${attendanceView === 'calendar' ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}`}
                    style={{ minWidth: '140px' }}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" /> {attendanceView === 'calendar' ? 'List View' : 'Calendar View'}
                  </Button>
                </div>
              </div>
              <CardContent>
                {attendanceView === 'calendar' ? (
                  <div className="w-full flex flex-col">
                    <Calendar
                      value={calendarDate}
                      onChange={(value) => {
                        if (value instanceof Date) setCalendarDate(value);
                        else if (Array.isArray(value) && value[0] instanceof Date) setCalendarDate(value[0]);
                        else setCalendarDate(new Date());
                      }}
                      tileContent={({ date, view }: { date: Date; view: string }) => null}
                      tileClassName={({ date, view }: { date: Date; view: string }) => {
                        if (view === 'month') {
                          const ymd = getLocalYMD(date);
                          console.log('Calendar cell:', ymd, 'Attendance:', attendanceDays.has(ymd), attendanceByDay[ymd]);
                          if (attendanceDays.has(ymd)) {
                            const status = attendanceByDay[ymd];
                            return status
                              ? `calendar-status calendar-status--${status.replace(' ', '_')}`
                              : 'calendar-status';
                          }
                        }
                        return '';
                      }}
                      className="border rounded-lg shadow-md max-w-2xl w-full mx-auto"
                    />
                    <div className="flex gap-4 mt-4 pl-2">
                      <span className="flex items-center gap-1"><span style={{background:'#2563eb',width:10,height:10,borderRadius:'50%',display:'inline-block'}}></span> Present</span>
                      <span className="flex items-center gap-1"><span style={{background:'#f59e42',width:10,height:10,borderRadius:'50%',display:'inline-block'}}></span> Late</span>
                      <span className="flex items-center gap-1"><span style={{background:'#ef4444',width:10,height:10,borderRadius:'50%',display:'inline-block'}}></span> Absent</span>
                      <span className="flex items-center gap-1"><span style={{background:'#a78bfa',width:10,height:10,borderRadius:'50%',display:'inline-block'}}></span> On Leave</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedRecords.length > 0 ? (
                        paginatedRecords.map((record) => {
                          // Status icon and color
                          let statusIcon = <CheckCircle className="h-5 w-5 text-blue-600" />;
                          let badgeColor = STATUS_COLORS[record.status?.toLowerCase().replace(' ', '_')] || '#2563eb';
                          if (record.status === 'absent') statusIcon = <XCircle className="h-5 w-5 text-red-500" />;
                          else if (record.status === 'late') statusIcon = <AlertCircle className="h-5 w-5 text-orange-500" />;
                          else if (record.status === 'on leave' || record.status === 'on_leave') statusIcon = <Coffee className="h-5 w-5 text-purple-500" />;

                          return (
                            <div
                              key={record._id}
                              className="flex flex-col md:flex-row md:items-center md:justify-between p-5 border rounded-xl shadow-sm bg-white hover:shadow-lg transition-shadow duration-200 mb-2"
                            >
                              <div className="flex items-center space-x-4 mb-2 md:mb-0">
                                <div className="flex flex-col items-center">
                                  <span className="text-lg font-semibold text-gray-700">
                                    {new Date(record.date).toLocaleDateString("en-US", { weekday: "short" })}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 ml-2">
                                  <span className="flex items-center gap-1 text-base font-medium text-gray-800">
                                    <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                                    Check-in: {record.checkInTime
                                      ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                      : record.checkIn
                                        ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : '--'}
                                  </span>
                                  {(record.checkOutTime || record.checkOut) && (
                                    <span className="flex items-center gap-1 text-sm text-gray-600">
                                      <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                                      Check-out: {record.checkOutTime
                                        ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : record.checkOut
                                          ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                          : '--'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center md:space-x-6 gap-2">
                                <div className="flex flex-col items-center">
                                  <span className="text-lg font-bold text-gray-900">{typeof record.totalHours === 'number' ? record.totalHours.toFixed(2) : '--'}h</span>
                                  <span className="text-xs text-gray-500">worked</span>
                                </div>
                                <span className="flex items-center gap-2">
                                  {statusIcon}
                                  <Badge
                                    style={{ backgroundColor: badgeColor, color: '#fff', fontWeight: 600, fontSize: '0.95em' }}
                                    className="px-3 py-1 rounded-full shadow-sm"
                                  >
                                    {record.status}
                                  </Badge>
                                </span>
                                {record.method && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold border border-gray-300">
                                    {record.method}
                                  </span>
                                )}
                                {record.overtimeHours > 0 && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900 text-xs font-semibold border border-yellow-400">
                                    +{record.overtimeHours.toFixed(2)}h OT
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-gray-500">No attendance records found</div>
                      )}
                    </div>
                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>&lt; Prev</Button>
                        <span className="text-sm">Page {page} of {totalPages}</span>
                        <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next &gt;</Button>
                      </div>
                    )}
                  </>
                )}
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
