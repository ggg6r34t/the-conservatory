import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/components/design-system/useTheme";

import { ProfileScreenScaffold } from "./ProfileScreenScaffold";

export type LegalSection = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
};

interface LegalDocumentScreenProps {
  title: string;
  subtitle: string;
  description: string;
  prefaceLabel: string;
  prefaceTitle: string;
  prefaceBody: string;
  sections: LegalSection[];
  closingNote?: string;
}

export function LegalDocumentScreen({
  title,
  subtitle,
  description,
  prefaceLabel,
  prefaceTitle,
  prefaceBody,
  sections,
  closingNote,
}: LegalDocumentScreenProps) {
  const { colors } = useTheme();

  return (
    <ProfileScreenScaffold
      title={title}
      subtitle={subtitle}
      description={description}
    >
      <View
        style={[
          styles.prefaceCard,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <Text style={[styles.prefaceLabel, { color: colors.secondary }]}>
          {prefaceLabel}
        </Text>
        <Text style={[styles.prefaceTitle, { color: colors.primary }]}>
          {prefaceTitle}
        </Text>
        <Text style={[styles.prefaceBody, { color: colors.onSurfaceVariant }]}>
          {prefaceBody}
        </Text>
      </View>

      {sections.map((section, index) => (
        <View
          key={`${section.eyebrow}-${section.title}`}
          style={[
            styles.sectionCard,
            {
              backgroundColor:
                index % 2 === 0
                  ? colors.surfaceContainerLowest
                  : colors.surfaceContainerLow,
            },
          ]}
        >
          <Text style={[styles.sectionEyebrow, { color: colors.secondary }]}>
            {section.eyebrow}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            {section.title}
          </Text>
          <View style={styles.sectionBodyWrap}>
            {section.paragraphs.map((paragraph) => (
              <Text
                key={paragraph}
                style={[styles.sectionBody, { color: colors.onSurfaceVariant }]}
              >
                {paragraph}
              </Text>
            ))}
          </View>
        </View>
      ))}

      {closingNote ? (
        <Text style={[styles.closingNote, { color: colors.outline }]}>
          {closingNote}
        </Text>
      ) : null}
    </ProfileScreenScaffold>
  );
}

const styles = StyleSheet.create({
  prefaceCard: {
    borderRadius: 28,
    padding: 20,
    gap: 8,
  },
  prefaceLabel: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.8,
  },
  prefaceTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  prefaceBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    lineHeight: 24,
  },
  sectionCard: {
    borderRadius: 28,
    padding: 20,
    gap: 8,
  },
  sectionEyebrow: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.8,
  },
  sectionTitle: {
    fontFamily: "NotoSerif_700Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  sectionBodyWrap: {
    gap: 12,
  },
  sectionBody: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 24,
  },
  closingNote: {
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
