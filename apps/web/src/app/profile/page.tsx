'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Card, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getProfile, type Profile } from '@/lib/profile-api';
import { getAccessToken } from '@/lib/session';
import { Avatar } from '@/components/Avatar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { BrandIcon } from '@/components/BrandIcon';
import { ProfileNameForm } from '@/components/ProfileNameForm';

export default function ProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const handleAvatarChange = (updated: Profile) => {
    setProfile(updated);
    setAvatarVersion((v) => v + 1);
  };

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      router.replace('/auth/login');
      return;
    }

    // localStorage — внешнее (browser-only) хранилище, недоступное при SSR,
    // поэтому токен можно прочитать только на клиенте внутри эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(accessToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    getProfile(token)
      .then(setProfile)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
        );
      });
  }, [token]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandIcon />
            <div>
              <p className="font-semibold text-foreground">Видеовстречи</p>
              <p className="text-sm text-muted">Профиль</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-muted hover:underline">
            На главную
          </Link>
        </header>

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить профиль</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {!profile && !error ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : null}

        {profile ? (
          <Card>
            <Card.Header>
              <Card.Title>Профиль</Card.Title>
            </Card.Header>
            <Card.Content className="flex items-center gap-4">
              <Avatar
                key={`${profile.avatarUrl}-${avatarVersion}`}
                token={token}
                avatarUrl={profile.avatarUrl}
                name={profile.name}
                size="lg"
              />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {profile.name}
                </p>
                <p className="text-sm text-muted">{profile.email}</p>
              </div>
            </Card.Content>
          </Card>
        ) : null}

        {profile ? (
          <Card>
            <Card.Header>
              <Card.Title>Имя</Card.Title>
            </Card.Header>
            <Card.Content>
              <ProfileNameForm
                token={token}
                name={profile.name}
                onUpdated={setProfile}
              />
            </Card.Content>
          </Card>
        ) : null}

        {profile ? (
          <Card>
            <Card.Header>
              <Card.Title>Аватар</Card.Title>
            </Card.Header>
            <Card.Content>
              <AvatarUpload
                token={token}
                profile={profile}
                onChange={handleAvatarChange}
              />
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
