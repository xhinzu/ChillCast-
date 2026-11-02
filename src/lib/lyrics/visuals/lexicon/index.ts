import { VisualConcept } from '../types';
import { NATURE_LEXICON } from './nature';
import { WEATHER_LEXICON } from './weather';
import { EMOTIONS_LEXICON } from './emotions';
import { BODY_LEXICON } from './body';
import { OBJECTS_LEXICON } from './objects';
import { VEHICLES_LEXICON } from './vehicles';
import { PLACES_LEXICON } from './places';
import { ANIMALS_LEXICON } from './animals';
import { FOOD_DRINK_LEXICON } from './foodDrink';
import { MUSIC_LEXICON } from './music';
import { MONEY_LUXURY_LEXICON } from './moneyLuxury';
import { TIME_SPACE_LEXICON } from './timeSpace';
import { FANTASY_DARK_LEXICON } from './fantasyDark';
import { PARTY_NIGHT_LEXICON } from './partyNight';
import { RELATIONSHIPS_LEXICON } from './relationships';
import { ACTIONS_LEXICON } from './actions';
import { COLORS_LEXICON } from './colors';
import { SLANG_LEXICON } from './slang';
import { SPANISH_STUB_LEXICON } from './esStub';

export const ENGLISH_LEXICON: VisualConcept[] = [
  ...NATURE_LEXICON,
  ...WEATHER_LEXICON,
  ...EMOTIONS_LEXICON,
  ...BODY_LEXICON,
  ...OBJECTS_LEXICON,
  ...VEHICLES_LEXICON,
  ...PLACES_LEXICON,
  ...ANIMALS_LEXICON,
  ...FOOD_DRINK_LEXICON,
  ...MUSIC_LEXICON,
  ...MONEY_LUXURY_LEXICON,
  ...TIME_SPACE_LEXICON,
  ...FANTASY_DARK_LEXICON,
  ...PARTY_NIGHT_LEXICON,
  ...RELATIONSHIPS_LEXICON,
  ...ACTIONS_LEXICON,
  ...COLORS_LEXICON,
  ...SLANG_LEXICON,
];

export const LEXICON_BY_LANG: Record<string, VisualConcept[]> = {
  en: ENGLISH_LEXICON,
  es: SPANISH_STUB_LEXICON,
};

export { SPANISH_STUB_LEXICON };

export function getLexiconForLocale(locale = 'en'): VisualConcept[] {
  const lang = locale.toLowerCase().split('-')[0];
  return LEXICON_BY_LANG[lang] || ENGLISH_LEXICON;
}
