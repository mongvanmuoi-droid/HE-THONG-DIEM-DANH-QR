'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function StatsCards() {
  const [stats, setStats] = useState({ total: 0, attended: 0, pending: 0 })

  useEffect(() => {
    fetchStats()
    
    // Optional: Add real-time subscription
    const channel = supabase
      .channel('delegates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delegates' }, fetchStats)
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchStats = async () => {
    const { data } = await supabase.from('delegates').select('status')
    if (data) {
      const total = data.length
      const attended = data.filter(d => d.status === 'Attended').length
      setStats({
        total,
        attended,
        pending: total - attended
      })
    }
  }

  return (
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
  )
}
