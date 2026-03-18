# CLAUDE.md — Instructions pour Claude Code

## Mémoire persistante

Au **début de chaque session**, lis les fichiers dans `/memory` :
- `memory/decisions.md` — Décisions techniques, choix d'architecture, compromis acceptés
- `memory/people.md` — Personnes impliquées dans le projet, rôles, contacts
- `memory/preferences.md` — Préférences de l'utilisateur (style de code, workflow, outils)
- `memory/user.md` — Profil de l'utilisateur, contexte personnel, niveau technique

À la **fin de chaque session** (ou quand une info importante apparaît en cours de session), mets à jour ces fichiers avec les nouvelles informations apprises.

## Projet : Scrim

- App mobile (iOS + Android) pour organiser des scrims (matchs d'entraînement) entre équipes compétitives
- Jeux supportés au lancement : Valorant, CS2
- Stack : Expo SDK 54, Expo Router v4, TypeScript strict, NativeWind, Supabase, Zustand, React Query
- Backend Supabase déjà configuré (tables, triggers, RLS, storage)
- Auth : Discord OAuth + Google OAuth via Supabase
- Thème adaptatif par jeu (Valorant = rouge, CS2 = or)

## Conventions de code

- TypeScript strict, pas de `any`
- Composants fonctionnels uniquement
- PascalCase pour les composants, camelCase pour fonctions/variables
- Imports avec alias `@/`
- Couleurs depuis `lib/constants.ts`, pas de hardcode (sauf login screen)
- Commentaires en anglais
- Console.log utiles pour le debug en dev
