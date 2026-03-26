import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = [
  '#E53E3E', // red
  '#DD6B20', // orange
  '#D69E2E', // yellow
  '#38A169', // green
  '#3182CE', // blue
  '#805AD5', // purple
  '#D53F8C', // pink
  '#319795', // teal
];

function hashTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface TeamInitialsProps {
  tag: string;
  size: number;
}

export function TeamInitials({ tag, size }: TeamInitialsProps) {
  const color = COLORS[hashTag(tag) % COLORS.length];
  const initials = tag.slice(0, 3).toUpperCase();
  const fontSize = size * 0.38;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
