import styles from "./layout.module.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className={styles.main}>
      {children}
    </main>
  )
}