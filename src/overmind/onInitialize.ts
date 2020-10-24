import { OnInitialize } from 'overmind'

const onInitialize: OnInitialize = ({ state }, instance) => {
  const savedStateJson = localStorage.getItem('overmind')
  if (savedStateJson) {
    try {
      const savedState = JSON.parse(savedStateJson)
      state.token = savedState.token
      state.selectedRepo = savedState.selectedRepo
    } catch (error) {
      console.error(error)
    }
  }
  instance.reaction(
    ({ token }) => ({ token }),
    (data) => localStorage.setItem('overmind', JSON.stringify(data))
  )
}

export default onInitialize
