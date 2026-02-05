import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ActorPage } from '@/pages/ActorPage'
import { FilmPage } from '@/pages/FilmPage'
import { ActorDetailPage } from '@/pages/ActorDetailPage'
import { FilmDetailPage } from '@/pages/FilmDetailPage'

function HomeRedirect() {
  return <Navigate to="/actor" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="actor" element={<ActorPage />} />
          <Route path="actor/:id" element={<ActorDetailPage />} />
          <Route path="film" element={<FilmPage />} />
          <Route path="film/:id" element={<FilmDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
