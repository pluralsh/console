import { HTMLAttributes } from 'react'

export type UserType = {
  name?: string
  email?: string
  imageUrl?: string
}

export type IconProps = HTMLAttributes<SVGElement> & {
  size?: number
  color?: string
}
