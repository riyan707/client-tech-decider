export type TVTreeOption = {
  label: string;
  value: string;
  next: string | null;
};

export type TVTreeNode = {
  id: string;
  question: string;
  hint?: string;
  options: TVTreeOption[];
};

export const TV_QUIZ_TREE: TVTreeNode[] = [
  {
    id: "display_preference",
    question: "Do you prefer brightness over deeper blacks, or richer contrast?",
    hint: "This helps us narrow down the right display technology for you.",
    options: [
      { label: "Brightness — I watch in a well-lit room", value: "brightness", next: "colour_preference" },
      { label: "Deeper blacks & contrast — I watch in a dark room", value: "contrast", next: "oled_brightness" },
      { label: "No preference", value: "no_preference", next: "price_band" },
    ],
  },
  {
    id: "oled_brightness",
    question: "How important is peak brightness to you on your OLED TV?",
    hint: "OLED TVs vary a lot by brightness tier.",
    options: [
      { label: "Very important — I sometimes watch in daylight", value: "flagship", next: "price_band" },
      { label: "Moderate — mixed lighting conditions", value: "midrange", next: "price_band" },
      { label: "Not important — purely a dark room TV", value: "entry", next: "price_band" },
      { label: "No preference", value: "no_preference", next: "price_band" },
    ],
  },
  {
    id: "colour_preference",
    question: "Do you prefer vivid punchy colours or accurate lifelike colours?",
    hint: "QLED is vivid. MicroRGB / Bravia are more accurate.",
    options: [
      { label: "Vivid & punchy — I love a bold, saturated picture", value: "vivid", next: "price_band" },
      { label: "Accurate & natural — I want colours as the director intended", value: "accurate", next: "price_band" },
      { label: "No preference", value: "no_preference", next: "price_band" },
    ],
  },
  {
    id: "price_band",
    question: "What is your budget?",
    options: [
      { label: "Under £500", value: "under_500", next: "screen_size_pref" },
      { label: "£500 – £1,000", value: "500_1000", next: "screen_size_pref" },
      { label: "£1,000 – £2,000", value: "1000_2000", next: "screen_size_pref" },
      { label: "£2,000+", value: "2000_plus", next: "screen_size_pref" },
      { label: "No preference", value: "no_preference", next: "screen_size_pref" },
    ],
  },
  {
    id: "screen_size_pref",
    question: "What screen size are you looking for?",
    options: [
      { label: 'Under 50"', value: "small", next: "gaming" },
      { label: '50" – 65"', value: "medium", next: "gaming" },
      { label: '65" and above', value: "large", next: "gaming" },
      { label: "No preference", value: "no_preference", next: "gaming" },
    ],
  },
  {
    id: "gaming",
    question: "Do you use your TV for gaming?",
    options: [
      { label: "Yes — I need 120Hz and VRR", value: "serious", next: null },
      { label: "Occasionally", value: "occasional", next: null },
      { label: "No", value: "no", next: null },
      { label: "No preference", value: "no_preference", next: null },
    ],
  },
];

export function getNextTVQuestionId(
  answers: Record<string, string>,
  currentId: string
): string | null {
  const node = TV_QUIZ_TREE.find((n) => n.id === currentId);
  if (!node) return null;
  const selectedOption = node.options.find((o) => o.value === answers[currentId]);
  return selectedOption?.next ?? null;
}

export function getTVQuizFlow(answers: Record<string, string>): string[] {
  const flow: string[] = [TV_QUIZ_TREE[0].id];
  let current = TV_QUIZ_TREE[0].id;
  let safety = 0;
  while (safety++ < 20) {
    const next = getNextTVQuestionId(answers, current);
    if (!next) break;
    flow.push(next);
    current = next;
  }
  return flow;
}
