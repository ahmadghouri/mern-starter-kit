import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { useAuthProviders } from '@/features/auth/google';
import { AppearanceSection } from '@/features/profile/AppearanceSection';
import { ConnectedAccounts } from '@/features/profile/ConnectedAccounts';
import { AvatarSection } from '@/features/profile/AvatarSection';
import { EmailForm, PasswordForm, PersonalInfoForm } from '@/features/profile/ProfileForms';

function Section({ title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const providers = useAuthProviders();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your personal details, security, and theme.</p>
      </div>

      <Section title="Profile picture" description="Shown in the header and to admins.">
        <AvatarSection />
      </Section>

      <Section title="Personal information" description="Your display name.">
        <PersonalInfoForm />
      </Section>

      <Section title="Email" description="The address you use to sign in and receive reset links.">
        <EmailForm />
      </Section>

      <Section
        title="Password"
        description="Changing your password signs out all your other devices."
      >
        <PasswordForm />
      </Section>

      {(providers.google || user.googleLinked) && (
        <Section title="Connected accounts" description="Sign-in methods linked to your account.">
          <ConnectedAccounts googleEnabled={providers.google} />
        </Section>
      )}

      <Section title="Appearance" description="Choose a theme. Saved in this browser.">
        <AppearanceSection />
      </Section>
    </div>
  );
}
