import { StyleSheet } from "react-native";

/** Full-width Garden cards with icon + Manrope title (e.g. Hydration). */
export const dashboardUtilityCardStyles = StyleSheet.create({
  card: {
    borderRadius: 28,
    minHeight: 114,
    paddingHorizontal: 22,
    paddingVertical: 26,
    gap: 10,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    marginTop: 1,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  meta: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});

/** Editorial entry cards (eyebrow + serif headline, e.g. Care calendar CTA). */
export const dashboardEditorialEntryCardStyles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  body: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
});
