import {
  Div,
  Flex,
  Img,
  ImgProps,
} from 'honorable'

import { ComponentPropsWithoutRef } from 'react'

import { Footer, FooterBalancer } from './LoginFooter'
import { LOGIN_SIDEBAR_IMAGE, RIGHT_CONTENT_MAX_WIDTH, RIGHT_CONTENT_PAD } from './constants'

export type PictureProps = {
  sources: ComponentPropsWithoutRef<'source'>[]
} & ImgProps
export function Picture({ sources, ...props }: PictureProps) {
  return (
    <picture style={{ display: 'contents' }}>
      {sources.map(source => (
        <source {...source} />
      ))}
      <Img {...props} />
    </picture>
  )
}

export function LoginPortal({ children }: any) {
  return (
    <Flex height="100vh">
      {/* LEFT SIDE */}
      <Flex
        direction="column"
        align="center"
        background="fill-one"
        display-desktop-down="none"
        overflow="hidden"
        width={504}
        height="100%"
      >
        <Picture
          {...LOGIN_SIDEBAR_IMAGE}
          width="100%"
          height="100%"
          objectFit="cover"
          objectPosition="top center"
        />
      </Flex>
      {/* RIGHT SIDE */}
      <Flex
        overflow="auto"
        flexDirection="column"
        grow={1}
        shrink={1}
        paddingHorizontal={RIGHT_CONTENT_PAD}
      >
        <FooterBalancer />
        <Div
          maxWidth={RIGHT_CONTENT_MAX_WIDTH}
          width="100%"
          marginVertical="auto"
          marginHorizontal="auto"
        >
          {children}
        </Div>
        <Footer />
      </Flex>
    </Flex>
  )
}
