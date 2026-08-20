'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, UserCheck, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type DelegateInfo = {
  name: string
  unit: string
  phone: string | null
  seat_number: string | null
  is_substituted: boolean | null
  substitute_name: string | null
  checkin_time: string | null
}

const formatTime = (isoString: string | null) => {
  if (!isoString) return '--:--'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function StatsCards() {
  const [stats, setStats] = useState({ total: 0, attended: 0, pending: 0 })
  const [pendingList, setPendingList] = useState<DelegateInfo[]>([])
  const [attendedList, setAttendedList] = useState<DelegateInfo[]>([])

  useEffect(() => {
    fetchStats()
    
    const channel = supabase
      .channel('delegates_changes_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delegates' }, fetchStats)
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchStats = async () => {
    const { data } = await supabase.from('delegates').select('status, name, unit, phone, seat_number, is_substituted, substitute_name, checkin_time').order('name', { ascending: true })
    if (data) {
      const total = data.length
      const attended = data.filter(d => d.status === 'Attended')
      const pending = data.filter(d => d.status === 'Pending')

      setStats({
        total,
        attended: attended.length,
        pending: pending.length
      })
      
      setAttendedList(attended)
      setPendingList(pending)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số đại biểu</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã có mặt</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.attended}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chưa điểm danh</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Attended */}
        <Card className="border-green-200 shadow-sm h-[600px] flex flex-col">
          <CardHeader className="bg-green-50/80 border-b border-green-100 rounded-t-xl py-3 px-4 shrink-0">
            <CardTitle className="text-green-800 flex items-center gap-2 text-base">
              <UserCheck className="w-5 h-5" /> ĐẠI BIỂU ĐÃ CÓ MẶT
            </CardTitle>
            <CardDescription className="text-green-600/80 text-xs">Danh sách đại biểu đã check-in thành công.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
            <Table className="relative min-w-[500px]">
              <TableHeader className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_0_0_#e5e7eb]">
                <TableRow className="hover:bg-gray-100">
                  <TableHead className="w-[40px] text-center text-xs font-bold text-gray-700 bg-gray-100 h-10 whitespace-nowrap px-2">STT</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 bg-gray-100 h-10 min-w-[120px] px-2">Họ và tên</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 bg-gray-100 h-10 whitespace-nowrap px-2">Người đi thay</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 bg-gray-100 h-10 min-w-[100px] px-2">Đơn vị</TableHead>
                  <TableHead className="text-center text-xs font-bold text-gray-700 bg-gray-100 h-10 whitespace-nowrap w-[70px] px-2">Thời gian</TableHead>
                  <TableHead className="text-center text-xs w-[50px] font-bold text-gray-700 bg-gray-100 h-10 whitespace-nowrap px-2">Ghế</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendedList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Chưa có đại biểu nào điểm danh.</TableCell></TableRow>
                ) : (
                  attendedList.map((delegate, index) => (
                    <TableRow key={index} className="hover:bg-green-50/30 transition-colors">
                      <TableCell className="text-center font-medium text-gray-500 text-xs px-2">{index + 1}</TableCell>
                      <TableCell className="font-bold text-gray-900 text-sm px-2">{delegate.name}</TableCell>
                      <TableCell className="text-sm font-semibold text-orange-600 px-2">
                        {delegate.is_substituted ? delegate.substitute_name : ''}
                      </TableCell>
                      <TableCell className="text-gray-600 text-xs px-2">{delegate.unit}</TableCell>
                      <TableCell className="text-center text-gray-600 font-mono text-xs px-2 whitespace-nowrap">
                        {formatTime(delegate.checkin_time)}
                      </TableCell>
                      <TableCell className="text-center px-2">
                        <span className="inline-flex items-center justify-center px-1.5 py-1 text-xs font-bold rounded-md bg-green-100 text-green-800 border border-green-200">
                          {delegate.seat_number || '--'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right Column: Pending */}
        <Card className="border-red-200 shadow-sm h-[600px] flex flex-col">
          <CardHeader className="bg-red-50/80 border-b border-red-100 rounded-t-xl py-3 px-4 shrink-0">
            <CardTitle className="text-red-800 flex items-center gap-2 text-base">
              <UserX className="w-5 h-5" /> ĐẠI BIỂU CHƯA ĐẾN
            </CardTitle>
            <CardDescription className="text-red-600/80 text-xs">Danh sách cần đôn đốc tham dự hội nghị.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
            <Table className="relative min-w-[500px]">
              <TableHeader className="sticky top-0 z-20 bg-gray-100 shadow-[0_1px_0_0_#e5e7eb]">
                <TableRow className="hover:bg-gray-100">
                  <TableHead className="w-[50px] text-center text-xs font-bold text-gray-700 bg-gray-100 h-10 whitespace-nowrap">STT</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 bg-gray-100 h-10 min-w-[120px]">Họ và tên</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 bg-gray-100 h-10 min-w-[100px]">Đơn vị</TableHead>
                  <TableHead className="text-xs w-[100px] font-bold text-gray-700 bg-gray-100 h-10 whitespace-nowrap">Số điện thoại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-500">Tuyệt vời, tất cả đại biểu đã có mặt!</TableCell></TableRow>
                ) : (
                  pendingList.map((delegate, index) => (
                    <TableRow key={index} className="hover:bg-red-50/30 transition-colors">
                      <TableCell className="text-center font-medium text-gray-500 text-xs">{index + 1}</TableCell>
                      <TableCell className="font-bold text-gray-900 text-sm">{delegate.name}</TableCell>
                      <TableCell className="text-gray-600 text-xs">{delegate.unit}</TableCell>
                      <TableCell className="font-mono text-gray-600 text-xs">{delegate.phone || '---'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
