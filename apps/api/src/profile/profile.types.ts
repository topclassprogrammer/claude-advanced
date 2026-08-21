export interface ProfileRecord {
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AvatarFile {
  path: string;
  mimeType: string;
}

export function toProfileRecord(user: {
  email: string;
  name: string | null;
  avatarPath: string | null;
}): ProfileRecord {
  return {
    email: user.email,
    name: user.name ?? user.email.split('@')[0],
    avatarUrl: user.avatarPath ? '/users/me/avatar' : null,
  };
}
