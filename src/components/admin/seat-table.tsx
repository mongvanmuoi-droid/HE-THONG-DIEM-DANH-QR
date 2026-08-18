'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

type Seat = {
  id?: string
  seat_number: string
  status: 'Empty' | 'Occupied' | 'Reserved'
  delegate_name?: string | null
}

export default function SeatMap() {
  const [seats, setSeats] = useState<Seat[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSeats()

    const channel = supabase
      .channel('seats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, fetchSeats)
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchSeats = async () => {
    // Need to cast the order column or fetch it as a number if it's text.
    // Since seat_number is TEXT ("1", "2", "10"), simple string order might be "1", "10", "2".
    // We will sort it in memory for perfection.
    const { data } = await supabase.from('seats').select('*')
    if (data) {
      const sorted = data.sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number))
      setSeats(sorted as Seat[])
    }
  }

  const handleGenerateSeats = async () => {
    if (!confirm('Hành động này sẽ XÓA TOÀN BỘ dữ liệu ghế hiện tại và tạo lại 280 ghế theo cấu hình chuẩn. Bạn có chắc chắn?')) return
    
    setIsGenerating(true)
    try {
      // Clear existing
      const { error: delError } = await supabase.from('seats').delete().neq('seat_number', 'impossible_value') // delete all
      if (delError) throw new Error(delError.message)
      
      const newSeats: Seat[] = []
      
      // Hàng 1-2: Ghế 1-32 (Reserved)
      for (let i = 1; i <= 32; i++) {
        newSeats.push({ seat_number: i.toString(), status: 'Reserved' })
      }
      
      // Hàng 3-16: Ghế 33-280 (Empty)
      for (let i = 33; i <= 280; i++) {
        newSeats.push({ seat_number: i.toString(), status: 'Empty' })
      }

      // Insert in chunks to avoid size limits
      const chunkSize = 100
      for (let i = 0; i < newSeats.length; i += chunkSize) {
        const chunk = newSeats.slice(i, i + chunkSize)
        const { error: insError } = await supabase.from('seats').insert(chunk)
        if (insError) throw new Error(insError.message)
      }

      alert('Đã khởi tạo thành công 280 ghế!')
      fetchSeats()
    } catch (err: any) {
      console.error(err)
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
            <script>
              window.onload = () => { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  // Render Logic
  const renderRow = (startSeat: number, count: number, rowNum: number) => {
    const rowSeats = seats.filter(s => {
      const num = parseInt(s.seat_number)
      return num >= startSeat && num < startSeat + count
    })
    
    // Safety check if seats are not generated yet
    if (rowSeats.length === 0) return null

    const half = count / 2
    const leftBlock = rowSeats.slice(0, half)
    const rightBlock = rowSeats.slice(half, count)

    return (
      <div key={rowNum} className="flex justify-center items-center gap-8 mb-4 w-full">
        <div className="w-8 text-center font-bold text-gray-400">R{rowNum}</div>
        
        {/* Left Block */}
        <div className="flex gap-2 justify-end flex-1">
          {leftBlock.map(seat => <SeatIcon key={seat.seat_number} seat={seat} />)}
        </div>
        
        {/* Lối đi (Aisle) */}
        <div className="w-12 border-x border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-400">Lối đi</div>
        
        {/* Right Block */}
        <div className="flex gap-2 justify-start flex-1">
          {rightBlock.map(seat => <SeatIcon key={seat.seat_number} seat={seat} />)}
        </div>
        
        <div className="w-8 text-center font-bold text-gray-400">R{rowNum}</div>
      </div>
    )
  }

  const SeatIcon = ({ seat }: { seat: Seat }) => {
    let bgColor = 'bg-gray-200 border-gray-300' // Empty
    let title = `Ghế ${seat.seat_number} - Trống`
    if (seat.status === 'Reserved') {
      bgColor = 'bg-yellow-400 border-yellow-500'
      title = `Ghế ${seat.seat_number} - Đặt trước`
    } else if (seat.status === 'Occupied') {
      bgColor = 'bg-blue-600 border-blue-700 text-white'
      title = `Ghế ${seat.seat_number} - ${seat.delegate_name}`
    }

    return (
      <div 
        className={`w-8 h-8 md:w-10 md:h-10 rounded-t-lg rounded-b-sm border-2 flex items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-110 ${bgColor}`}
        title={title}
      >
        {seat.seat_number}
      </div>
    )
  }

  const getCheckinUrl = (seatNumber: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/checkin?seat=${seatNumber}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Sơ đồ Hội trường (Live Map)</CardTitle>
            <CardDescription>Giám sát vị trí ngồi trực tiếp. (Tổng: 280 ghế)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleGenerateSeats} disabled={isGenerating}>
              {isGenerating ? 'Đang tạo...' : 'Khởi tạo 280 ghế chuẩn'}
            </Button>
            <Button variant="outline" onClick={handlePrintQRs} disabled={seats.length === 0}>
              In Mã QR 280 Ghế
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Chú giải */}
          <div className="flex justify-center gap-6 mb-8 text-sm font-medium">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded"></div> Ghế Trống</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded"></div> Đặt trước (Reserved)</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-600 border border-blue-700 rounded"></div> Đã có người ngồi</div>
          </div>

          {/* Sân khấu */}
          <div className="w-full max-w-2xl mx-auto h-16 bg-red-800 text-white font-bold text-xl flex items-center justify-center rounded-b-3xl shadow-lg mb-12">
            SÂN KHẤU / KHU VỰC ĐẠI BIỂU CẤP CAO
          </div>

          {/* Sơ đồ ghế */}
          <div className="overflow-x-auto pb-8">
            <div className="min-w-[800px]">
              {seats.length === 0 ? (
                <div className="text-center text-gray-500 py-10">Chưa có dữ liệu ghế. Bấm "Khởi tạo 280 ghế" để bắt đầu.</div>
              ) : (
                <>
                  {/* Hàng 1-4: 16 ghế/hàng */}
                  {renderRow(1, 16, 1)}
                  {renderRow(17, 16, 2)}
                  {renderRow(33, 16, 3)}
                  {renderRow(49, 16, 4)}
                  
                  <div className="w-full border-t-2 border-dashed border-gray-200 my-6"></div>

                  {/* Hàng 5-16: 18 ghế/hàng */}
                  {renderRow(65, 18, 5)}
                  {renderRow(83, 18, 6)}
                  {renderRow(101, 18, 7)}
                  {renderRow(119, 18, 8)}
                  {renderRow(137, 18, 9)}
                  {renderRow(155, 18, 10)}
                  {renderRow(173, 18, 11)}
                  {renderRow(191, 18, 12)}
                  {renderRow(209, 18, 13)}
                  {renderRow(227, 18, 14)}
                  {renderRow(245, 18, 15)}
                  {renderRow(263, 18, 16)}
                </>
              )}
            </div>
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
