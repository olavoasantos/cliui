/** Regex for parsing CSI (Control Sequence Introducer) sequences. */
export const CSI_SEQUENCE_REGEX = new RegExp(String.raw`^\u001B\[([0-9;]*)([~A-Za-z])?`);

/** Regex for parsing SGR mouse reporting sequences. */
export const SGR_MOUSE_SEQUENCE_REGEX = new RegExp(
  String.raw`^\u001B\[<([0-9]+);([0-9]+);([0-9]+)([Mm])?`,
);

/** Regex for matching DECRPM mode response sequences. */
export const MODE_RESPONSE_REGEX = new RegExp(String.raw`^\u001B\[\?[0-9;]+\$y`);
