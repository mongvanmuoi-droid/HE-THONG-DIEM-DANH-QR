'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase/client'
import { generateAbsentDocx } from '@/lib/doc-export'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Delegate = Database['public']['Tables']['delegates']['Row']

export default function DelegateTable() {
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [meetingName, setMeetingName] = useState('')
  const [checkingInId, setCheckingInId] = useState<string | null>(null)

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

  const handleStatusChange = async (delegateId: string, newStatus: string) => {
    setCheckingInId(delegateId)
    try {
      const updateData: any = { status: newStatus }
      
      if (newStatus === 'Attended') {
        updateData.checkin_time = new Date().toISOString()
        // Chỉ cập nhật bàn thư ký nếu chưa có ghế
        const delegate = delegates.find(d => d.id === delegateId)
        if (!delegate?.seat_number) {
          updateData.seat_number = 'Bàn Thư Ký'
        }
      } else if (newStatus === 'Absent' || newStatus === 'Pending') {
        updateData.checkin_time = null
      }

      const { error } = await supabase
        .from('delegates')
        .update(updateData)
        .eq('id', delegateId)

      if (error) throw error

      toast.success('Cập nhật trạng thái thành công!')
      fetchDelegates()
    } catch (error) {
      console.error(error)
      toast.error('Có lỗi xảy ra khi cập nhật.')
    } finally {
      setCheckingInId(null)
    }
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newDelegate, setNewDelegate] = useState({ name: '', unit: '', seat_number: '', phone: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleAddDelegate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    
    // Thêm vào bảng delegates
    const { error } = await supabase.from('delegates').insert([
      { 
        name: newDelegate.name, 
        unit: newDelegate.unit, 
        seat_number: newDelegate.seat_number,
        phone: newDelegate.phone,
        status: 'Pending'
      }
    ])

    if (!error) {
      // Cập nhật hoặc thêm vào bảng seats nếu cần
      if (newDelegate.seat_number) {
        // Kiểm tra xem ghế đã có chưa, nếu chưa thì thêm vào
        const { data: seatData } = await supabase.from('seats').select('id').eq('seat_number', newDelegate.seat_number).single()
        if (!seatData) {
          await supabase.from('seats').insert([
            { seat_number: newDelegate.seat_number, status: 'Empty', delegate_name: newDelegate.name }
          ])
        }
      }
      
      setIsAddDialogOpen(false)
      setNewDelegate({ name: '', unit: '', seat_number: '', phone: '' })
      fetchDelegates()
    } else {
      alert('Có lỗi xảy ra khi thêm đại biểu.')
    }
    setIsAdding(false)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['STT', 'Họ và tên', 'Đơn vị', 'Số điện thoại']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'DanhSachDaiBieu_Mau.xlsx')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws) as any[]

        const delegatesToInsert = data.map((row) => {
          const normalizedRow: Record<string, any> = {}
          for (const key in row) {
            normalizedRow[key.trim().toLowerCase()] = row[key]
          }

          return {
            name: normalizedRow['họ và tên'] || normalizedRow['họ tên'] || normalizedRow['name'],
            unit: normalizedRow['đơn vị'] || normalizedRow['chi bộ'] || normalizedRow['phòng ban'] || 'Khách mời',
            phone: normalizedRow['số điện thoại'] || normalizedRow['sđt'] || normalizedRow['điện thoại'] ? String(normalizedRow['số điện thoại'] || normalizedRow['sđt'] || normalizedRow['điện thoại']) : null,
            status: 'Pending',
            seat_number: null
          }
        }).filter(d => d.name) // Filter out empty rows

        if (delegatesToInsert.length === 0) {
          alert('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng kiểm tra lại tên cột (Họ và tên, Đơn vị).')
          setIsImporting(false)
          return
        }

        const { error } = await supabase.from('delegates').insert(delegatesToInsert)

        if (error) {
          console.error(error)
          alert('Lỗi khi lưu vào cơ sở dữ liệu: ' + error.message)
        } else {
          alert(`Đã nhập thành công ${delegatesToInsert.length} đại biểu!`)
          fetchDelegates()
          setIsImportDialogOpen(false)
        }
      } catch (error) {
        console.error(error)
        alert('Lỗi khi đọc file Excel.')
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Danh sách đại biểu</CardTitle>
          <CardDescription>Quản lý và theo dõi trạng thái điểm danh của đại biểu.</CardDescription>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger render={<Button variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100" />}>Nhập từ Excel</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nhập danh sách từ Excel</DialogTitle>
                <DialogDescription>
                  Tải lên file Excel (.xlsx) chứa danh sách đại biểu.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <Button variant="link" onClick={downloadTemplate} className="px-0">
                  Tải file mẫu (Template)
                </Button>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <label htmlFor="excel-file" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Chọn file Excel
                  </label>
                  <input 
                    id="excel-file" 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {isImporting && <p className="text-sm text-muted-foreground mt-2">Đang xử lý...</p>}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={<Button variant="default" />}>Thêm Đại biểu</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Thêm Đại biểu mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDelegate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Họ và tên</label>
                  <input 
                    required 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Nguyễn Văn A"
                    value={newDelegate.name}
                    onChange={(e) => setNewDelegate({...newDelegate, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Đơn vị / Chi bộ</label>
                  <input 
                    required 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Chi bộ 1"
                    value={newDelegate.unit}
                    onChange={(e) => setNewDelegate({...newDelegate, unit: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Số ghế</label>
                  <input 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="A1"
                    value={newDelegate.seat_number}
                    onChange={(e) => setNewDelegate({...newDelegate, seat_number: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Số điện thoại</label>
                  <input 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="0901234567"
                    value={newDelegate.phone}
                    onChange={(e) => setNewDelegate({...newDelegate, phone: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isAdding}>
                  {isAdding ? 'Đang lưu...' : 'Lưu thông tin'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={handleExport} variant="outline">Xuất DS Vắng (DOCX)</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Đơn vị</TableHead>
              <TableHead>Số điện thoại</TableHead>
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
                <TableCell>{delegate.phone || '---'}</TableCell>
                <TableCell>{delegate.seat_number}</TableCell>
                <TableCell>
                  <Badge variant={delegate.status === 'Attended' ? 'default' : delegate.status === 'Absent' ? 'destructive' : 'secondary'} className={delegate.status === 'Attended' ? 'bg-green-600' : ''}>
                    {delegate.status === 'Attended' ? 'Đã điểm danh' : delegate.status === 'Absent' ? 'Vắng mặt' : 'Chưa điểm danh'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2 items-center">
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={delegate.status}
                    onChange={(e) => handleStatusChange(delegate.id, e.target.value)}
                    disabled={checkingInId === delegate.id}
                  >
                    <option value="Pending">Chưa điểm danh</option>
                    <option value="Attended">Điểm danh</option>
                    <option value="Absent">Báo vắng</option>
                  </select>
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
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={async () => {
                      if (confirm('Bạn có chắc chắn muốn xóa đại biểu này?')) {
                        await supabase.from('delegates').delete().eq('id', delegate.id)
                        fetchDelegates()
                      }
                    }}
                  >
                    Xóa
                  </Button>
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
