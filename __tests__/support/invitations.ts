import { emailedLinkToken, sentEmails } from "./fake-email";
import { createAccessScenario } from "./fixtures";
import { inviteToGroup } from "@/lib/invitations/invitations";
import { INVITATION_PATH } from "@/lib/invitations/routes";

/** Invites `email` to a new Group (sent at `now`) and returns the scenario plus the emailed link's token. */
export async function inviteToNewGroup(email = "anna@example.com", now?: Date) {
  const scenario = await createAccessScenario();
  await inviteToGroup({ groupId: scenario.group.id, email, invitedById: scenario.creator.id }, now);
  return { ...scenario, token: emailedLinkToken(sentEmails().at(-1)!, INVITATION_PATH) };
}
