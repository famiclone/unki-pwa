import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { AllCardsView } from './views/AllCardsView'
import { StudyView } from './views/StudyView'

/** Vite BASE_URL ends with `/`; React Router basename should not. */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<AllCardsView />} />
          <Route path="study" element={<StudyView />} />
          <Route path="decks/:deckId/study" element={<StudyView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <PwaUpdatePrompt />
    </BrowserRouter>
  )
}
