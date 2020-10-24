import { createStyled } from '@stitches/react'

export const { styled, css } = createStyled({
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
