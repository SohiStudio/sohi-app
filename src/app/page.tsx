import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import styles from "./page.module.css";

export default async function HomePage() {
  const user = await currentUser();

  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>
        Signed in as {user?.primaryEmailAddress?.emailAddress}
      </h1>

      <SignOutButton>
        <button className={styles.signOut}>Sign out</button>
      </SignOutButton>
    </main>
  );
}