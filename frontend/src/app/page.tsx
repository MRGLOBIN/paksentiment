import Image from "next/image";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.container}>
      <h1>Welcome to PakSentiment Frontend</h1>
      <p>Your go-to platform for sentiment analysis in Pakistan.</p>
    </div>
  );
}
