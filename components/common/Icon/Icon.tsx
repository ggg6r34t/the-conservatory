import {
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  Fontisto,
  Foundation,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
  SimpleLineIcons,
  Zocial,
} from "@expo/vector-icons";
import type { ComponentProps } from "react";

type SupportedFamily =
  | "AntDesign"
  | "Entypo"
  | "EvilIcons"
  | "Feather"
  | "FontAwesome"
  | "FontAwesome5"
  | "FontAwesome6"
  | "Fontisto"
  | "Foundation"
  | "Ionicons"
  | "MaterialCommunityIcons"
  | "MaterialIcons"
  | "Octicons"
  | "SimpleLineIcons"
  | "Zocial";

interface IconProps {
  family?: SupportedFamily;
  name: string;
  size?: number;
  color?: string;
  style?: ComponentProps<typeof MaterialCommunityIcons>["style"];
}

const iconFamilies = {
  AntDesign,
  Entypo,
  EvilIcons,
  Feather,
  FontAwesome,
  FontAwesome5,
  FontAwesome6,
  Fontisto,
  Foundation,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
  SimpleLineIcons,
  Zocial,
} as const;

export function Icon({
  family = "MaterialCommunityIcons",
  name,
  size = 24,
  color,
  style,
}: IconProps) {
  const IconComponent = iconFamilies[family];

  return (
    <IconComponent
      name={name as never}
      size={size}
      color={color}
      style={style}
    />
  );
}
