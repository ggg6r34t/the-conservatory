import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/common/Buttons/PrimaryButton";
import { TextInputField } from "@/components/common/Forms/TextInput";
import { useTheme } from "@/components/design-system/useTheme";
import { useResetPassword } from "@/features/auth/hooks/useResetPassword";
import { resetPasswordSchema } from "@/features/auth/schemas/authValidation";

interface ResetPasswordFormProps {
  onSuccess: () => void;
}

const PASSWORD_REQUIREMENTS =
  "At least 8 characters, including one letter and one number.";

export function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const { colors } = useTheme();
  const resetPasswordMutation = useResetPassword();
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async () => {
    if (resetPasswordMutation.isPending) {
      return;
    }

    const parsed = resetPasswordSchema.safeParse({
      newPassword,
      confirmNewPassword,
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        newPassword: fieldErrors.newPassword?.[0] ?? "",
        confirmNewPassword: fieldErrors.confirmNewPassword?.[0] ?? "",
      });
      return;
    }

    setErrors({});
    setSubmitError("");

    try {
      await resetPasswordMutation.mutateAsync(parsed.data.newPassword);
      onSuccess();
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
      <Text
        accessibilityRole="text"
        style={[styles.requirements, { color: colors.onSurfaceVariant }]}
      >
        {PASSWORD_REQUIREMENTS}
      </Text>
      <TextInputField
        label="New password"
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          setErrors((current) => ({ ...current, newPassword: "" }));
          setSubmitError("");
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
        returnKeyType="next"
      />
      <TextInputField
        label="Confirm new password"
        value={confirmNewPassword}
        onChangeText={(value) => {
          setConfirmNewPassword(value);
          setErrors((current) => ({ ...current, confirmNewPassword: "" }));
          setSubmitError("");
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
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      {submitError ? (
        <Text
          accessibilityRole="alert"
          style={[styles.message, styles.errorMessage, { color: colors.error }]}
        >
          {submitError}
        </Text>
      ) : null}
      <PrimaryButton
        label="Update password"
        onPress={handleSubmit}
        loading={resetPasswordMutation.isPending}
        disabled={resetPasswordMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  requirements: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
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
