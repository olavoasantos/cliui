import type {LayoutBox} from './index';

/** A wrapped flex line produced during layout. */
export interface FlexLine {
  children: LayoutBox[];
  crossSize: number;
}
