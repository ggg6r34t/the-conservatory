import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { ProfileScreenScaffold } from "@/features/profile/components/ProfileScreenScaffold";

export default function ChangePasswordScreen() {
  return (
    <ProfileScreenScaffold
      title="Change Password"
      subtitle="Account safety"
      description="Refresh your sign-in details to keep your conservatory feeling secure and well tended."
    >
      <ChangePasswordForm />
    </ProfileScreenScaffold>
  );
}
