import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginForm from '@/app/admin/login-form'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get('admin_auth')?.value === 'true'

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoginForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-[1600px] mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-4 justify-between items-center text-center sm:text-left">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 uppercase">Quản trị Hội nghị</h1>
            <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wider mt-1">Đảng uỷ xã Lục Yên, Tỉnh Lào Cai</p>
          </div>
          <form action="/admin/logout" method="post">
            <button type="submit" className="text-sm text-red-600 hover:text-red-800 font-medium bg-red-50 sm:bg-transparent px-4 py-2 sm:p-0 rounded-md">
              Đăng xuất
            </button>
          </form>
        </div>
      </header>
      <main>
        <div className="max-w-[1600px] mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
