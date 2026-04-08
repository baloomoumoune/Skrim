import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useBaseColors } from '@/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';
import type { AgentMeta, AgentRole } from '@/lib/game-assets';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_PAD = 24;
const COL_GAP = 8;
const CELL_W = (SCREEN_WIDTH - CONTENT_PAD * 2 - COL_GAP * 2) / 3;

const TAB_GAP = 6;
const TAB_COUNT = 4;
const TAB_WIDTH = (SCREEN_WIDTH - CONTENT_PAD * 2 - TAB_GAP * (TAB_COUNT - 1)) / TAB_COUNT;

const ROLE_ORDER: AgentRole[] = ['duelist', 'initiator', 'controller', 'sentinel'];
const ROLE_LABELS: Record<string, string> = {
  duelist: 'Duelists',
  initiator: 'Initiators',
  controller: 'Controllers',
  sentinel: 'Sentinels',
};

interface StepAgentProps {
  selectedAgent: string | null;
  onSelectAgent: (id: string) => void;
  game: string;
  agents: AgentMeta[];
}

export default function StepAgent({
  selectedAgent,
  onSelectAgent,
  game,
  agents,
}: StepAgentProps) {
  const c = useBaseColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const agentsByRole = useMemo(() => {
    const map = new Map<string, AgentMeta[]>();
    for (const agent of agents) {
      if (!map.has(agent.role)) map.set(agent.role, []);
      map.get(agent.role)!.push(agent);
    }
    return map;
  }, [agents]);

  const availableRoles = ROLE_ORDER.filter((r) => agentsByRole.has(r));
  const [activeRole, setActiveRole] = useState<string>(availableRoles[0] ?? 'duelist');
  const currentAgents = agentsByRole.get(activeRole) ?? [];

  return (
    <View style={styles.container}>
      {/* Role tabs */}
      <MotiView
        from={{ opacity: 0, translateY: 8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 250 }}
        style={styles.tabRow}
      >
        {availableRoles.map((role, i) => {
          const isActive = activeRole === role;
          return (
            <TouchableOpacity
              key={role}
              style={[
                styles.tab,
                {
                  width: TAB_WIDTH,
                  backgroundColor: isActive
                    ? isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                    : 'transparent',
                  borderColor: isActive
                    ? c.accent
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={() => setActiveRole(role)}
              activeOpacity={0.7}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.tabText,
                  {
                    color: isActive ? c.textPrimary : c.textTertiary,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {ROLE_LABELS[role] ?? role}
              </Text>
            </TouchableOpacity>
          );
        })}
      </MotiView>

      {/* Agent grid */}
      <AnimatePresence exitBeforeEnter>
        <MotiView
          key={activeRole}
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: -10 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.grid}
        >
          {currentAgents.map((agent, i) => {
            const isActive = selectedAgent === agent.id;
            return (
              <MotiView
                key={agent.id}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 200, delay: i * 40 }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onSelectAgent(agent.id)}
                  style={[
                    styles.agentCell,
                    {
                      width: CELL_W,
                      borderWidth: isActive ? 2 : 1,
                      borderColor: isActive
                        ? c.accent
                        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      backgroundColor: isActive
                        ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                        : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    },
                  ]}
                >
                  <Image
                    source={{
                      uri: agent.image,
                    }}
                    style={{
                      width: CELL_W * 0.55,
                      height: CELL_W * 0.55,
                    }}
                    resizeMode="contain"
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.agentName,
                      { color: isActive ? c.textPrimary : c.textTertiary },
                    ]}
                  >
                    {agent.name}
                  </Text>
                </TouchableOpacity>
              </MotiView>
            );
          })}
        </MotiView>
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  tabRow: {
    flexDirection: 'row',
    gap: TAB_GAP,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COL_GAP,
  },
  agentCell: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 4,
  },
  agentName: {
    fontSize: 11,
    fontWeight: '600',
  },
});
