import { SignOutButton } from "@clerk/nextjs";
import styles from "./page.module.css";
import { getUser } from "@/lib/queries/auth/data";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  if (!user?.profile) redirect("/post-auth");

  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>
        Signed in as {user.account.email}
      </h1>

      <SignOutButton>
        <button className={styles.signOut}>Sign out</button>
      </SignOutButton>
    </main>
  );
}