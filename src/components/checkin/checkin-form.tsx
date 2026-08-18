'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { Database } from '@/types/database'

type Delegate = Database['public']['Tables']['delegates']['Row']

export default function CheckinForm() {
  const searchParams = useSearchParams()
  const seat = searchParams.get('seat')
  
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<any>(null)
  const [delegates, setDelegates] = useState<Delegate[]>([])
  const [selectedDelegate, setSelectedDelegate] = useState<string>('')
  
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'closed' | 'already_checked_in'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!seat) {
      setStatus('error')
      setMessage('Không tìm thấy thông tin vị trí ghế. Vui lòng quét lại mã QR.')
      setLoading(false)
      return
    }

    const init = async () => {
      // 1. Check if device is locked
      const isLocked = localStorage.getItem('device_checked_in')
      if (isLocked) {
        setStatus('error')
        setMessage('Thiết bị này đã được sử dụng để điểm danh. Mỗi thiết bị chỉ được điểm danh một lần.')
        setLoading(false)
        return
      }

      // 2. Fetch config
      const { data: configData } = await supabase.from('config').select('*').limit(1).single()
      if (!configData?.is_active) {
        setStatus('closed')
        setMessage('Hệ thống điểm danh hiện đang đóng. Vui lòng chờ thông báo từ ban tổ chức.')
        setLoading(false)
        return
      }
      setConfig(configData)

      // 3. Fetch delegates for this seat
      const { data: delegateData } = await supabase
        .from('delegates')
        .select('*')
        .eq('seat_number', seat)

      if (!delegateData || delegateData.length === 0) {
        setStatus('error')
        setMessage('Không tìm thấy đại biểu nào được xếp vào ghế này.')
      } else {
        const pendingDelegates = delegateData.filter(d => d.status === 'Pending')
        if (pendingDelegates.length === 0) {
          setStatus('already_checked_in')
          setMessage('Ghế này đã được điểm danh.')
        } else {
          setDelegates(pendingDelegates)
          setSelectedDelegate(pendingDelegates[0].id)
        }
      }
      setLoading(false)
    }

    init()
  }, [seat])

  const handleCheckin = async () => {
    if (!selectedDelegate || !seat) return
    setLoading(true)

    const delegateInfo = delegates.find(d => d.id === selectedDelegate)
    
    // Perform updates
    try {
      // 1. Update delegates
      await supabase
        .from('delegates')
        .update({ status: 'Attended', checkin_time: new Date().toISOString() })
        .eq('id', selectedDelegate)

      // 2. Update seats
      await supabase
        .from('seats')
        .update({ status: 'Occupied', delegate_name: delegateInfo?.name })
        .eq('seat_number', seat)

      // 3. Insert log
      await supabase
        .from('checkin_logs')
        .insert({
          delegate_id: selectedDelegate,
          delegate_name: delegateInfo?.name,
          seat_number: seat
        })

      // Lock device
      localStorage.setItem('device_checked_in', 'true')
      
      setStatus('success')
      setMessage(`Chào mừng đại biểu ${delegateInfo?.name} đã đến tham dự hội nghị!`)
    } catch (err) {
      setStatus('error')
      setMessage('Có lỗi xảy ra trong quá trình điểm danh. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && status === 'idle') {
    return <div className="text-center font-bold text-red-800">Đang tải dữ liệu...</div>
  }

  if (status === 'success') {
    return (
      <Card className="border-4 border-yellow-500 shadow-xl bg-white/95">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <CheckCircle2 className="w-20 h-20 text-green-600" />
          <h2 className="text-2xl font-bold text-green-700 text-center">ĐIỂM DANH THÀNH CÔNG</h2>
          <p className="text-center text-gray-700 font-medium">{message}</p>
          <p className="text-center text-red-700 font-bold text-xl mt-4">Vị trí ghế: {seat}</p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'error' || status === 'closed' || status === 'already_checked_in') {
    return (
      <Card className="border-4 border-red-700 shadow-xl bg-white/95">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
          <AlertCircle className="w-20 h-20 text-red-600" />
          <h2 className="text-xl font-bold text-red-700 text-center uppercase">
            {status === 'closed' ? 'Hệ thống đóng' : 'Không thể điểm danh'}
          </h2>
          <p className="text-center text-gray-700 font-medium">{message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-4 border-red-700 shadow-xl bg-white/95 relative z-10">
      <CardHeader className="text-center border-b-2 border-yellow-500 pb-6">
        <CardTitle className="text-red-700 font-bold text-2xl uppercase tracking-wider mb-2">
          {config?.meeting_name || 'Hội nghị'}
        </CardTitle>
        <p className="text-yellow-600 font-semibold">{config?.meeting_date ? new Date(config.meeting_date).toLocaleDateString('vi-VN') : ''}</p>
        <p className="text-sm text-gray-600">{config?.location}</p>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
          <p className="text-sm text-red-800 uppercase font-bold mb-1">Vị trí của bạn</p>
          <p className="text-4xl font-black text-red-700">{seat}</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700 uppercase">Xác nhận đại biểu</label>
          <div className="space-y-2">
            {delegates.map((d) => (
              <div 
                key={d.id}
                onClick={() => setSelectedDelegate(d.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedDelegate === d.id 
                    ? 'border-red-600 bg-red-50 shadow-md' 
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <p className="font-bold text-lg text-gray-900">{d.name}</p>
                <p className="text-sm text-gray-600">{d.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full h-14 text-lg font-bold bg-red-700 hover:bg-red-800 text-yellow-400 border border-yellow-500 shadow-lg"
          onClick={handleCheckin}
          disabled={loading || !selectedDelegate}
        >
          {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐIỂM DANH'}
        </Button>
      </CardFooter>
    </Card>
  )
}
