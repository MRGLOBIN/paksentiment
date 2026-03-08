import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../../store/useAuthStore'
import { FormErrors } from '../../types'

export const useLogin = () => {
    const router = useRouter()
    const { login } = useAuthStore()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [errors, setErrors] = useState<FormErrors>({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        if (!email) {
            newErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email'
        }

        if (!password) {
            newErrors.password = 'Password is required'
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setApiError('')

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            const response = await fetch(`${apiUrl}/auth/login-with-email-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || 'Login failed')
            }

            const data = await response.json()

            login(data.accessToken, data.user)
            router.push('/dashboard')
        } catch (error) {
            setApiError(
                error instanceof Error
                    ? error.message
                    : 'An error occurred during login',
            )
        } finally {
            setLoading(false)
        }
    }

    return {
        email, setEmail,
        password, setPassword,
        showPassword, setShowPassword,
        errors, setErrors,
        loading, apiError,
        handleSubmit
    }
}
