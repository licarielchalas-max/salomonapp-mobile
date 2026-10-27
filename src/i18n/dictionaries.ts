import { registerDictionary, type Dict } from '../lib/i18n';
import { PART1 } from './part1';
import { PART2 } from './part2';
import { PART3 } from './part3';
import { PART4 } from './part4';
import { PART5 } from './part5';
import { PART6 } from './part6';
import { PART7 } from './part7';
import { PART8 } from './part8';

// Cada bloque es una lista [español, inglés, francés]; el español es la llave.
const en: Dict = {};
const fr: Dict = {};
for (const part of [PART1, PART2, PART3, PART4, PART5, PART6, PART7, PART8]) {
  for (const [es, english, french] of part) {
    en[es] = english;
    fr[es] = french;
  }
}

registerDictionary('en', en);
registerDictionary('fr', fr);
