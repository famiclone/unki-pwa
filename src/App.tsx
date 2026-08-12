import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { DecksView } from './views/DecksView'
import { DeckEditorView } from './views/DeckEditorView'
import { StudyView } from './views/StudyView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DecksView />} />
          <Route path="decks/:deckId" element={<DeckEditorView />} />
          <Route path="decks/:deckId/study" element={<StudyView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
