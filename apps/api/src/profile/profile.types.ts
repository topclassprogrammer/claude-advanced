export interface ProfileRecord {
  email: string;
  name: string;
}

export function toProfileRecord(user: {
  email: string;
  name: string | null;
}): ProfileRecord {
  return {
    email: user.email,
    name: user.name ?? user.email.split('@')[0],
  };
}
