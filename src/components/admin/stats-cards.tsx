'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, UserCheck, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type PendingDelegate = {
  name: string
  unit: string
  phone: string | null
}

export default function StatsCards() {
  const [stats, setStats] = useState({ total: 0, attended: 0, pending: 0 })
  const [pendingList, setPendingList] = useState<PendingDelegate[]>([])

  useEffect(() => {
    fetchStats()
    
    const channel = supabase
      .channel('delegates_changes_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delegates' }, fetchStats)
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchStats = async () => {
    const { data } = await supabase.from('delegates').select('status, name, unit, phone').order('name', { ascending: true })
    if (data) {
      const total = data.length
      const attended = data.filter(d => d.status === 'Attended').length
      setStats({
        total,
        attended,
        pending: total - attended
      })
      
      setPendingList(data.filter(d => d.status === 'Pending'))
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

      {pendingList.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50 border-b border-red-100 rounded-t-xl">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <UserX className="w-5 h-5" /> Danh sách Đại biểu chưa đến
            </CardTitle>
            <CardDescription className="text-red-600/80">Danh sách cần đôn đốc tham dự hội nghị.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[50px] text-center">STT</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingList.map((delegate, index) => (
                  <TableRow key={index} className="hover:bg-red-50/50 transition-colors">
                    <TableCell className="text-center font-medium text-gray-500">{index + 1}</TableCell>
                    <TableCell className="font-bold text-gray-900">{delegate.name}</TableCell>
                    <TableCell className="text-gray-600">{delegate.unit}</TableCell>
                    <TableCell className="font-mono text-gray-600">{delegate.phone || '---'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
