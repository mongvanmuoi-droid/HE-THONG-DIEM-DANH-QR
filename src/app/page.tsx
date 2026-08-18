import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Hệ thống Điểm danh QR</h1>
        <p className="text-gray-600 mb-8">Vui lòng chọn chức năng truy cập bên dưới.</p>
        
        <div className="space-y-4">
          <Link href="/checkin" className="block w-full">
            <Button className="w-full h-12 text-lg" variant="default">
              Màn hình Điểm danh
            </Button>
          </Link>
          
          <Link href="/admin" className="block w-full">
            <Button className="w-full h-12 text-lg" variant="outline">
              Trang Quản trị (Admin)
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
