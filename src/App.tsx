import React, { FC, useRef } from 'react'
import { css, styled } from './stitches.config'

css.global({
  'body, html': {
    height: '100%',
  },
})

const Button = styled('button', {
  padding: '$1 $2',
  border: '1px solid black',
})

const Label = styled('label', {
  flexCol: true,
})

const Input = styled('input', {
  border: '1px solid black',
})

const App: FC = () => {
  const tokenRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const token = localStorage.getItem('token') ?? undefined
  const username = localStorage.getItem('username') ?? undefined
  return (
    <main
      className={css({
        flexCol: true,
        maxWidth: 800,
        margin: '0 auto',
        alignItems: 'start',
        '> *': {
          margin: '$1',
        },
      })}>
      <h1>GitHub Deploy Center</h1>
      <Label>
        <span>Paste your Personal Access Token:</span>
        <Input
          defaultValue={token}
          ref={tokenRef}
          type="password"
          className={css({ width: '40rem' })}></Input>
      </Label>
      <Label>
        <span>GitHub username:</span>
        <Input defaultValue={username} ref={usernameRef}></Input>
      </Label>
      <Button
        onClick={() => {
          localStorage.setItem('token', tokenRef.current?.value ?? '')
          localStorage.setItem('username', usernameRef.current?.value ?? '')
        }}>
        Save
      </Button>

      {token && username && <Repos token={token} username={username}></Repos>}
    </main>
  )
}

const Repos: FC<{ token?: string; username: string }> = ({ username }) => {
  const { data, loading, error } = useCurrentUserIdQuery()
  const x = useFetchReposWithWriteAccessLazyQuery({
    variables: {
      after,
    },
  })
  return (
    <div>
      <h2>Repositories</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : (
        <div>{data?.viewer?.id}</div>
      )}
    </div>
  )
}

export default App
