import type { ChogToken } from "./chogs";

export interface CompatibilityProfile {
  interests?: string[] | null;
  looking_for?: string[] | null;
  skills?: string[] | null;
  location?: string | null;
  timezone?: string | null;
  chog?: ChogToken | null;
}

export interface CompatibilityResult {
  score: number;
  reasons: string[];
}

export function calculateCompatibility(
  left: CompatibilityProfile,
  right: CompatibilityProfile,
): CompatibilityResult {
  const reasons: string[] = [];
  let score = 0;
  let availableWeight = 0;

  const interestScore = overlap(left.interests, right.interests);
  if (interestScore !== null) {
    score += interestScore * 30;
    availableWeight += 30;
    reasons.push(...sharedValues(left.interests, right.interests).map((v) => `Shared interest · ${v}`));
  }

  const goalScore = overlap(left.looking_for, right.looking_for);
  if (goalScore !== null) {
    score += goalScore * 25;
    availableWeight += 25;
    reasons.push(...sharedValues(left.looking_for, right.looking_for).map((v) => `Both looking for · ${v}`));
  }

  const skillScore = overlap(left.skills, right.skills);
  if (skillScore !== null) {
    score += skillScore * 15;
    availableWeight += 15;
    reasons.push(...sharedValues(left.skills, right.skills).map((v) => `Shared skill · ${v}`));
  }

  const traitScore = sharedTraitRatio(left.chog?.traits ?? [], right.chog?.traits ?? []);
  if (traitScore !== null) {
    score += traitScore * 20;
    availableWeight += 20;
    reasons.push(...sharedTraits(left.chog?.traits ?? [], right.chog?.traits ?? []));
  }

  if (left.location?.trim() && right.location?.trim()) {
    availableWeight += 5;
    if (normalize(left.location) === normalize(right.location)) {
      score += 5;
      reasons.push(`Both list ${left.location.trim()} as their location`);
    }
  }
  if (left.timezone?.trim() && right.timezone?.trim()) {
    availableWeight += 5;
    if (normalize(left.timezone) === normalize(right.timezone)) {
      score += 5;
      reasons.push(`Both list ${left.timezone.trim()} as their timezone`);
    }
  }

  const finalScore =
    availableWeight === 0
      ? 0
      : Math.max(0, Math.min(100, Math.round((score / availableWeight) * 100)));

  return { score: finalScore, reasons: [...new Set(reasons)].slice(0, 8) };
}

function overlap(left?: string[] | null, right?: string[] | null): number | null {
  if (!left?.length || !right?.length) return null;
  const first = new Set(left.map(normalize));
  const second = new Set(right.map(normalize));
  const union = new Set([...first, ...second]);
  if (union.size === 0) return null;
  let common = 0;
  for (const value of first) if (second.has(value)) common += 1;
  return common / union.size;
}

function sharedValues(left?: string[] | null, right?: string[] | null): string[] {
  if (!left?.length || !right?.length) return [];
  const rightValues = new Set(right.map(normalize));
  return left.filter((value) => rightValues.has(normalize(value)));
}

function sharedTraits(left: ChogToken["traits"], right: ChogToken["traits"]): string[] {
  const rightValues = new Set(
    right.map((trait) => `${normalize(trait.traitType)}:${normalize(trait.traitValue)}`),
  );
  return left
    .filter((trait) => rightValues.has(`${normalize(trait.traitType)}:${normalize(trait.traitValue)}`))
    .map((trait) => `Shared Chog trait · ${trait.traitType}: ${trait.traitValue}`);
}

function sharedTraitRatio(
  left: ChogToken["traits"],
  right: ChogToken["traits"],
): number | null {
  if (!left.length || !right.length) return null;
  const rightValues = new Set(
    right.map((trait) => `${normalize(trait.traitType)}:${normalize(trait.traitValue)}`),
  );
  const common = left.filter((trait) =>
    rightValues.has(`${normalize(trait.traitType)}:${normalize(trait.traitValue)}`),
  ).length;
  return common / Math.max(left.length, right.length);
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
