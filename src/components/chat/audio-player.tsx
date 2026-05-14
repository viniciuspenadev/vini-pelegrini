"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Loader2 } from "lucide-react"

interface Props {
  src:      string
  incoming: boolean
}

const SPEEDS = [1, 1.5, 2]

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00"
  const min = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${min}:${sec.toString().padStart(2, "0")}`
}

export function AudioPlayer({ src, incoming }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent]   = useState(0)
  const [speedIdx, setSpeedIdx] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded   = () => setDuration(audio.duration)
    const onTime     = () => setCurrent(audio.currentTime)
    const onEnded    = () => { setPlaying(false); setCurrent(0); audio.currentTime = 0 }
    const onWaiting  = () => setLoading(true)
    const onPlaying  = () => setLoading(false)

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate",    onTime)
    audio.addEventListener("ended",         onEnded)
    audio.addEventListener("waiting",       onWaiting)
    audio.addEventListener("playing",       onPlaying)
    audio.addEventListener("canplay",       onPlaying)

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate",    onTime)
      audio.removeEventListener("ended",         onEnded)
      audio.removeEventListener("waiting",       onWaiting)
      audio.removeEventListener("playing",       onPlaying)
      audio.removeEventListener("canplay",       onPlaying)
    }
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    const track = trackRef.current
    if (!audio || !track || !duration) return
    const rect = track.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = duration * pct
    setCurrent(audio.currentTime)
  }

  function cycleSpeed() {
    const audio = audioRef.current
    if (!audio) return
    const next = (speedIdx + 1) % SPEEDS.length
    audio.playbackRate = SPEEDS[next]
    setSpeedIdx(next)
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  // Color scheme conforme direção
  const colors = incoming
    ? {
        bg:        "bg-slate-50",
        track:     "bg-slate-200",
        progress:  "bg-blue-500",
        thumb:     "bg-blue-500",
        playBg:    "bg-blue-600 hover:bg-blue-700 text-white",
        text:      "text-slate-500",
        speedBg:   "bg-white text-slate-600 hover:bg-slate-100 border-slate-200",
      }
    : {
        bg:        "bg-blue-500/20",
        track:     "bg-blue-400/30",
        progress:  "bg-white",
        thumb:     "bg-white",
        playBg:    "bg-white hover:bg-blue-50 text-blue-600",
        text:      "text-blue-100",
        speedBg:   "bg-blue-400/40 text-blue-100 hover:bg-blue-400/60 border-blue-300/30",
      }

  return (
    <div className={`flex items-center gap-3 ${colors.bg} rounded-xl px-3 py-2 min-w-[240px] -mx-1 mb-1`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <button
        type="button"
        onClick={toggle}
        className={`size-9 rounded-full shrink-0 flex items-center justify-center transition-colors ${colors.playBg}`}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : playing ? (
          <Pause className="size-4 fill-current" strokeWidth={0} />
        ) : (
          <Play className="size-4 fill-current ml-0.5" strokeWidth={0} />
        )}
      </button>

      {/* Track + time */}
      <div className="flex-1 min-w-0">
        <div
          ref={trackRef}
          onClick={seek}
          className={`relative h-1 rounded-full cursor-pointer ${colors.track}`}
        >
          <div
            className={`absolute left-0 top-0 h-full rounded-full ${colors.progress}`}
            style={{ width: `${pct}%` }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 size-3 rounded-full shadow-sm ${colors.thumb}`}
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
        <div className={`flex items-center justify-between mt-1 text-[10px] tabular-nums ${colors.text}`}>
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed */}
      <button
        type="button"
        onClick={cycleSpeed}
        className={`text-[10px] font-bold border rounded-full px-1.5 py-0.5 shrink-0 transition-colors ${colors.speedBg}`}
      >
        {SPEEDS[speedIdx]}x
      </button>
    </div>
  )
}
