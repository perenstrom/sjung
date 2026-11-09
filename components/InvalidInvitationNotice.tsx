/** "Inbjudan är inte längre giltig": an Invitation link that can't be used any more. */
export function InvalidInvitationNotice() {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold">Inbjudan är inte längre giltig</h1>
      <p className="text-sm text-muted-foreground">
        Länken har gått ut, ersatts av en nyare inbjudan eller återkallats. Be den som bjöd in dig
        att skicka en ny.
      </p>
    </div>
  );
}
