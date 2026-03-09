import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../../store/useAuthStore'
import { FormErrors } from '../../types'

export const useRegister = () => {
    const router = useRouter()
    const { login } = useAuthStore()
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [errors, setErrors] = useState<FormErrors>({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    const [success, setSuccess] = useState(false)

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        if (!firstName) newErrors.firstName = 'First name is required'
        if (!lastName) newErrors.lastName = 'Last name is required'

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

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setApiError('')
        setSuccess(false)

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password,
                    confirmPassword,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || 'Registration failed')
            }

            const data = await response.json()

            login(data.accessToken, data.user)

            setSuccess(true)

            setTimeout(() => {
                router.push('/')
            }, 1000)
        } catch (error) {
            setApiError(
                error instanceof Error
                    ? error.message
                    : 'An error occurred during registration',
            )
        } finally {
            setLoading(false)
        }
    }

    return {
        firstName, setFirstName,
        lastName, setLastName,
        email, setEmail,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        showPassword, setShowPassword,
        showConfirmPassword, setShowConfirmPassword,
        errors, setErrors,
        loading, apiError, success, setSuccess,
        handleSubmit
    }
}
