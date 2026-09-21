import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { RoomClient } from '@/components/RoomClient'
import { isValidRoomId, normalizeRoomId } from '@/game/protocol'

type Props = { params: Promise<{ roomId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = await params
  return { title: `غرفة ${normalizeRoomId(roomId)}` }
}

export default async function RoomPage({ params }: Props) {
  const { roomId } = await params
  const id = normalizeRoomId(roomId)

  if (!isValidRoomId(id)) notFound()
  // Canonicalise casing so /room/abc and /room/ABC are the same table.
  if (id !== roomId) redirect(`/room/${id}`)

  return <RoomClient roomId={id} />
}
