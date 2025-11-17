import styles from "./page.module.scss";
import ThemeToggle from "./components/ThemeToggle";

export default function Home() {
  return (
    <>
      <ThemeToggle />
      <div className={styles.container}>
        <h1>Welcome to PakSentiment Frontend</h1>
        <p>Your go-to platform for sentiment analysis in Pakistan.</p>
      </div>
    </>
  );
}
