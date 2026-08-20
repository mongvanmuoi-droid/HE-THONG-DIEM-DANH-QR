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
  const [filteredDelegates, setFilteredDelegates] = useState<Delegate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDelegate, setSelectedDelegate] = useState<string>('')

  const [isSubstituted, setIsSubstituted] = useState(false)
  const [substituteName, setSubstituteName] = useState('')
  const [substituteUnit, setSubstituteUnit] = useState('')

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
      // 1. Fetch config FIRST
      const { data: configData } = await supabase.from('config').select('*').limit(1).single()
      if (!configData?.is_active) {
        setStatus('closed')
        setMessage('Hệ thống điểm danh hiện đang đóng. Vui lòng chờ thông báo từ ban tổ chức.')
        setLoading(false)
        return
      }
      setConfig(configData)

      // 2. Check if device is locked FOR THIS MEETING
      const lockKey = `device_checked_in_${configData.meeting_date || 'default'}_${configData.meeting_time || 'default'}`
      const isLocked = localStorage.getItem(lockKey)
      if (isLocked) {
        setStatus('error')
        setMessage('Thiết bị này đã được sử dụng để điểm danh cho cuộc họp này. Mỗi thiết bị chỉ được điểm danh một lần.')
        setLoading(false)
        return
      }

      // 2.5 Fetch seat status
      const { data: seatData } = await supabase.from('seats').select('status, delegate_name').eq('seat_number', seat).single()
      if (!seatData) {
        setStatus('error')
        setMessage('Mã QR không hợp lệ hoặc ghế không tồn tại.')
        setLoading(false)
        return
      }
      if (seatData.status !== 'Empty') {
        setStatus('error')
        setMessage(seatData.status === 'Reserved' ? 'Ghế này đã được đặt trước cho khách mời.' : `Ghế này đã có người ngồi (${seatData.delegate_name}).`)
        setLoading(false)
        return
      }

      // 3. Fetch all pending delegates
      const { data: delegateData } = await supabase
        .from('delegates')
        .select('*')
        .eq('status', 'Pending')
        .order('name', { ascending: true })

      if (!delegateData || delegateData.length === 0) {
        setStatus('error')
        setMessage('Không có đại biểu nào trong danh sách chờ.')
      } else {
        setDelegates(delegateData)
        setFilteredDelegates(delegateData)
      }
      setLoading(false)
    }

    init()
  }, [seat])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDelegates(delegates)
    } else {
      const lowerQuery = searchQuery.toLowerCase()
      setFilteredDelegates(
        delegates.filter(d => d.name.toLowerCase().includes(lowerQuery) || d.unit.toLowerCase().includes(lowerQuery))
      )
    }
  }, [searchQuery, delegates])

  const handleCheckin = async () => {
    if (!selectedDelegate || !seat) return
    setLoading(true)

    const delegateInfo = delegates.find(d => d.id === selectedDelegate)
    const finalDelegateName = isSubstituted ? `${substituteName} (Thay: ${delegateInfo?.name})` : delegateInfo?.name

    // Perform updates
    try {
      // 1. Update seats with concurrency control
      const { data: updatedSeat, error: seatError } = await supabase
        .from('seats')
        .update({ status: 'Occupied', delegate_name: finalDelegateName })
        .eq('seat_number', seat)
        .eq('status', 'Empty')
        .select()
        .single()

      if (seatError || !updatedSeat) {
        setStatus('error')
        setMessage('Rất tiếc, ghế này vừa bị người khác chọn trước bạn vài giây. Vui lòng chọn ghế khác.')
        setLoading(false)
        return
      }

      // 2. Update delegates
      await supabase
        .from('delegates')
        .update({
          status: 'Attended',
          checkin_time: new Date().toISOString(),
          seat_number: seat,
          is_substituted: isSubstituted,
          substitute_name: isSubstituted ? substituteName : null,
          substitute_unit: isSubstituted ? substituteUnit : null
        })
        .eq('id', selectedDelegate)

      // 3. Insert log
      await supabase
        .from('checkin_logs')
        .insert({
          delegate_id: selectedDelegate,
          delegate_name: finalDelegateName,
          seat_number: seat
        })

      // Lock device
      const lockKey = `device_checked_in_${config?.meeting_date || 'default'}_${config?.meeting_time || 'default'}`
      localStorage.setItem(lockKey, 'true')

      setStatus('success')
      setMessage(`Chào mừng ${isSubstituted ? 'đại biểu' : ''} ${finalDelegateName} đã đến tham dự hội nghị!`)
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
        <p className="text-yellow-600 font-semibold">
          {config?.meeting_date ? new Date(config.meeting_date).toLocaleDateString('vi-VN') : ''}
          {config?.meeting_time ? ` - ${config.meeting_time}` : ''}
        </p>
        <p className="text-sm text-gray-600">{config?.location}</p>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
          <p className="text-sm text-red-800 uppercase font-bold mb-1">Vị trí của bạn</p>
          <p className="text-4xl font-black text-red-700">{seat}</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700 uppercase">Tìm kiếm & Xác nhận đại biểu</label>
          <input
            type="text"
            placeholder="🔎 Nhập tên của bạn hoặc đơn vị..."
            className="w-full h-12 px-4 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-red-500 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {filteredDelegates.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDelegate(d.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedDelegate === d.id
                  ? 'border-red-600 bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-red-300'
                  }`}
              >
                <p className="font-bold text-lg text-gray-900">{d.name}</p>
                <p className="text-sm text-gray-600">{d.unit}</p>
              </div>
            ))}
            {filteredDelegates.length === 0 && (
              <p className="text-center text-gray-500 py-4">Không tìm thấy đại biểu phù hợp.</p>
            )}
          </div>

          {selectedDelegate && (
            <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-6 h-6 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  checked={isSubstituted}
                  onChange={(e) => setIsSubstituted(e.target.checked)}
                />
                <span className="text-gray-900 font-bold">Tôi là NGƯỜI ĐI THAY</span>
              </label>

              {isSubstituted && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên người đi thay</label>
                    <input
                      type="text"
                      placeholder="Nhập họ và tên của bạn..."
                      className="w-full h-10 px-3 rounded-md border border-gray-300 focus:border-red-500 focus:ring-red-500"
                      value={substituteName}
                      onChange={(e) => setSubstituteName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Đơn vị người đi thay</label>
                    <input
                      type="text"
                      placeholder="Nhập đơn vị của bạn..."
                      className="w-full h-10 px-3 rounded-md border border-gray-300 focus:border-red-500 focus:ring-red-500"
                      value={substituteUnit}
                      onChange={(e) => setSubstituteUnit(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full h-14 text-lg font-bold bg-red-700 hover:bg-red-800 text-yellow-400 border border-yellow-500 shadow-lg"
          onClick={handleCheckin}
          disabled={loading || !selectedDelegate || (isSubstituted && (!substituteName.trim() || !substituteUnit.trim()))}
        >
          {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐIỂM DANH'}
        </Button>
      </CardFooter>
    </Card>
  )
}
