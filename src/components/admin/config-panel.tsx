'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, Trash2, Printer, LayoutGrid } from 'lucide-react'
import type { Database } from '@/types/database'

type Config = Database['public']['Tables']['config']['Row']
type Seat = Database['public']['Tables']['seats']['Row']

export default function ConfigPanel() {
  const [config, setConfig] = useState<Config | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConfig()
    fetchSeats()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    const { data } = await supabase.from('config').select('*').limit(1).single()
    if (data) {
      setConfig(data)
    } else {
      const { data: newData } = await supabase.from('config').insert({ is_active: false, meeting_name: 'Hội nghị', location: '', meeting_time: '08:00' }).select().single()
      if (newData) setConfig(newData)
    }
    setLoading(false)
  }

  const fetchSeats = async () => {
    const { data } = await supabase.from('seats').select('*')
    if (data) {
      const sorted = data.sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number))
      setSeats(sorted)
    }
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    const { error } = await supabase
      .from('config')
      .update({
        meeting_name: config.meeting_name,
        meeting_date: config.meeting_date,
        meeting_time: config.meeting_time,
        location: config.location,
        is_active: config.is_active
      })
      .eq('id', config.id)

    if (error) toast.error('Lỗi khi lưu cấu hình')
    else toast.success('Đã lưu cấu hình thành công!')
    setSaving(false)
  }

  const handleGenerateSeats = async () => {
    if (!confirm('Hành động này sẽ XÓA TOÀN BỘ dữ liệu ghế hiện tại và tạo lại 280 ghế theo cấu hình chuẩn. Bạn có chắc chắn?')) return
    setIsGenerating(true)
    try {
      const { error: delError } = await supabase.from('seats').delete().neq('seat_number', 'impossible_value')
      if (delError) throw new Error(delError.message)
      
      const newSeats: Partial<Seat>[] = []
      for (let i = 1; i <= 32; i++) newSeats.push({ seat_number: i.toString(), status: 'Reserved' })
      for (let i = 33; i <= 280; i++) newSeats.push({ seat_number: i.toString(), status: 'Empty' })

      const chunkSize = 100
      for (let i = 0; i < newSeats.length; i += chunkSize) {
        const chunk = newSeats.slice(i, i + chunkSize)
        const { error: insError } = await supabase.from('seats').insert(chunk)
        if (insError) throw new Error(insError.message)
      }
      alert('Đã khởi tạo thành công 280 ghế!')
      fetchSeats()
    } catch (err: any) {
      alert('Có lỗi xảy ra: ' + err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrintQRs = () => {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>In Mã QR</title>
            <style>
              body { font-family: sans-serif; margin: 0; padding: 20px; }
              .qr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
              .qr-item { text-align: center; border: 1px dashed #ccc; padding: 15px; page-break-inside: avoid; }
              .qr-item p { font-size: 24px; font-weight: bold; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="qr-grid">${content}</div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handleResetMeeting = async () => {
    if (!confirm('CẢNH BÁO NGUY HIỂM: Hành động này sẽ xóa toàn bộ Danh sách đại biểu, Lịch sử điểm danh và làm trống mọi ghế ngồi. Thao tác này không thể hoàn tác. Bạn đã chắc chắn xuất dữ liệu cũ ra Excel trước khi làm việc này chưa?')) return
    if (!confirm('Bạn có chắc chắn 100% muốn xóa sạch dữ liệu để tổ chức hội nghị mới?')) return

    try {
      await supabase.from('delegates').delete().neq('id', 'impossible_value')
      await supabase.from('checkin_logs').delete().neq('id', 'impossible_value')
      await supabase.from('seats').update({ status: 'Empty', delegate_name: null }).neq('status', 'Empty_impossible_value')
      alert('Đã dọn dẹp sạch sẽ hệ thống. Hệ thống đã sẵn sàng cho hội nghị mới!')
    } catch (e: any) {
      alert('Lỗi: ' + e.message)
    }
  }

  const getCheckinUrl = (seatNumber: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/checkin?seat=${seatNumber}`
  }

  if (loading) return <div>Đang tải...</div>
  if (!config) return <div>Chưa có cấu hình.</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình cuộc họp</CardTitle>
          <CardDescription>Thiết lập thông tin hiển thị trên trang điểm danh.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 pb-4 border-b">
            <Switch 
              id="active-mode" 
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
            />
            <Label htmlFor="active-mode" className="font-bold">
              Trạng thái điểm danh (Bật/Tắt)
            </Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting_name">Tên cuộc họp</Label>
            <Input 
              id="meeting_name" 
              value={config.meeting_name || ''} 
              onChange={(e) => setConfig({ ...config, meeting_name: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting_date">Ngày họp (Thay đổi ngày/giờ sẽ tự động reset thiết bị đã điểm danh)</Label>
            <Input 
              id="meeting_date" 
              type="date"
              value={config.meeting_date || ''} 
              onChange={(e) => setConfig({ ...config, meeting_date: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting_time">Giờ họp</Label>
            <Input 
              id="meeting_time" 
              type="time"
              value={config.meeting_time || ''} 
              onChange={(e) => setConfig({ ...config, meeting_time: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Địa điểm</Label>
            <Input 
              id="location" 
              value={config.location || ''} 
              onChange={(e) => setConfig({ ...config, location: e.target.value })}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving} className="bg-red-700 hover:bg-red-800 text-white">
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-100 rounded-t-xl">
          <CardTitle className="text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Vùng nguy hiểm (Danger Zone)
          </CardTitle>
          <CardDescription className="text-red-600/80">Các công cụ quản trị hệ thống cấp cao.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-bold text-gray-900 flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Khởi tạo Sơ đồ ghế</p>
              <p className="text-sm text-gray-500">Tạo lại 280 ghế (32 Reserved, 248 Empty).</p>
            </div>
            <Button variant="outline" onClick={handleGenerateSeats} disabled={isGenerating}>
              {isGenerating ? 'Đang tạo...' : 'Khởi tạo 280 ghế'}
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-bold text-gray-900 flex items-center gap-2"><Printer className="w-4 h-4" /> In Mã QR Ghế</p>
              <p className="text-sm text-gray-500">In mã QR cho 280 ghế để dán lên ghế.</p>
            </div>
            <Button variant="outline" onClick={handlePrintQRs} disabled={seats.length === 0}>
              In hàng loạt mã QR
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 border border-red-200 bg-red-50/50 rounded-lg">
            <div>
              <p className="font-bold text-red-700 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Reset Hệ Thống Hội Nghị</p>
              <p className="text-sm text-red-600">Xóa toàn bộ đại biểu, lịch sử điểm danh để làm hội nghị mới.</p>
            </div>
            <Button variant="destructive" onClick={handleResetMeeting}>
              Xóa sạch dữ liệu cũ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden QR Codes for printing */}
      <div className="hidden">
        <div ref={printRef}>
          {seats.map(seat => (
            <div key={seat.seat_number} className="qr-item">
              <QRCodeSVG 
                value={getCheckinUrl(seat.seat_number)} 
                size={200}
                level="H"
                includeMargin={true}
              />
              <p>Ghế {seat.seat_number}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
