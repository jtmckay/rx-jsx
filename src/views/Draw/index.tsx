import { css } from '@emotion/css';
import { animationFrameScheduler, from } from 'rxjs';
import { combineLatestWith, concatMap, filter, map, mergeWith, scan, share, switchMap, takeUntil } from 'rxjs/operators';
import { fromEventElement$, toElement$ } from '../../jsx';
import { Persistable, Tables } from '../../repositories';
import { _mapToPersistable_, _withIndexedDB_, _persist_, indexedDB$ } from '../../streams/repository';
import { viewport$ } from '../../streams/viewport';

function draw (canvasContext, stroke) {
  if (stroke.begin) {
    canvasContext.beginPath()
    canvasContext.moveTo(stroke.x, stroke.y)
    canvasContext.strokeStyle = '#000000'
    canvasContext.lineWidth = 2
    canvasContext.lineCap = 'round'
  }
  if (stroke.stroke) {
    canvasContext.lineTo(stroke.x, stroke.y)
    canvasContext.stroke()
  }
  if (stroke.close) {
    canvasContext.closePath()
  }
}

export default function ({ destruction$ }) {
  const [canvas$] = toElement$(destruction$)
  const [clear$] = toElement$(destruction$)

  const canvasContext$ = canvas$.pipe(
    map((canvas: any) => canvas.getContext('2d'))
  )
  
  const offset$ = viewport$.pipe(
    combineLatestWith(canvas$),
    concatMap(async ([_, canvas]) => {
      return await new Promise(resolve => {
        animationFrameScheduler.schedule(() => {
          const boundingClientRect = canvas.getBoundingClientRect()
          resolve({ x: boundingClientRect.left + window.pageXOffset, y: boundingClientRect.top + window.pageYOffset })
        })
      })
    })
  )

  const isStroke$ = fromEventElement$(canvas$, 'mousedown').pipe(
    mergeWith(fromEventElement$(canvas$, 'mouseup'), fromEventElement$(canvas$, 'mouseleave')),
    map(event => {
      if (event.type === 'mousedown') return true
      if (event.type === 'mouseup') return false
      if (event.type === 'mouseleave') return false
    })
  )

  const stroke$ = fromEventElement$(canvas$, 'mousemove').pipe(
    combineLatestWith(isStroke$, offset$),
    map(([mousemove, stroke, offset]: any) => ({ x: mousemove.pageX - offset.x, y: mousemove.pageY - offset.y, stroke })),
    scan((acc, current) => {
      let begin = !acc.stroke && current.stroke
      let close = acc.stroke && !current.stroke
      return { ...current, begin, close }
    }, { x: 0, y: 0, stroke: false, begin: false, close: false }),
    share()
  )

  stroke$.pipe(
    filter(stroke => !!stroke.stroke),
    combineLatestWith(canvasContext$),
    takeUntil(destruction$),
    ).subscribe({
    next: ([stroke, canvasContext]: any) => {
      draw(canvasContext, stroke)
    }
  })

  stroke$.pipe(
    filter(stroke => !!stroke.stroke || stroke.close || stroke.begin),
    _mapToPersistable_,
    _withIndexedDB_,
    _persist_.strokes,
    takeUntil(destruction$),
  ).subscribe()

  indexedDB$.pipe(
    concatMap(db => db.query(Tables.strokes)),
    map((strokes: any[]) => strokes.sort((a, b) => {
      if (a.created_at === b.created_at && (a.begin || b.close)) {
        return -1
      }
      return a.created_at - b.created_at
    })),
    takeUntil(destruction$),
    switchMap(strokes => from(strokes)),
    combineLatestWith(canvasContext$)
  ).subscribe({
    next: ([stroke, canvasContext]) => {
      draw(canvasContext, stroke)
    }
  })

  fromEventElement$(clear$, 'click').pipe(
    takeUntil(destruction$),
    combineLatestWith(canvas$, canvasContext$, indexedDB$)
  ).subscribe({
    next: async ([clear, canvas, canvasContext, db]: any) => {
      canvasContext.clearRect(0, 0, canvas.width, canvas.height)
      const strokes = await db.query(Tables.strokes)
      await Promise.all(strokes.map((stroke: any) => db.remove(Tables.strokes, stroke.id)))
      alert('Cleared')
    }
  })

  return <div>
    <canvas element$={canvas$}
      class={css`
        background-color: #eee;
      `}
      width={750}
      height={750} />
    <a class='btn blue waves-effect waves-light' element$={clear$}>Clear</a>
  </div>
}
