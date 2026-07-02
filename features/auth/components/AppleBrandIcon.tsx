import { Icon } from "@/components/common/Icon/Icon";
import { useTheme } from "@/components/design-system/useTheme";

interface AppleBrandIconProps {
  size?: number;
}

export function AppleBrandIcon({ size = 18 }: AppleBrandIconProps) {
  const { colors, isDark } = useTheme();

  return (
    <Icon
      family="FontAwesome"
      name="apple"
      size={size}
      color={isDark ? colors.onSurface : "#000000"}
    />
  );
}
