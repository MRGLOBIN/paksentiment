
import { useState, useEffect } from 'react'
import { Activity } from '../types'

export function useActivities(token: string | null, apiUrl: string) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchActivities = async () => {
            if (!token) {
                setLoading(false)
                return
            }

            try {
                const res = await fetch(`${apiUrl}/activity/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })
                if (res.ok) {
                    const data = await res.json()
                    setActivities(data)
                }
            } catch (err) {
                console.error('Failed to fetch activities', err)
            } finally {
                setLoading(false)
            }
        }

        fetchActivities()
    }, [token, apiUrl])

    return { activities, loading }
}
