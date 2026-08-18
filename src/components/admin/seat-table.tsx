'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Seat = Database['public']['Tables']['seats']['Row']

export default function SeatTable() {
  const [seats, setSeats] = useState<Seat[]>([])

  useEffect(() => {
    fetchSeats()

    const channel = supabase
      .channel('seats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, fetchSeats)
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchSeats = async () => {
    const { data } = await supabase.from('seats').select('*').order('seat_number', { ascending: true })
    if (data) setSeats(data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh sách chỗ ngồi</CardTitle>
        <CardDescription>Theo dõi trạng thái các ghế trong hội trường.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Ghế</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Người ngồi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seats.map((seat) => (
              <TableRow key={seat.id}>
                <TableCell className="font-bold">{seat.seat_number}</TableCell>
                <TableCell>
                  <Badge variant={seat.status === 'Occupied' ? 'default' : 'outline'} className={seat.status === 'Occupied' ? 'bg-blue-600' : 'text-gray-500'}>
                    {seat.status === 'Occupied' ? 'Đã có người ngồi' : 'Trống'}
                  </Badge>
                </TableCell>
                <TableCell className={seat.delegate_name ? 'font-medium' : 'text-gray-400 italic'}>
                  {seat.delegate_name || '---'}
                </TableCell>
              </TableRow>
            ))}
            {seats.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-gray-500">Chưa có dữ liệu ghế.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
