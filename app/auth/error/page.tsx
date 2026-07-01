import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const message =
    searchParams?.message?.replace(/_/g, ' ') || 'Something went wrong during sign-in.'

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-7 w-7 text-indigo-400" />
          <span className="text-xl font-bold">GEO Tracker</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Sign-in didn&rsquo;t complete</h1>
          <p className="text-sm text-zinc-400 mb-6 break-words">{message}</p>
          <Link
            href="/login"
            className="inline-block w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            Back to sign in
          </Link>
          <p className="text-xs text-zinc-500 mt-4">
            You can also{' '}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
              sign up with email
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
