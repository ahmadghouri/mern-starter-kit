import { useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { FormAlert } from '@/components/form/FormAlert';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/features/auth/auth-context';
import { ACCEPTED_IMAGE_TYPES, resizeImageForAvatar } from '@/lib/image';
import { profileService } from '@/services/profile.service';

export function AvatarSection() {
  const { user, updateUser } = useAuth();
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);

  async function run(action, callback) {
    setPending(action);
    setError(null);
    try {
      const data = await callback();
      updateUser(data.user);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setPending(null);
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still triggers a change.
    event.target.value = '';
    if (!file) return;

    run('upload', async () => {
      const image = await resizeImageForAvatar(file);
      return profileService.uploadAvatar(image);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar user={user} className="size-20 text-xl" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="sr-only"
            onChange={handleFileChange}
            aria-label="Choose profile picture"
            tabIndex={-1}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => inputRef.current?.click()}
          >
            {pending === 'upload' ? <Spinner label="Uploading" /> : <ImageUp aria-hidden="true" />}
            {user.avatarVersion ? 'Change photo' : 'Upload photo'}
          </Button>
          {user.avatarVersion && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending !== null}
              onClick={() => run('remove', () => profileService.removeAvatar())}
            >
              {pending === 'remove' ? <Spinner label="Removing" /> : <Trash2 aria-hidden="true" />}
              Remove photo
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        WebP, AVIF, PNG, or JPEG. The image is cropped to a square and resized in your browser.
      </p>
      <FormAlert message={error} />
    </div>
  );
}
