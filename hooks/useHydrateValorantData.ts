import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useValorantDataStore } from '@/stores/valorantDataStore';
import { FALLBACK_AGENTS, FALLBACK_MAPS, FALLBACK_GAME_MODES } from '@/lib/game-assets-fallback';

const STALE_TIME = 24 * 60 * 60 * 1000; // 24h

export function useHydrateValorantData() {
  const { setAgents, setMaps, setGameModes, setSeasons, setActs, setEvents } = useValorantDataStore();

  const agentsQuery = useQuery({
    queryKey: ['valorant-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valorant_agents')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
    placeholderData: FALLBACK_AGENTS,
  });

  const mapsQuery = useQuery({
    queryKey: ['valorant-maps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valorant_maps')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
    placeholderData: FALLBACK_MAPS,
  });

  const gameModesQuery = useQuery({
    queryKey: ['valorant-game-modes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valorant_game_modes')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
    placeholderData: FALLBACK_GAME_MODES,
  });

  const seasonsQuery = useQuery({
    queryKey: ['valorant-seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valorant_seasons')
        .select('*')
        .order('start_time');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
  });

  const actsQuery = useQuery({
    queryKey: ['valorant-acts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valorant_acts')
        .select('*')
        .order('start_time');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
  });

  const eventsQuery = useQuery({
    queryKey: ['valorant-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('valorant_events')
        .select('*')
        .order('start_time');
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
  });

  useEffect(() => {
    if (agentsQuery.data) {
      setAgents(agentsQuery.data);
    }
  }, [agentsQuery.data, setAgents]);

  useEffect(() => {
    if (mapsQuery.data) {
      setMaps(mapsQuery.data);
    }
  }, [mapsQuery.data, setMaps]);

  useEffect(() => {
    if (gameModesQuery.data) {
      setGameModes(gameModesQuery.data);
    }
  }, [gameModesQuery.data, setGameModes]);

  useEffect(() => {
    if (seasonsQuery.data) {
      setSeasons(seasonsQuery.data);
    }
  }, [seasonsQuery.data, setSeasons]);

  useEffect(() => {
    if (actsQuery.data) {
      setActs(actsQuery.data);
    }
  }, [actsQuery.data, setActs]);

  useEffect(() => {
    if (eventsQuery.data) {
      setEvents(eventsQuery.data);
    }
  }, [eventsQuery.data, setEvents]);
}
