import { useState } from 'react';
import { View, Text, Switch, Pressable, Modal } from 'react-native';
import { useColors } from '@/hooks/useThemeColors';
import StepServers from '@/components/onboarding/StepServers';
import StepLanguages from '@/components/onboarding/StepLanguages';
import { LANGUAGES } from '@/lib/languages';
import type { ValorantRegion } from '@/lib/valorant-regions';

export type Criteria = {
  region: ValorantRegion;
  servers: string[];
  platform: string;
  rank_min: string;
  rank_max: string;
  primary_language: string;
  secondary_languages: string[];
  voice_required: boolean;
  age_filter: 'under_18' | 'over_18' | 'any';
};

type Props = {
  value: Criteria;
  onChange: (c: Criteria) => void;
};

export default function CriteriaSection({ value, onChange }: Props) {
  const c = useColors();
  const [serversOpen, setServersOpen] = useState(false);
  const [langsOpen, setLangsOpen] = useState(false);
  const langLabel =
    LANGUAGES.find((l) => l.code === value.primary_language)?.native ?? value.primary_language;

  const cycleAge = () => {
    const next =
      value.age_filter === 'any'
        ? 'over_18'
        : value.age_filter === 'over_18'
          ? 'under_18'
          : 'any';
    onChange({ ...value, age_filter: next });
  };

  return (
    <View style={{ padding: 16 }}>
      <Text
        style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}
      >
        Criteria
      </Text>
      <Text style={{ color: c.textSecondary, marginBottom: 8 }}>
        Region (read-only): {value.region}
      </Text>

      <Pressable
        onPress={() => setServersOpen(true)}
        style={{
          padding: 12,
          borderRadius: 10,
          backgroundColor: c.surface,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: c.textPrimary }}>Servers ({value.servers.length})</Text>
      </Pressable>

      <Pressable
        onPress={() => setLangsOpen(true)}
        style={{
          padding: 12,
          borderRadius: 10,
          backgroundColor: c.surface,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: c.textPrimary }}>
          Primary: {langLabel} • Secondary: {value.secondary_languages.length}
        </Text>
      </Pressable>

      <Pressable
        onPress={cycleAge}
        style={{
          padding: 12,
          borderRadius: 10,
          backgroundColor: c.surface,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: c.textPrimary }}>Age filter: {value.age_filter}</Text>
      </Pressable>

      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
      >
        <Text style={{ color: c.textPrimary, flex: 1 }}>Voice required</Text>
        <Switch
          value={value.voice_required}
          onValueChange={(b) => onChange({ ...value, voice_required: b })}
        />
      </View>

      <Modal
        visible={serversOpen}
        animationType="slide"
        onRequestClose={() => setServersOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <StepServers
            region={value.region}
            value={value.servers}
            onChange={(servers) => onChange({ ...value, servers })}
          />
          <Pressable
            onPress={() => setServersOpen(false)}
            style={{
              margin: 16,
              padding: 14,
              borderRadius: 10,
              backgroundColor: c.accent,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal
        visible={langsOpen}
        animationType="slide"
        onRequestClose={() => setLangsOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <StepLanguages
            primary={value.primary_language}
            secondary={value.secondary_languages}
            onPrimaryChange={(primary_language) => onChange({ ...value, primary_language })}
            onSecondaryChange={(secondary_languages) =>
              onChange({ ...value, secondary_languages })
            }
          />
          <Pressable
            onPress={() => setLangsOpen(false)}
            style={{
              margin: 16,
              padding: 14,
              borderRadius: 10,
              backgroundColor: c.accent,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
