import styles from './LoadingAnimation.module.scss'

interface LoadingAnimationProps {
    message?: string
}

export default function LoadingAnimation({ message = 'Loading data...' }: LoadingAnimationProps) {
    return (
        <div className={styles.container}>
            <div className={styles.spinner}></div>
            <p className={styles.text}>{message}</p>
        </div>
    )
}
