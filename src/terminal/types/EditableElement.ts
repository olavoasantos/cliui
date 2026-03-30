import type {EDITABLE} from '../constants/editable';
import type {EditableConfiguration} from './EditableConfiguration';

/** Type helper for elements that carry the editable symbol. */
export type EditableElement = {
  [key in typeof EDITABLE]: EditableConfiguration;
};
