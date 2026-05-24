import { getUser } from "@/lib/queries/auth/data";
import { redirect } from "next/navigation";
import styles from "./page.module.css";

export default async function CreateProfilePage() {
  const user = await getUser();
  if (!user) redirect("/sign-in");

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <h1 className={styles.title}>Add your username</h1>
        <p className={styles.subtitle}>
          Pick a name others will see when they find your boards.
        </p>
      </header>

      <form className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">
            Username
          </label>
          <input
            className={styles.input}
            id="displayName"
            name="displayName"
            type="text"
            required
            minLength={2}
            maxLength={50}
          />
        </div>

        <button className={styles.button} type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}