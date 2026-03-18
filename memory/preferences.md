# Préférences

## Communication
- L'utilisateur communique en **français**
- Les commentaires dans le code restent en **anglais**
- Réponses directes et concises préférées

## Workflow
- Développement avec **EAS development build** sur téléphone physique (Samsung S22+, iPhone)
- Pas de .env — clés Supabase en dur dans le code pour le dev
- Utilise npm (pas yarn ni pnpm), toujours avec --legacy-peer-deps
- L'utilisateur lance les builds EAS lui-même, ne pas les lancer automatiquement
- L'utilisateur gère la config Supabase Dashboard lui-même (SQL, triggers, auth)

## Code style
- TypeScript strict, zéro `any`
- `useSafeAreaInsets()` au lieu de `<SafeAreaView>` (crash résolu)
- Pas de sur-ingénierie, aller droit au but
- Tester après chaque changement significatif
