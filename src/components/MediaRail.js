'use client'

import { useCallback, useEffect, useState, Children } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Carousel rail (Embla): snap scrolling, drag/swipe on mobile,
// arrow buttons on desktop. Slides size themselves via slideClass.
export default function MediaRail({ children, slideClass = 'flex-[0_0_224px] min-w-0', label = 'items' }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps', slidesToScroll: 1 })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const count = Children.count(children)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    emblaApi?.reInit()
  }, [emblaApi, count])

  return (
    <div className="group/rail relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-3 px-1 py-1">
          {Children.map(children, (child, i) => (
            <div key={child?.key ?? i} className={slideClass}>{child}</div>
          ))}
        </div>
      </div>
      {canPrev && (
        <button onClick={() => emblaApi?.scrollPrev()} aria-label={`Previous ${label}`}
          className="absolute left-0 top-1/3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 shadow-md hover:bg-muted md:flex">
          <ChevronLeft className="size-5" />
        </button>
      )}
      {canNext && (
        <button onClick={() => emblaApi?.scrollNext()} aria-label={`Next ${label}`}
          className="absolute right-0 top-1/3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 shadow-md hover:bg-muted md:flex">
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  )
}
