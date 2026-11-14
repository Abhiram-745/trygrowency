// A scroll-driven reflection travels across the type; the trailing surface
// keeps its silver finish until the erosion wave reaches it.
export const TEXT_METAL = /* glsl */ `
vec3 metalInk(vec2 uv, float progress, vec3 ink) {
  float front = mix(-0.18, 1.22, progress);
  float coord = uv.x + uv.y * 0.06;
  float silver = 1.0 - smoothstep(front - 0.09, front + 0.02, coord);
  // Broad dark-to-silver reflections give the letters a curved metal face.
  // A narrow leading glint and a softer trailing band travel with scrolling.
  float ridge = uv.y * 15.0 + uv.x * 2.5 - progress * 5.0;
  float reflection = 0.5 + 0.5 * sin(ridge);
  vec3 chrome = mix(vec3(0.12, 0.15, 0.20), vec3(0.64, 0.70, 0.77), reflection);
  chrome += pow(0.5 + 0.5 * sin(ridge * 1.9 + 0.8), 12.0) * 0.12;
  float streak = exp(-pow((coord - front + 0.025) / 0.024, 2.0));
  float wake = exp(-pow((coord - front + 0.10) / 0.07, 2.0));
  return mix(ink, chrome, silver) + streak * 0.62 + wake * 0.12;
}`;
