'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetings, type Meeting } from '@/lib/meeting-api';
import { getProfile, type Profile } from '@/lib/profile-api';
import { useSession } from '@/hooks/useSession';
import { AppSidebar } from '@/components/meetings/AppSidebar';
import { Avatar } from '@/components/Avatar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { ProfileNameForm } from '@/components/ProfileNameForm';
import { ProfileTopbar } from '@/components/profile/ProfileTopbar';
import { SettingsCard } from '@/components/profile/SettingsCard';
import { AccountSummaryCard } from '@/components/profile/AccountSummaryCard';
import { AccountDataCard } from '@/components/profile/AccountDataCard';
import { SecurityCard } from '@/components/profile/SecurityCard';
import { ImageIcon } from '@/components/icons/ImageIcon';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { LockKeyholeIcon } from '@/components/icons/LockKeyholeIcon';

/**
 * Страница профиля (маршрут /profile, требует авторизации, см. .pen node
 * snVvB «App — Профиль»): тот же каркас сайдбар+топбар, что и у MeetingsScreen,
 * и две колонки карточек — сводка/данные/безопасность аккаунта слева,
 * редактирование имени/аватара/пароля справа.
 */
export default function ProfilePage() {
  const { session, logout } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meetingsCount, setMeetingsCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

  const handleAvatarChange = (updated: Profile) => {
    setProfile(updated);
    setAvatarVersion((v) => v + 1);
  };

  const handleMeetingCreated = (meeting: Meeting) => {
    router.push(`/meetings/${meeting.id}`);
  };

  useEffect(() => {
    if (!session) return;

    getProfile()
      .then(setProfile)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
        );
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;

    getMeetings()
      .then((meetings) => setMeetingsCount(meetings.length))
      .catch(() => {
        // Показатель «Встреч» остаётся прочерком, если список не удалось загрузить.
      });
  }, [session]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar
        email={session.email}
        profile={profile}
        avatarVersion={avatarVersion}
        onMeetingCreated={handleMeetingCreated}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <ProfileTopbar subtitle={session.email} onLogout={logout} />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Не удалось загрузить профиль</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : !profile ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[400px_1fr]">
              <div className="flex flex-col gap-5">
                <AccountSummaryCard
                  profile={profile}
                  meetingsCount={meetingsCount}
                  avatarVersion={avatarVersion}
                />
                <AccountDataCard profile={profile} />
                <SecurityCard />
              </div>

              <div className="flex flex-col gap-5">
                <SettingsCard icon={<PencilIcon width={14} height={14} />} title="Имя">
                  <ProfileNameForm name={profile.name} onUpdated={setProfile} />
                </SettingsCard>

                <SettingsCard icon={<ImageIcon width={14} height={14} />} title="Аватар">
                  <div className="flex items-center gap-4">
                    <Avatar
                      key={`${profile.avatarUrl}-${avatarVersion}`}
                      avatarUrl={profile.avatarUrl}
                      name={profile.name}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <AvatarUpload profile={profile} onChange={handleAvatarChange} />
                    </div>
                  </div>
                </SettingsCard>

                <SettingsCard icon={<LockKeyholeIcon width={14} height={14} />} title="Пароль">
                  <ChangePasswordForm />
                </SettingsCard>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
