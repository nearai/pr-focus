'use client'

import { useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function HomeContent() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to GitHub App page since it's now the only authentication method
    router.push('/github-app')
  }, [router])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          PR Focus
        </h1>
        <p className="text-gray-600">
          Redirecting to GitHub App...
        </p>
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            PR Focus
          </h1>
          <p className="text-gray-600">
            Loading...
          </p>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  )
}