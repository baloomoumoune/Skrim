# Scrim — Design System

> La charte graphique complète de Scrim, définie lors de la session d'avril 2026.
> Ce document est la source de vérité unique pour tout ce qui touche au design
> dans l'application. Il doit être consulté avant toute décision visuelle, et
> mis à jour dès qu'une règle évolue.
>
> Dernière mise à jour : avril 2026
> Version : 1.0

---

## 1. Philosophie de design

### 1.1 Brief fondateur

Scrim est une app mobile moderne et mature pour la communauté Valorant mondiale,
quel que soit l'âge ou le niveau des joueurs. Son identité visuelle évoque la
confiance, la fluidité et la modernité — dans l'esprit d'Instagram, Revolut ou
TikTok, qui touchent à la fois les jeunes et les adultes sans jamais infantiliser
leur audience. Scrim traite ses utilisateurs comme des compétiteurs sérieux qui
méritent un outil à la hauteur de leur ambition, tout en gardant une énergie et
une fraîcheur qui lui évitent d'être corporate ou ennuyeux. L'utilisateur cible,
qu'il ait 14 ou 34 ans, doit ressentir que Scrim le respecte et l'élève — pas
qu'il essaie de le divertir comme un enfant.

### 1.2 Émotion dominante

La seule émotion que Scrim doit évoquer en priorité est la **confiance**. Tout
choix de design qui renforce la confiance est bon ; tout choix qui l'affaiblit
(criardise, effets inutiles, complexité visuelle gratuite) est mauvais. La
confiance englobe la performance, la sécurité, la fluidité, la maturité et la
cohérence.

### 1.3 Références visuelles

Les marques et apps qui incarnent le bon niveau de maturité moderne pour Scrim :
Apple (dark mode iOS), Revolut, Linear, Arc Browser, Vercel, Instagram, TikTok,
Notion. L'objectif n'est de copier aucune d'elles mais de s'inspirer de leur
équilibre entre minimalisme et personnalité.

### 1.4 Anti-références

Ce à quoi Scrim ne doit jamais ressembler : Twitch (trop fun et coloré),
Discord (dark mode trop "gaming casual"), PRACC (web vieillot), les apps
gaming avec RGB, les apps qui essaient de "faire jeune" avec des couleurs
criardes et des emojis partout. Scrim ne fait pas de culture gaming criarde.

### 1.5 Principes directeurs

- **Cohérence avant créativité** : mieux vaut une app parfaitement cohérente
  qu'une app créative mais incohérente
- **Minimalisme avec âme** : moins mais mieux, jamais vide
- **Maturité inclusive** : mature sans exclure les jeunes, moderne sans
  infantiliser
- **Dark mode par défaut** : parce que les joueurs Valorant jouent souvent
  le soir et parce que le dark mode mature a une signature plus forte
- **Respect de l'utilisateur** : pas de dark patterns, pas d'animations
  gratuites, pas de notifications intrusives

---

## 2. Palette de couleurs

### 2.1 Principe général

Scrim utilise un système monochrome chaud avec un unique accent bleu ciel pâle
`#A8D8FF`. Le monochrome signifie que 85-95% de chaque écran est composé de
noirs, gris et blancs, avec seulement 5-15% d'accent bleu utilisé avec
parcimonie pour les éléments critiques.

### 2.2 Mode dark (défaut)

#### Backgrounds (fonds)

| Token | Hex | Usage |
|---|---|---|
| `bg.primary` | `#0A0A0A` | Fond principal de l'app, écrans, modales fullscreen |
| `bg.secondary` | `#0F0F0F` | Fond de la tab bar, headers, zones légèrement surélevées |
| `bg.elevated` | `#141414` | Cards, modales flottantes, éléments "qui sortent du fond" |
| `bg.elevated.hover` | `#1A1A1A` | État hover/pressed des cards |
| `bg.high` | `#1F1F1F` | Tags, chips, boutons secondaires, éléments à l'intérieur des cards |

#### Borders (bordures)

| Token | Hex | Usage |
|---|---|---|
| `border.subtle` | `#262626` | Bordures par défaut des cards, séparateurs discrets |
| `border.default` | `#2A2A2A` | Bordures des inputs au repos, boutons secondaires |
| `border.strong` | `#3A3A3A` | Bordures hover, éléments focus |
| `border.accent` | `#A8D8FF` | Bordure d'un élément boosté ou sélectionné (usage rare) |

#### Text (textes)

| Token | Hex | Usage |
|---|---|---|
| `text.primary` | `#FAFAFA` | Titres, textes importants, noms |
| `text.secondary` | `#A8A8A8` | Descriptions, infos secondaires, body text |
| `text.tertiary` | `#5A5A5A` | Hints, métadonnées, placeholders |
| `text.disabled` | `#3A3A3A` | Éléments désactivés |

#### Accent (couleur signature)

| Token | Hex | Usage |
|---|---|---|
| `accent.primary` | `#A8D8FF` | Couleur signature, boutons principaux, éléments actifs, CTA |
| `accent.on` | `#0A1E30` | Texte à poser sur un fond `#A8D8FF` |
| `accent.bg.subtle` | `rgba(168, 216, 255, 0.12)` | Fonds clairs pour highlights |
| `accent.border.subtle` | `rgba(168, 216, 255, 0.30)` | Bordures des éléments highlighted subtils |

#### Semantic colors

Ces couleurs sont utilisées avec parcimonie, uniquement pour les états
spécifiques. Elles ne doivent jamais servir de décoration.

| Token | Hex | Usage |
|---|---|---|
| `success` | `#7FD99A` | Validation, match complété, opération réussie |
| `success.bg.subtle` | `rgba(127, 217, 154, 0.12)` | Fonds des toasts succès |
| `error` | `#F87171` | Erreurs, actions destructives, échec |
| `error.bg.subtle` | `rgba(248, 113, 113, 0.12)` | Fonds des toasts erreur |
| `warning` | `#FBBF24` | Warnings, pénalités RR, alertes |
| `warning.bg.subtle` | `rgba(251, 191, 36, 0.12)` | Fonds des badges de pénalité RR |
| `info` | `#A8D8FF` | Identique à l'accent primaire (cohérence) |

### 2.3 Mode light (optionnel)

Le light mode reste accessible depuis les settings de l'app, mais n'est pas
le mode par défaut. Il inverse la logique du dark mode en conservant l'accent
bleu identique.

#### Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `bg.primary` | `#FFFFFF` | Fond principal |
| `bg.secondary` | `#FAFAFA` | Tab bar, headers |
| `bg.elevated` | `#F5F5F5` | Cards |
| `bg.elevated.hover` | `#EEEEEE` | Hover cards |
| `bg.high` | `#E5E5E5` | Tags, chips |

#### Borders

| Token | Hex | Usage |
|---|---|---|
| `border.subtle` | `#EEEEEE` | Bordures par défaut |
| `border.default` | `#E5E5E5` | Bordures inputs |
| `border.strong` | `#D4D4D4` | Hover, focus |
| `border.accent` | `#A8D8FF` | Highlighted (identique au dark) |

#### Text

| Token | Hex | Usage |
|---|---|---|
| `text.primary` | `#0A0A0A` | Titres, textes importants |
| `text.secondary` | `#5A5A5A` | Body text |
| `text.tertiary` | `#A8A8A8` | Hints |
| `text.disabled` | `#D4D4D4` | Désactivés |

#### Accent

L'accent primaire reste `#A8D8FF` en light mode, mais le `accent.on` change :
il devient `#0A1E30` comme en dark (le texte foncé sur fond bleu pâle est
lisible dans les deux modes).

---

## 3. Règles d'usage des couleurs

### 3.1 Le bleu d'accent est rare

L'accent `#A8D8FF` ne doit apparaître que sur **5 à 15% maximum** de chaque
écran. C'est une couleur signature, pas une couleur de remplissage. Les écrans
doivent être dominés par le noir et le blanc, avec le bleu qui ponctue
seulement les éléments interactifs critiques :
- Bouton principal de création de match (le "+")
- État actif de la tab bar
- Badges de compteurs importants (nombre de joueurs)
- CTA de souscription Scrim+
- Bordures de cards highlightées (match boosté ou sélectionné)

Si le bleu apparaît partout, il perd son impact. L'économie crée l'impact.

### 3.2 La hiérarchie des textes est stricte

Chaque texte a un seul niveau autorisé selon sa fonction :
- **Titre** = `text.primary` (#FAFAFA)
- **Description** = `text.secondary` (#A8A8A8)
- **Hint/métadonnée** = `text.tertiary` (#5A5A5A)
- **Élément désactivé** = `text.disabled` (#3A3A3A)

Jamais de mélange. Un titre en `text.secondary` est une erreur. Une
description en `text.primary` aussi.

### 3.3 Les cards ont toujours la même recette

- Fond : `bg.elevated` (#141414)
- Bordure : `0.5px solid border.subtle` (#262626)
- Border-radius : 16px (`radius.lg`)
- Padding interne : 16px (`space.4`)

Sauf si la card est "highlighted" (boostée, sélectionnée), elle prend alors :
- Bordure : `0.5px solid border.accent` (#A8D8FF)
- Glow subtil : `box-shadow: 0 0 0 1px rgba(168, 216, 255, 0.08)`

Jamais d'autres variations de cards.

### 3.4 Texte sur fond bleu

Quand du texte est posé sur un fond `#A8D8FF` (bouton principal, badge BOOST),
il doit utiliser `#0A1E30` (bleu nuit très foncé) et **pas noir pur**. Le noir
pur sur bleu pâle fait "contraste corporate", le bleu nuit foncé sur bleu pâle
fait "harmonie moderne".

### 3.5 Warnings RR Valorant

Quand Scrim affiche les pénalités RR pour les 5-stacks non conformes (règles
documentées dans `docs/valorant-rules.md`), ces badges utilisent `warning`
(#FBBF24) sur fond `warning.bg.subtle`. C'est le seul endroit où une couleur
chaude apparaît dans Scrim, et c'est justifié parce qu'elle signale un risque.
Elle ne doit **jamais** être utilisée pour décorer ou attirer l'œil gratuitement.

### 3.6 Interdictions absolues

- Pas de gradients nulle part
- Pas de couleurs en dehors de la palette définie ci-dessus
- Pas de couleurs par jeu (même quand on ajoutera CS2 ou d'autres jeux dans
  le futur, Scrim reste monochrome)
- Pas de couleurs par rôle Valorant (Duelist, Controller, etc.) — la
  différenciation se fait par icône et label, pas par couleur
- Pas d'utilisation de rouge sauf pour les erreurs critiques

---

## 4. Typographie

### 4.1 Font unique : Inter

Scrim utilise **Inter** comme font unique pour l'ensemble de l'interface.
Pas de seconde font pour les titres, pas d'exception pour le body. Une seule
font partout.

Inter est choisie pour les raisons suivantes :
- Font la plus utilisée au monde par les apps tech modernes en 2026
- Créée spécifiquement pour les interfaces d'écran par Rasmus Andersson
- Support impeccable des caractères français (accents, cédilles, ligatures)
- Licence SIL Open Font (totalement gratuite, libre d'usage)
- Disponible nativement via `@expo-google-fonts/inter`
- Excellente lisibilité à toutes les tailles (de 11px à 32px+)
- Pérennité garantie (standard de facto, ne disparaîtra jamais)

### 4.2 Poids utilisés

Scrim utilise uniquement **trois poids** d'Inter, jamais plus :
- **400 Regular** — pour le body text, les descriptions, les labels courants
- **500 Medium** — pour les titres de section, les labels actifs, les boutons
- **600 SemiBold** — pour les titres principaux (H1, H2)

Les autres poids d'Inter (Light, Bold, ExtraBold, Black) sont **interdits**.
Ils brisent la cohérence et alourdissent le bundle.

### 4.3 Système typographique à 7 niveaux

| Niveau | Taille | Poids | Letter-spacing | Usage |
|---|---|---|---|---|
| **Display** | 32px | 600 | -0.8px | Grands titres marketing, écrans d'onboarding |
| **H1** | 24px | 600 | -0.5px | Titre principal d'un écran |
| **H2** | 18px | 600 | -0.3px | Section, titre de card importante |
| **H3** | 15px | 500 | -0.2px | Sous-titre, titre de card standard |
| **Body** | 14px | 400 | 0 | Texte courant, descriptions |
| **Caption** | 12px | 400 | 0 | Métadonnées, infos secondaires |
| **Label** | 11px | 500 | 0.2px | Labels de boutons, tags, badges |

### 4.4 Règles d'usage de la typographie

- Les titres (Display, H1, H2, H3) sont toujours en `text.primary` (#FAFAFA)
- Le body en `text.secondary` (#A8A8A8) si c'est une description, en
  `text.primary` (#FAFAFA) si c'est un texte important
- Les captions et labels en `text.tertiary` (#5A5A5A) pour les métadonnées,
  en `accent.primary` (#A8D8FF) pour les labels actifs
- Letter-spacing négatif sur les gros titres (Display, H1, H2) parce que
  Inter a tendance à s'étirer à grande taille
- **Jamais d'italique** dans Scrim (incompatible avec le minimalisme)
- **Jamais de MAJUSCULES** sauf pour les labels très courts (BOOST, LIVE, NEW)
- **Jamais de souligné** sauf pour les liens hypertexte exceptionnels
- **Line-height par défaut** : 1.5 pour le body, 1.2 pour les titres

### 4.5 Intégration technique Inter dans Expo

Utiliser le package officiel `@expo-google-fonts/inter` :

```typescript
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
```

Ne jamais installer d'autres poids. Ne jamais utiliser la font système par
fallback (utiliser un splash screen jusqu'au chargement complet).

---

## 5. Système d'arrondis (border-radius)

### 5.1 Échelle à 5 niveaux

| Token | Valeur | Usage |
|---|---|---|
| `radius.none` | 0px | Séparateurs, éléments fullwidth sans bordure |
| `radius.sm` | 8px | Tags, chips, petits badges, inputs |
| `radius.md` | 12px | Boutons, petites cards, modales compactes |
| `radius.lg` | 16px | Cards principales du feed, modales standard |
| `radius.xl` | 20px | Grands containers, écrans d'onboarding, bottom sheets |
| `radius.full` | 9999px | Boutons circulaires, avatars, pills |

### 5.2 Règle critique

**Jamais plus de 2 niveaux d'arrondis différents dans le même écran.** Si tes
cards sont en `radius.lg`, les boutons à l'intérieur sont en `radius.md`. Ne
jamais mélanger 3 ou 4 niveaux, ça crée une sensation d'incohérence subtile
mais néfaste.

### 5.3 Icône de l'app

L'icône iOS/Android de Scrim utilise un rayon de **22.27% de la largeur**
(228px sur 1024px), qui est le standard Apple exact. Ce rayon est déjà
respecté par le logo actuel généré via Recraft.

---

## 6. Système d'espacements

### 6.1 Échelle basée sur 4px

| Token | Valeur | Usage typique |
|---|---|---|
| `space.0` | 0px | Absence d'espace |
| `space.1` | 4px | Entre un icône et son label, très petit gap |
| `space.2` | 8px | Gap entre tags, boutons de toolbar |
| `space.3` | 12px | Gap entre éléments d'une même section |
| `space.4` | 16px | Padding interne standard des cards |
| `space.5` | 20px | Padding horizontal des écrans |
| `space.6` | 24px | Marges verticales entre sections |
| `space.7` | 32px | Grandes séparations entre zones distinctes |
| `space.8` | 48px | Écrans d'onboarding, headings importants |

### 6.2 Règle absolue

**Toujours utiliser un multiple de 4px.** Jamais 5, 7, 15, ou toute valeur
intermédiaire. Si tu as besoin d'une valeur hors échelle, c'est que ton
design a un problème plus profond qu'il faut résoudre autrement.

---

## 7. Élévation et profondeur

### 7.1 Pas d'ombres classiques

Dans un design monochrome dark mode, les `box-shadow` classiques ne fonctionnent
pas (une ombre noire sur fond noir est invisible). Scrim utilise l'élévation
**par contraste de fond**, pas par ombres.

### 7.2 Les 4 niveaux d'élévation

| Niveau | Background | Bordure | Usage |
|---|---|---|---|
| **Ground (0)** | `#0A0A0A` | — | Fond principal de l'écran |
| **Raised (1)** | `#141414` | `0.5px solid #262626` | Cards, éléments surélevés |
| **Floating (2)** | `#1A1A1A` | `0.5px solid #2A2A2A` | Modales, popups, bottom sheets |
| **Top (3)** | `#1F1F1F` | `0.5px solid #3A3A3A` | Tooltips, dropdowns, menus contextuels |

Plus un élément est "haut" dans la hiérarchie visuelle, plus son background
est clair et sa bordure contrastée. C'est subtile mais ça crée une vraie
sensation de profondeur sans ombres.

### 7.3 Exception : le glow accent

Seule exception à la règle "pas d'ombres" : les éléments **boostés Scrim+**
ou **sélectionnés actifs** peuvent avoir un glow subtil bleu : box-shadow: 0 0 0 1px rgba(168, 216, 255, 0.08);
C'est le seul moment où une "ombre" apparaît dans Scrim, et c'est en réalité
un halo lumineux, pas une ombre.

---

## 8. Bordures

### 8.1 Règle d'épaisseur

Scrim utilise **exclusivement des bordures de 0.5px**, jamais plus épaisses,
sauf exception documentée.

- **0.5px par défaut** pour tout : cards, inputs, boutons secondaires, séparateurs
- **1px exceptionnellement** pour les éléments "highlighted" ou "selected"
- **Jamais 2px, 3px ou plus** — ce serait gras et dated

### 8.2 Intégration React Native

En React Native, utiliser `StyleSheet.hairlineWidth` qui donne automatiquement
la valeur 0.5px optimale selon la densité d'écran :

```typescript
import { StyleSheet } from 'react-native';

borderWidth: StyleSheet.hairlineWidth,
borderColor: colors.border.subtle,
```

Jamais utiliser `0.5` en dur dans le code, toujours passer par `hairlineWidth`.

---

## 9. Icônes

### 9.1 Librairie : Lucide Icons

Scrim utilise **Lucide Icons** comme unique librairie d'icônes. Les autres
librairies (Ionicons, Material Icons, FontAwesome, Feather Icons) sont
interdites pour éviter les incohérences visuelles.

Pourquoi Lucide :
- Trait fin et moderne (1.5px par défaut)
- Plus de 1400 icônes couvrant tous les besoins
- Open source (licence ISC)
- Package natif `lucide-react-native`
- Style géométrique cohérent avec Inter

### 9.2 Règles d'usage

- **Style** : outlined uniquement, jamais filled
- **Trait** : 1.5px par défaut, jamais modifier
- **Tailles** :
  - 16px — icônes de badges et tags
  - 20px — icônes de boutons et actions courantes
  - 24px — icônes de tab bar et navigation
  - 32px+ — écrans d'onboarding ou empty states uniquement
- **Couleurs** :
  - `text.secondary` (#A8A8A8) par défaut
  - `text.primary` (#FAFAFA) pour les icônes actives
  - `accent.primary` (#A8D8FF) pour les actions critiques
- **Jamais d'icônes multicolores** — toujours une seule couleur par icône

### 9.3 Migration Ionicons → Lucide

Le code actuel de Scrim utilise Ionicons. La migration vers Lucide est
planifiée dans le Jalon 1.6 "Application de la charte graphique dans le code"
de la roadmap Q2 2026. C'est un travail de search + replace principalement.

---

## 10. Animations

### 10.1 Système à 4 durées

| Token | Durée | Usage |
|---|---|---|
| `duration.instant` | 100ms | Hover, press, changements d'état très rapides |
| `duration.fast` | 200ms | Apparition de petits éléments (tooltips, badges) |
| `duration.medium` | 300ms | Transitions d'écran, modales, bottom sheets |
| `duration.slow` | 500ms | Onboarding, celebrations |

### 10.2 Courbes d'animation (easing)

- **Standard** : `ease-out` pour tout ce qui apparaît (accélération rapide,
  ralentissement en fin)
- **Exit** : `ease-in` pour tout ce qui disparaît (ralentissement progressif)
- **Jamais `ease-in-out`** par défaut (trop mécanique)
- **Jamais `linear`** (robotique)

### 10.3 Principes absolus

1. **Une seule animation à la fois par zone** — jamais 3 choses qui bougent
   en même temps
2. **Support de `prefers-reduced-motion`** — désactiver les animations pour
   les utilisateurs concernés
3. **Jamais d'animations d'attention gratuites** — pas de bounce, pas de
   wobble, pas de spin décoratif
4. **Feedback haptique** sur les actions importantes via `expo-haptics`
   (vibration légère sur tap du bouton principal, match complété, notification)

### 10.4 Exemples concrets

- Tap sur une card : `scale: 0.98` en 100ms + haptic léger
- Ouverture d'une modale : slide-up depuis le bas en 300ms avec ease-out
- Match complété : flash subtil de l'accent bleu en 500ms
- Arrivée d'une notification : slide-in depuis le haut en 300ms avec ease-out

---

## 11. Logo Scrim

### 11.1 Le logo officiel

Le logo de Scrim est un **lettermark "S"** géométrique, blanc cassé `#F0EEE6`
sur fond noir profond `#0A0A0A`, avec un point accent bleu ciel pâle `#A8D8FF`
placé dans le creux supérieur du S. Les extrémités du S sont coupées droites
(pas arrondies) pour donner un caractère architectural et mature.

Le logo a été généré via Recraft V3 en avril 2026 et validé comme version v1.
Le fichier source se trouve dans `design-assets/logo/` du repo.

### 11.2 Variantes à créer au fil du temps

La v1 du logo actuellement disponible est l'icône principale (carrée, 1024x1024).
Les variantes suivantes restent à créer quand le besoin se présente :
- **Wordmark horizontal** : le S + "Scrim" en Inter SemiBold à côté
- **Symbole isolé** : le S + point bleu sur fond transparent
- **Version monochrome** : le S blanc sans le point bleu
- **Version inversée** : le S noir sur fond blanc (pour light mode et
  documents imprimés)
- **Favicon micro** : version simplifiée optimisée pour 16x16

Ces variantes peuvent être créées via Figma (manuellement) ou via d'autres
générations IA guidées par les prompts du document de session d'avril 2026.

### 11.3 Safe area du logo

Le S ne doit jamais dépasser 80% de la largeur du carré. La safe area de
10% de chaque côté est nécessaire pour que le logo reste lisible sur
toutes les plateformes (iOS peut appliquer des masques arrondis qui coupent
les extrémités).

### 11.4 Interdictions

- Jamais de modification des proportions du logo (pas d'étirement)
- Jamais de changement de couleur du S ou du point bleu
- Jamais d'ajout d'effets (gradient, shadow, glow) sauf sur le splash screen
  marketing qui est une exception documentée
- Jamais d'utilisation du logo sur un fond qui contraste mal (fond jaune,
  fond rose, etc.) — privilégier toujours un fond noir ou blanc

---

## 12. Composants de base

### 12.1 Boutons

**Bouton primaire** (action principale, une seule fois par écran) :
- Background : `accent.primary` (#A8D8FF)
- Text : `accent.on` (#0A1E30) en Inter 500 Medium 14px
- Border-radius : `radius.md` (12px)
- Padding : 12px vertical, 20px horizontal
- Height : 44px (standard tactile)

**Bouton secondaire** (actions secondaires) :
- Background : `bg.elevated` (#141414)
- Border : `0.5px solid border.default` (#2A2A2A)
- Text : `text.primary` (#FAFAFA) en Inter 500 Medium 14px
- Border-radius : `radius.md` (12px)
- Padding : 12px vertical, 20px horizontal
- Height : 44px

**Bouton ghost** (actions tertiaires, annulations) :
- Background : transparent
- Text : `text.secondary` (#A8A8A8) en Inter 500 Medium 14px
- Padding : 12px vertical, 20px horizontal
- Height : 44px

### 12.2 Inputs

- Background : `bg.elevated` (#141414)
- Border : `0.5px solid border.default` (#2A2A2A)
- Border focus : `0.5px solid accent.primary` (#A8D8FF) + halo subtil
- Text : `text.primary` (#FAFAFA) en Inter 400 Regular 14px
- Placeholder : `text.tertiary` (#5A5A5A)
- Border-radius : `radius.sm` (8px)
- Padding : 12px horizontal, 14px vertical
- Height : 44px

### 12.3 Tags et chips

- Background : `bg.high` (#1F1F1F)
- Text : `text.secondary` (#A8A8A8) en Inter 500 Medium 11px
- Border-radius : `radius.full` (pill)
- Padding : 4px vertical, 11px horizontal

### 12.4 Cards (feed, matches)

- Background : `bg.elevated` (#141414)
- Border : `0.5px solid border.subtle` (#262626)
- Border-radius : `radius.lg` (16px)
- Padding : 16px (`space.4`)
- Espacement entre cards : 12px (`space.3`)

Card highlightée (match boosté ou sélectionné) :
- Border : `0.5px solid border.accent` (#A8D8FF)
- Glow : `box-shadow: 0 0 0 1px rgba(168, 216, 255, 0.08)`

### 12.5 Tab bar

- Background : `bg.secondary` (#0F0F0F)
- Border-top : `0.5px solid border.subtle` (#262626)
- Height : 64px (standard iOS) + safe area bottom
- Icons : Lucide 24px, outlined 1.5px
- Icon inactif : `text.tertiary` (#5A5A5A)
- Icon actif : `accent.primary` (#A8D8FF)
- Label : Inter 500 Medium 10px
- Bouton central (+) : background `accent.primary`, border-radius 14px,
  40x40px, flotte légèrement au-dessus de la tab bar (-20px margin-top)

### 12.6 Modales et bottom sheets

- Background : `bg.elevated` (#141414) ou `#1A1A1A` (floating)
- Border-radius haut : `radius.xl` (20px) pour les bottom sheets
- Border-radius : `radius.lg` (16px) pour les modales centrées
- Overlay derrière : `rgba(0, 0, 0, 0.6)` (noir semi-transparent)
- Handle bar en haut des bottom sheets : 40px × 4px, `border.strong` (#3A3A3A)
- Padding interne : 24px (`space.6`) horizontal et vertical

---

## 13. Principes d'application dans le code

### 13.1 Design tokens centralisés

Tout le design system est implémenté dans un fichier unique
`lib/design-tokens.ts` (à créer dans le Jalon 1.6) qui exporte des objets
typés pour les couleurs, les espacements, les arrondis, les durées d'animation,
et les styles typographiques.

Aucune valeur hardcodée dans les composants. Jamais de `color: '#A8D8FF'`
ou `padding: 16` en dur dans le code. Toujours passer par les tokens.

### 13.2 Thème light/dark via hook

Un hook `useTheme()` (à créer dans le Jalon 1.6) expose les tokens adaptés
au mode courant (light ou dark) et réagit automatiquement aux changements de
mode. Tous les composants l'utilisent pour accéder aux couleurs.

### 13.3 Composants réutilisables

Les composants de base (Button, Input, Card, Tag, Modal) sont implémentés
comme des composants réutilisables stricts qui appliquent automatiquement les
règles du design system. Le développeur (toi ou Claude Code) n'a jamais à
reprendre les valeurs des tokens, juste à utiliser les composants.

### 13.4 Typographie sémantique

Pour les textes, on utilise des composants `<Text variant="h1">`,
`<Text variant="body">`, etc. qui appliquent automatiquement la bonne taille,
le bon poids, le bon letter-spacing et la bonne couleur selon le niveau.

---

## 14. Changelog

- **2026-04** : Création initiale du design system lors de la session dédiée.
  Palette monochrome chaude avec accent `#A8D8FF` validée. Typographie Inter
  validée. Système d'arrondis, d'espacements, d'élévation et d'animations
  définis. Logo v1 généré via Recraft V3 et validé.