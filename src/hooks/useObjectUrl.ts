import { useEffect, useState } from 'react'

/** Creates an object URL for a Blob and revokes it on cleanup. */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
