import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getStudyQueue, rateCard, type StudyItem } from '../db/study'
import { GRADE_LABELS, type Grade } from '../lib/srs'
import { useObjectUrl } from '../hooks/useObjectUrl'
import './StudyView.css'
import './DecksView.css'

function Flashcard({
  item,
  revealed,
  onReveal,
  onRate,
  rating,
}: {
  item: StudyItem
  revealed: boolean
  onReveal: () => void
  onRate: (grade: Grade) => void
  rating: boolean
}) {
  const imageUrl = useObjectUrl(item.card.image)
  const grades: Grade[] = [1, 2, 3, 4]

  return (
    <article className="flashcard">
      <div className="flashcard-prompt">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="flashcard-image" />
        ) : null}
        <p className="flashcard-front">{item.card.front}</p>
        {item.card.romaji ? (
          <p className="flashcard-romaji">{item.card.romaji}</p>
        ) : null}
      </div>

      {!revealed ? (
        <button type="button" className="show-answer" onClick={onReveal}>
          Show answer
        </button>
      ) : (
        <div className="flashcard-answer">
          <p className="flashcard-back">{item.card.back}</p>
          <div className="grade-row" role="group" aria-label="Rate recall">
            {grades.map((grade) => (
              <button
                key={grade}
                type="button"
                className={`grade-btn grade-${grade}`}
                disabled={rating}
                onClick={() => onRate(grade)}
              >
                {GRADE_LABELS[grade]}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export function StudyView() {
  const { deckId = '' } = useParams<{ deckId: string }>()
  const deck = useLiveQuery(() => db.decks.get(deckId), [deckId])

  const [queue, setQueue] = useState<StudyItem[]>([])
  const [revealed, setRevealed] = useState(false)
  const [rating, setRating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [doneCount, setDoneCount] = useState(0)

  const loadQueue = useCallback(async () => {
    if (!deckId) return
    setLoading(true)
    try {
      const nextQueue = await getStudyQueue(deckId)
      setQueue(nextQueue)
      setRevealed(false)
      setDoneCount(0)
    } finally {
      setLoading(false)
    }
  }, [deckId])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const current = queue[0]

  async function handleRate(grade: Grade) {
    if (!current || rating) return

    setRating(true)
    try {
      const updated = await rateCard(current.card.id, grade, current.review)
      setDoneCount((n) => n + 1)
      setQueue((prev) => {
        const rest = prev.slice(1)
        if (grade === 1) {
          return [...rest, { card: current.card, review: updated }]
        }
        return rest
      })
      setRevealed(false)
    } finally {
      setRating(false)
    }
  }

  if (deck === undefined || loading) {
    return <p className="empty-state">Loading study session…</p>
  }

  if (deck === null) {
    return (
      <section>
        <p className="empty-state">Deck not found.</p>
        <Link to="/" className="back-link">
          <ArrowLeft size={16} aria-hidden />
          Back to decks
        </Link>
      </section>
    )
  }

  const finished = !current

  return (
    <section className="study-view">
      <Link to={`/decks/${deckId}`} className="text-back">
        <ArrowLeft size={16} aria-hidden />
        {deck.name}
      </Link>

      <header className="view-header">
        <h1>Study</h1>
        <p>
          {finished
            ? doneCount > 0
              ? `Session complete — reviewed ${doneCount} card${doneCount === 1 ? '' : 's'}.`
              : 'Nothing due right now.'
            : `${queue.length} remaining · ${doneCount} done`}
        </p>
      </header>

      {finished ? (
        <div className="study-complete">
          <p className="empty-state">
            {doneCount > 0
              ? 'Nice work. Come back when more cards are due.'
              : 'Add cards or wait until reviews are due.'}
          </p>
          <div className="study-actions">
            <button
              type="button"
              className="show-answer"
              onClick={() => void loadQueue()}
            >
              Refresh queue
            </button>
            <Link to={`/decks/${deckId}`} className="back-link">
              Edit deck
            </Link>
          </div>
        </div>
      ) : (
        <Flashcard
          item={current}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onRate={handleRate}
          rating={rating}
        />
      )}
    </section>
  )
}
