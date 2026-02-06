import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ActorPage } from '@/pages/ActorPage'
import { FilmPage } from '@/pages/FilmPage'
import { ActorDetailPage } from '@/pages/ActorDetailPage'
import { FilmDetailPage } from '@/pages/FilmDetailPage'
import { BrowseMoviesPage } from '@/pages/BrowseMoviesPage'
import { WatchLaterPage } from '@/pages/WatchLaterPage'
import { MovieDetailPage } from '@/pages/MovieDetailPage'
import { PersonProfilePage } from '@/pages/PersonProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<BrowseMoviesPage />} />
        <Route path="/movie/:id" element={<MovieDetailPage />} />
        <Route path="/person/:id" element={<PersonProfilePage />} />
        <Route path="/watchlater" element={<WatchLaterPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="professionals" element={<ActorPage />} />
          <Route path="professionals/:id" element={<ActorDetailPage />} />
          <Route path="movies" element={<FilmPage />} />
          <Route path="movies/:id" element={<FilmDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
