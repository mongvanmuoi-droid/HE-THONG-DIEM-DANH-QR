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
  const [showSeatForm, setShowSeatForm] = useState(false)
  const [totalSeats, setTotalSeats] = useState(280)
  const [vipSeats, setVipSeats] = useState('1-32')
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

  const parseVipSeats = (input: string): Set<number> => {
    const vips = new Set<number>()
    const parts = input.split(',').map(s => s.trim()).filter(s => s)
    for (const p of parts) {
      if (p.includes('-')) {
        const [startStr, endStr] = p.split('-')
        const start = parseInt(startStr)
        const end = parseInt(endStr)
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) vips.add(i)
        }
      } else {
        const num = parseInt(p)
        if (!isNaN(num)) vips.add(num)
      }
    }
    return vips
  }

  const handleGenerateSeatsCustom = async () => {
    if (!confirm(`CẢNH BÁO: Bạn sắp XÓA TOÀN BỘ dữ liệu ghế hiện tại và tạo mới ${totalSeats} ghế. Bạn có chắc chắn?`)) return
    setIsGenerating(true)
    try {
      const { error: delError } = await supabase.from('seats').delete().not('id', 'is', null)
      if (delError) throw new Error(delError.message)
      
      const vips = parseVipSeats(vipSeats)
      const newSeats: Partial<Seat>[] = []
      
      for (let i = 1; i <= totalSeats; i++) {
        newSeats.push({ 
          seat_number: i.toString(), 
          status: vips.has(i) ? 'Reserved' : 'Empty' 
        })
      }

      const chunkSize = 100
      for (let i = 0; i < newSeats.length; i += chunkSize) {
        const chunk = newSeats.slice(i, i + chunkSize)
        const { error: insError } = await supabase.from('seats').insert(chunk)
        if (insError) throw new Error(insError.message)
      }
      alert(`Đã khởi tạo thành công ${totalSeats} ghế!`)
      fetchSeats()
      setShowSeatForm(false)
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
              body { font-family: sans-serif; margin: 0; padding: 5mm; text-align: center; }
              .qr-grid { display: block; }
              .qr-item { 
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 1px dashed #999; 
                margin: 2mm;
                width: 3.5cm;
                height: 4cm;
                box-sizing: border-box;
                page-break-inside: avoid; 
                break-inside: avoid;
                overflow: hidden;
              }
              .qr-item svg {
                width: 3cm !important;
                height: 3cm !important;
              }
              .qr-item p { font-size: 13px; font-weight: bold; margin-top: 2px; margin-bottom: 0; }
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
      const { error: err2 } = await supabase.from('checkin_logs').delete().not('id', 'is', null)
      if (err2) throw new Error('Lỗi xóa lịch sử: ' + err2.message)

      const { error: err1 } = await supabase.from('delegates').delete().not('id', 'is', null)
      if (err1) throw new Error('Lỗi xóa đại biểu: ' + err1.message)

      const { error: err3 } = await supabase.from('seats').update({ status: 'Empty', delegate_name: null }).eq('status', 'Occupied')
      if (err3) throw new Error('Lỗi reset ghế: ' + err3.message)

      const { error: err4 } = await supabase.from('seats').update({ delegate_name: null }).eq('status', 'Reserved')
      if (err4) throw new Error('Lỗi reset tên ghế VIP: ' + err4.message)

      alert('Đã dọn dẹp sạch sẽ hệ thống. Hệ thống đã sẵn sàng cho hội nghị mới!')
      fetchSeats()
    } catch (e: any) {
      alert(e.message)
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
          <div className="flex flex-col gap-4 p-4 border border-gray-200 rounded-lg">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Khởi tạo Sơ đồ ghế</p>
                <p className="text-sm text-gray-500">Tùy chỉnh số lượng ghế và các vị trí ghế VIP đặt trước.</p>
              </div>
              <Button variant="outline" onClick={() => setShowSeatForm(!showSeatForm)}>
                {showSeatForm ? 'Hủy bỏ' : 'Thiết lập sơ đồ'}
              </Button>
            </div>
            
            {showSeatForm && (
              <div className="mt-2 p-4 bg-gray-50 rounded-md border border-gray-200 space-y-4">
                <div className="grid gap-2">
                  <Label>Tổng số lượng ghế hội trường</Label>
                  <Input 
                    type="number" 
                    value={totalSeats} 
                    onChange={e => setTotalSeats(parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Các ghế VIP đặt trước (Phân cách bằng dấu phẩy, dùng dấu gạch ngang cho khoảng)</Label>
                  <Input 
                    type="text" 
                    value={vipSeats} 
                    onChange={e => setVipSeats(e.target.value)} 
                    placeholder="VD: 1-32, 40, 50"
                  />
                </div>
                <Button 
                  onClick={handleGenerateSeatsCustom} 
                  disabled={isGenerating || totalSeats <= 0} 
                  className="w-full bg-gray-900 text-white hover:bg-gray-800"
                >
                  {isGenerating ? 'Đang khởi tạo...' : `Tạo mới ${totalSeats} ghế`}
                </Button>
              </div>
            )}
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
