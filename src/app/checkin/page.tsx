import { Suspense } from 'react'
import CheckinForm from '@/components/checkin/checkin-form'
import BrowserWarning from '@/components/checkin/browser-warning'

export default function CheckinPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF0] relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-8 border-l-8 border-red-700 m-4 rounded-tl-2xl"></div>
      <div className="absolute top-0 right-0 w-32 h-32 border-t-8 border-r-8 border-red-700 m-4 rounded-tr-2xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-8 border-l-8 border-red-700 m-4 rounded-bl-2xl"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-8 border-r-8 border-red-700 m-4 rounded-br-2xl"></div>

      <div className="z-10 w-full max-w-md">
        <BrowserWarning />
        <Suspense fallback={<div className="text-center font-bold text-red-800">Đang tải dữ liệu điểm danh...</div>}>
          <CheckinForm />
        </Suspense>
      </div>
    </div>
  )
}
