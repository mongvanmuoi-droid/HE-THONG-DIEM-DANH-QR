'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase/client'
import { generateAbsentDocx } from '@/lib/doc-export'
import type { Database } from '@/types/database'

type Delegate = Database['public']['Tables']['delegates']['Row']

export default function DelegateTable() {
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [meetingName, setMeetingName] = useState('')

  useEffect(() => {
    fetchDelegates()
    fetchConfig()

    const channel = supabase
      .channel('delegates_changes_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delegates' }, fetchDelegates)
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchDelegates = async () => {
    const { data } = await supabase.from('delegates').select('*').order('name', { ascending: true })
    if (data) setDelegates(data)
  }

  const fetchConfig = async () => {
    const { data } = await supabase.from('config').select('meeting_name').limit(1).single()
    if (data && data.meeting_name) setMeetingName(data.meeting_name)
  }

  const handleExport = () => {
    const absentDelegates = delegates.filter(d => d.status === 'Pending')
    generateAbsentDocx(absentDelegates, meetingName || 'Hội nghị')
  }

  const getCheckinUrl = (seatNumber: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/checkin?seat=${seatNumber}`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Danh sách đại biểu</CardTitle>
          <CardDescription>Quản lý và theo dõi trạng thái điểm danh của đại biểu.</CardDescription>
        </div>
        <Button onClick={handleExport} variant="outline">Xuất DS Vắng mặt (DOCX)</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead>Ghế</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {delegates.map((delegate) => (
              <TableRow key={delegate.id}>
                <TableCell className="font-medium">{delegate.name}</TableCell>
                <TableCell>{delegate.unit}</TableCell>
                <TableCell>{delegate.seat_number}</TableCell>
                <TableCell>
                  <Badge variant={delegate.status === 'Attended' ? 'default' : 'secondary'} className={delegate.status === 'Attended' ? 'bg-green-600' : ''}>
                    {delegate.status === 'Attended' ? 'Đã điểm danh' : 'Chưa điểm danh'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {delegate.seat_number && (
                    <Dialog>
                      <DialogTrigger render={<Button variant="outline" size="sm" />}>
                        Tạo mã QR
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-8">
                        <DialogHeader>
                          <DialogTitle className="text-center mb-4">Mã QR Điểm Danh - Ghế {delegate.seat_number}</DialogTitle>
                        </DialogHeader>
                        <div className="bg-white p-4 rounded-xl border-2 border-gray-100">
                          <QRCodeSVG 
                            value={getCheckinUrl(delegate.seat_number)} 
                            size={256}
                            level="H"
                            includeMargin={true}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-4 text-center">
                          Đại biểu: {delegate.name} <br/>
                          Quét mã để điểm danh vào ghế {delegate.seat_number}
                        </p>
                      </DialogContent>
                    </Dialog>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {delegates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">Chưa có đại biểu nào.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
