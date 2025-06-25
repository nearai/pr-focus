import Image from 'next/image'
import Link from 'next/link'

export default function NearAiBadge() {
  return (
    <Link
      href="https://near.ai"
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
    >
      <span>powered by NEAR AI</span>
      <Image
        src="/dragon-logo.png"
        alt="NEAR AI Logo"
        width={80}
        height={80}
      />
    </Link>
  )
}
