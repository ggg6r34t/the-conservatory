import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useChangePassword } from "@/features/auth/hooks/useChangePassword";
import { changePasswordSchema } from "@/features/auth/schemas/authValidation";
import { useSnackbar } from "@/hooks/useSnackbar";

export function ChangePasswordForm() {
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const changePasswordMutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async () => {
    if (changePasswordMutation.isPending) {
      return;
    }

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmNewPassword,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        currentPassword: fieldErrors.currentPassword?.[0] ?? "",
        newPassword: fieldErrors.newPassword?.[0] ?? "",
        confirmNewPassword: fieldErrors.confirmNewPassword?.[0] ?? "",
      });
      setSuccessMessage("");
      return;
    }

    setErrors({});
    setSubmitError("");
    setSuccessMessage("");

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessMessage("Your password has been refreshed.");
      snackbar.success("Your password has been refreshed.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't update your password right now.";
      setSubmitError(message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInputField
        label="Current Password"
        value={currentPassword}
        onChangeText={(value) => {
          setCurrentPassword(value);
          setErrors((current) => ({ ...current, currentPassword: "" }));
          setSubmitError("");
          setSuccessMessage("");
        }}
        secureTextEntry={!showCurrentPassword}
        autoComplete="current-password"
        textContentType="password"
        placeholder="Enter your current password"
        error={errors.currentPassword}
        trailingIcon={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
        onTrailingPress={() => setShowCurrentPassword((current) => !current)}
        trailingAccessibilityLabel={
          showCurrentPassword ? "Hide current password" : "Show current password"
        }
      />
      <TextInputField
        label="New Password"
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          setErrors((current) => ({ ...current, newPassword: "" }));
          setSubmitError("");
          setSuccessMessage("");
        }}
        secureTextEntry={!showNewPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Choose a secure password"
        error={errors.newPassword}
        trailingIcon={showNewPassword ? "eye-off-outline" : "eye-outline"}
        onTrailingPress={() => setShowNewPassword((current) => !current)}
        trailingAccessibilityLabel={
          showNewPassword ? "Hide new password" : "Show new password"
        }
      />
      <TextInputField
        label="Confirm New Password"
        value={confirmNewPassword}
        onChangeText={(value) => {
          setConfirmNewPassword(value);
          setErrors((current) => ({ ...current, confirmNewPassword: "" }));
          setSubmitError("");
          setSuccessMessage("");
        }}
        secureTextEntry={!showConfirmPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Confirm your new password"
        error={errors.confirmNewPassword}
        trailingIcon={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
        onTrailingPress={() => setShowConfirmPassword((current) => !current)}
        trailingAccessibilityLabel={
          showConfirmPassword
            ? "Hide confirm password"
            : "Show confirm password"
        }
      />
      {submitError ? (
        <Text style={[styles.message, styles.errorMessage, { color: colors.error }]}>
          {submitError}
        </Text>
      ) : null}
      {successMessage ? (
        <Text style={[styles.message, { color: colors.primary }]}>
          {successMessage}
        </Text>
      ) : null}
      <PrimaryButton
        label="Update Password"
        onPress={handleSubmit}
        loading={changePasswordMutation.isPending}
        disabled={changePasswordMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  message: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  errorMessage: {
    marginTop: -2,
  },
});
