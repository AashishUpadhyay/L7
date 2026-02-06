import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ActorPage } from '@/pages/ActorPage'
import { FilmPage } from '@/pages/FilmPage'
import { ActorDetailPage } from '@/pages/ActorDetailPage'
import { FilmDetailPage } from '@/pages/FilmDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="professionals" element={<ActorPage />} />
          <Route path="professionals/:id" element={<ActorDetailPage />} />
          <Route path="film" element={<FilmPage />} />
          <Route path="film/:id" element={<FilmDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
