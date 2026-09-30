// Shared playable bounds for movement, skill collision, weather and the minimap.
export const MAP_HALF=96;
export const MAP_SCALE=MAP_HALF/62;
export const MINIMAP_SCALE=64/MAP_HALF;
export const mapPixel=value=>72+value*MINIMAP_SCALE;
