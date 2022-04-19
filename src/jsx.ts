import { fromEvent, pluck, Subject, switchMap, takeUntil, tap, withLatestFrom } from "rxjs";

// Critical JSX replacement

(window as any).createElement = (tag, props, ...children) => {
  if (typeof tag === "function") return tag(props, ...children);
  const element = document.createElement(tag);

  Object.entries(props || {}).forEach(([name, value]) => {
    if (name.startsWith("on") && name.toLowerCase() in window) {
      element.addEventListener(name.toLowerCase().substr(2), value);
    }
    else if (name === 'element$') {
      const observable = value as any
      if (observable && observable.next && typeof observable.next === 'function') {
        observable.next(element)
      }
    } else {
      element.setAttribute(name, value.toString());
    }
  });

  children.forEach(child => {
    appendChild(element, child);
  });

  return element;
};

const appendChild = (parent, child) => {
  if (Array.isArray(child))
    child.forEach(nestedChild => appendChild(parent, nestedChild));
  else
    parent.appendChild(child.nodeType ? child : document.createTextNode(child));
};


// Helper functions

export function toElement$ (destruction$): [Subject<Element>, ((next: any) => void)] {
  const routeDom$ = new Subject<Element>()
  const route$ = new Subject<Element>()

  route$.pipe(
    withLatestFrom(routeDom$),
    takeUntil(destruction$)
  )
  .subscribe({
    next: ([toBe, current]) => {
      routeDom$.next(toBe)
      current.replaceWith(toBe)
    }
  })

  return [routeDom$, i => route$.next(i)]
}

export function fromEventElement$ (target$: Subject<Element>, eventName: string) {
  return target$.pipe(
    switchMap(target => fromEvent(target, eventName))
  )
}

export function fromValueElementKeyup$ (target$: Subject<Element>) {
  return target$.pipe(
    switchMap(target => fromEvent(target, 'keyup').pipe(pluck('target', 'value')))
  )
}
