import type {EDITABLE_STATE} from '../constants/editableState';
import type {EditableState} from '../terminal/types/EditableState';

/** Type helper for elements carrying system-managed editable state. */
export type EditableStateElement = {
  [key in typeof EDITABLE_STATE]: EditableState;
};
