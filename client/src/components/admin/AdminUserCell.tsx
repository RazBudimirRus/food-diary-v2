export function AdminUserCell({
  username,
  email,
  displayName,
}: {
  username: string;
  email: string;
  displayName: string | null;
}) {
  const showDisplayName = displayName && displayName !== username;
  return (
    <div>
      <div className="font-medium" data-testid={`admin-username-${username}`}>
        {username}
      </div>
      <div className="text-xs text-muted-foreground">{email}</div>
      {showDisplayName && <div className="text-xs text-muted-foreground">Имя: {displayName}</div>}
    </div>
  );
}
