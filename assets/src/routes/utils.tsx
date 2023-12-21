import { ComponentClass, FunctionComponent } from 'react'
import { type LazyRouteFunction } from 'react-router-dom'

/**
 * Pass the results of this function to a react-router Route's `lazy` property
 * to render the imported component lazily
 *
 * @param i Imported file with a React component as default export
 * @param props Optional properties to render the component with
 * @returns A promise in the format expected by Route's `lazy` property
 */
export function lazyC<P>(
  i: Promise<{
    default: FunctionComponent<P> | ComponentClass<P, any>
  }>,
  props?: P
): LazyRouteFunction<any> {
  return async () => {
    const Component = (await i).default

    // @ts-expect-error
    return { element: <Component {...props} /> }
  }
}
