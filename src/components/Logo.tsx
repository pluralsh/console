import { ComponentPropsWithRef, HTMLAttributes, forwardRef } from 'react'

import PluralLogoFull from './icons/logo/PluralLogoFull'
import PluralLogoMark from './icons/logo/PluralLogoMark'
import PluralLogoWord from './icons/logo/PluralLogoWord'

export type LogoProps = ComponentPropsWithRef<'div'> & {
  isDark?: boolean
  width?: string | number;
  height?: string | number;
  type?: LogoType;
}

export enum LogoType {
  Full = 'full',
  Word = 'word',
  Mark = 'mark',
}

const Logo = forwardRef<HTMLDivElement, LogoProps & HTMLAttributes<HTMLDivElement>>(({
  isDark = false,
  width,
  height,
  type = LogoType.Full,
  ...props
},
ref): JSX.Element => {
  const color = isDark ? '#000' : '#FFF'

  return (
    <div
      ref={ref}
      {...props}
    >
      {type === LogoType.Full && (
        <PluralLogoFull
          color={color}
          width={width}
          height={height}
        />
      )}
      {type === LogoType.Word && (
        <PluralLogoWord
          color={color}
          width={width}
          height={height}
        />
      )}
      {type === LogoType.Mark && (
        <PluralLogoMark
          color={color}
          width={width}
          height={height}
        />
      )}
    </div>
  )
})

export default Logo
