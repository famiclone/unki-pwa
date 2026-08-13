import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { AllCardsView } from './views/AllCardsView'
import { DashboardView } from './views/DashboardView'
import { DecksView } from './views/DecksView'
import { DeckEditorView } from './views/DeckEditorView'
import { SettingsView } from './views/SettingsView'
import { StudyView } from './views/StudyView'

/** Vite BASE_URL ends with `/`; React Router basename should not. */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename || undefined}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/cards" replace />} />
          <Route path="cards" element={<AllCardsView />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="decks" element={<DecksView />} />
          <Route path="decks/:deckId" element={<DeckEditorView />} />
          <Route path="study" element={<StudyView />} />
          <Route path="decks/:deckId/study" element={<StudyView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/cards" replace />} />
        </Route>
      </Routes>
      <PwaUpdatePrompt />
    </BrowserRouter>
  )
}
