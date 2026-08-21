import type { InterestCategory } from "@nexttour/shared";

/**
 * The cities the planning providers can actually resolve (see CITY_COORDINATES
 * in @nexttour/shared). Each entry carries only facts about the place — no
 * invented prices or ratings, since nothing is quoted until a trip is planned.
 */
export interface Destination {
  city: string;
  region: string;
  blurb: string;
  interests: InterestCategory[];
  featured?: boolean;
}

export const destinations: Destination[] = [
  {
    city: "Goa",
    region: "West Coast",
    blurb: "Shorelines, Portuguese-era quarters and a slow coastal pace across North and South Goa.",
    interests: ["BEACH", "NATURE", "CULTURE"],
    featured: true,
  },
  {
    city: "Jaipur",
    region: "Rajasthan",
    blurb: "Fort ramparts, stepwells and the walled Pink City laid out on a grid four centuries old.",
    interests: ["HISTORY", "CULTURE", "SHOPPING"],
  },
  {
    city: "Varanasi",
    region: "Uttar Pradesh",
    blurb: "Ghats along the Ganga, dawn boat rides and one of the oldest continuously lived-in cities.",
    interests: ["RELIGIOUS", "HISTORY", "CULTURE"],
  },
  {
    city: "Mumbai",
    region: "Maharashtra",
    blurb: "Art Deco seafronts, island caves and a food scene that runs from stalls to fine dining.",
    interests: ["CULTURE", "MUSEUM", "SHOPPING"],
  },
  {
    city: "Delhi",
    region: "National Capital",
    blurb: "Mughal tombs, colonial avenues and museums stacked across a millennium of capitals.",
    interests: ["HISTORY", "MUSEUM", "CULTURE"],
  },
  {
    city: "Bengaluru",
    region: "Karnataka",
    blurb: "Garden city parks, palace grounds and a base for the Western Ghats a few hours out.",
    interests: ["NATURE", "CULTURE", "SHOPPING"],
  },
  {
    city: "Kolkata",
    region: "West Bengal",
    blurb: "Colonial architecture, riverside ghats and the country's densest concentration of galleries.",
    interests: ["CULTURE", "MUSEUM", "HISTORY"],
  },
  {
    city: "Patna",
    region: "Bihar",
    blurb: "Ganga riverfront, Buddhist and Sikh pilgrimage routes and the ruins of ancient Pataliputra.",
    interests: ["RELIGIOUS", "HISTORY", "MUSEUM"],
  },
];

export const destinationFilters: Array<{ label: string; interest?: InterestCategory }> = [
  { label: "All" },
  { label: "Beaches", interest: "BEACH" },
  { label: "Nature", interest: "NATURE" },
  { label: "History", interest: "HISTORY" },
  { label: "Culture", interest: "CULTURE" },
];
