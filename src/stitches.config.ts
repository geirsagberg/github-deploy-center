import { createStyled } from '@stitches/react'

const stitches = createStyled({
  utils: {
    flexCol: () => () => ({
      display: 'flex',
      flexDirection: 'column',
    }),
  },
  tokens: {
    space: {
      $1: '0.5rem',
      $2: '1rem',
    },
    colors: {},
  },
})

// @stitches actually returns an object but says it is a string. This works fine in runtime for React, because it will call .toString() which actually gives the className. But some components, like react-tooltip, complain if we pass an object instead of a string.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const css: TCss<typeof cssConfig> = (...args) =>
  stitches.css(...args).toString()

export const styled = stitches.styled
