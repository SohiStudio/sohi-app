import { db } from "@/db";
import { curatorProfile, userAccount } from "@/db/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { cache } from "react";

/**
 * Fetches the curator_profile row for a given user_account id.
 * 
 * @param userAccountId - Given `user_account` id
 * 
 * @returns Returns null if no profile exists yet (user hasn't completed onboarding).
 */
export const getProfile = cache(async (userAccountId: string) => {
  const profile = await db.query.curatorProfile.findFirst({
    where: eq(curatorProfile.userAccountId, userAccountId),
  });
  return profile ?? null;
});

/**
 * Gets the user_account row for the current Clerk user, creating it if missing.
 * Also fetches the user's profile (may be null if onboarding incomplete).
 * 
 * @returns Returns { account, profile } or null if no one is signed in.
 */
export const getUser = cache(async () => {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  let account = await db.query.userAccount.findFirst({
    where: eq(userAccount.clerkUserId, clerkUser.id),
  });

  if (!account) {
    const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress;
    if (!clerkEmail) {
      throw new Error(`Clerk user ${clerkUser.id} has no primary email`);
    }

    const [created] = await db
      .insert(userAccount)
      .values({
        clerkUserId: clerkUser.id,
        email: clerkEmail,
      })
      .returning();

    account = created;
  }

  const profile = await getProfile(account.id);

  return { account, profile };
});