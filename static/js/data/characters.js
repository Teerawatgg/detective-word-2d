/* People shared by every case.

   DW_CHARACTERS      the two playable detectives (picked on the start screen)
   DW_POLICE_LOOKS    police uniforms; every case has an officer wearing one

   A "look" is what engine/sprites.js draws: skin, hair colour + hairStyle
   (short, bob, long, pony, bun, spiky, curly, cap, fedora), top, bottom,
   shoes, eye, and optional accent (hat colour), badge, glasses, collar.
   Every other NPC look lives in its own case file. */
"use strict";

window.DW_CHARACTERS = [
  {
    id: "blue", name: "Rookie Blue",
    skin: "#f0c39a", hair: "#4a3122", hairStyle: "spiky",
    top: "#1c2d4f", bottom: "#17233d", shoes: "#241d18",
    accent: "#d4a72c", eye: "#20232e", badge: true, glasses: true
  },
  {
    id: "red", name: "Rookie Red",
    skin: "#e7b287", hair: "#241d1d", hairStyle: "bob",
    top: "#6f2430", bottom: "#26221f", shoes: "#1c1c1c",
    accent: "#d4a72c", eye: "#2a1f1f", badge: true
  }
];

window.DW_POLICE_LOOKS = {
  officerA: { skin: "#e4b187", hair: "#33231d", hairStyle: "short", top: "#233a63", bottom: "#17233d", shoes: "#20242e", accent: "#d4a72c", badge: true, eye: "#241a15" },
  officerB: { skin: "#caa07a", hair: "#171717", hairStyle: "cap", top: "#233a63", bottom: "#17233d", shoes: "#20242e", accent: "#0b132b", badge: true, eye: "#1c1c1c" }
};
