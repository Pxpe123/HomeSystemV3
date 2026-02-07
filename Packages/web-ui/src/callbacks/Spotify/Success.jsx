import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'

export default function SpotifySuccess() {
  const [params] = useSearchParams()

  const name = params.get('name')
  const email = params.get('email')

  useEffect(() => {
  window.history.replaceState({}, '', '/Spotify/Callback/Success')
}, [])

  return (
    <div className="spotify-success">
      <h1>Spotify Connected 🎉</h1>
      <p>Welcome <strong>{name}</strong></p>
      <p>{email}</p>
    </div>
  )
}
