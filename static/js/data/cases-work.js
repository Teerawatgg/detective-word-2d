/* Cases 8–10: Workplace English — agendas, polite requests, shift
   handovers, hotel check-in, leave requests, reply-all emails, plus one tense
   question each. Same shape as cases-detective.js. Thai text:
   thai-dialogue.js, thai-content.js. */
(function () {
  "use strict";
  const M = window.DW_MAPKIT;
  const POLICE = window.DW_POLICE_LOOKS;
  const LOOK = {
    pearlBun: { skin: "#f5d5b5", hair: "#5e4632", hairStyle: "bun", top: "#e8e1d4", bottom: "#3d4451", shoes: "#2b2b2b", eye: "#2c1f16", glasses: true, glassesColor: "#6e5b47" },
    blueShort: { skin: "#d39a6e", hair: "#1e1915", hairStyle: "short", top: "#5dade2", bottom: "#2c3e50", shoes: "#1b1b1b", eye: "#1a120d" },
    roseLong: { skin: "#f6d0b1", hair: "#2a1b14", hairStyle: "long", top: "#e59866", bottom: "#4a3b35", shoes: "#2a201b", eye: "#2a1a12" },
    charcoalSpiky: { skin: "#e9be97", hair: "#3b3b3b", hairStyle: "spiky", top: "#2e2e38", bottom: "#1b1b22", shoes: "#111111", eye: "#151515", collar: "#ffffff" },
    whiteSuitShort: { skin: "#a0673f", hair: "#0f0c0a", hairStyle: "short", top: "#f2f2f2", bottom: "#2b2b2b", shoes: "#141414", eye: "#100b08", collar: "#1f2a44" },
    sandFedora: { skin: "#f0c8a0", hair: "#7a6a58", hairStyle: "fedora", top: "#8e7f6a", bottom: "#4b4238", shoes: "#2b241d", accent: "#3a3226", eye: "#2a2118" },
    burgundyPony: { skin: "#e5b38b", hair: "#191212", hairStyle: "pony", top: "#7b1e3c", bottom: "#2b1a22", shoes: "#1a1214", eye: "#1a1010" },
    mintCap: { skin: "#c88b5e", hair: "#1a1410", hairStyle: "cap", top: "#76d7c4", bottom: "#34495e", shoes: "#1f1f1f", accent: "#1a5276", eye: "#140e0a" },
    lilacCurl: { skin: "#f2c6a6", hair: "#2c1f1a", hairStyle: "curly", top: "#bb8fce", bottom: "#4a3b55", shoes: "#241c28", eye: "#2a1c14" },
    oliveBob: { skin: "#d7a27a", hair: "#3e2a1c", hairStyle: "bob", top: "#6b7a3a", bottom: "#33391f", shoes: "#1e1e16", eye: "#22170f", glasses: true, glassesColor: "#2b2b2b" },
    tieShort: { skin: "#f1c7a0", hair: "#8a5a2b", hairStyle: "short", top: "#1b4f72", bottom: "#1b2631", shoes: "#141414", eye: "#2a1c10", collar: "#f4d03f" },
    goldPony: { skin: "#ffe1c4", hair: "#c9a227", hairStyle: "pony", top: "#d35400", bottom: "#3b2a20", shoes: "#2a1d14", eye: "#3a2a16" },
    stripeCurl: { skin: "#ae7350", hair: "#120e0b", hairStyle: "curly", top: "#2e86c1", bottom: "#1c2833", shoes: "#151515", eye: "#100a07", glasses: true, glassesColor: "#1a1a1a" }
  };

  /* =====================================================================
     CASE 8 — The Missing Contract  (Beginner, Harbor & Co. office)
  ===================================================================== */
  const map8 = M.gridMap({
    id: "harbor-office", name: "Harbor & Co. Office",
    cols: [260, 392, 260], rows: [276, 276],
    cells: [
      [{ label: "RECEPTION", floor: "#e3dccb" }, { label: "OPEN OFFICE", floor: "#d5dae2" }, { label: "MANAGER'S OFFICE", floor: "#d8d0c2" }],
      [{ label: "CAFÉ CORNER", floor: "#e6d9c2" }, { label: "MEETING ROOM", floor: "#cfd8cf" }, { label: "COPY ROOM", floor: "#d2d2d6" }]
    ],
    furniture: [
      { x: 50, y: 60, w: 130, h: 40, kind: "counter" },
      { x: 320, y: 60, w: 100, h: 40, kind: "desk" },
      { x: 540, y: 60, w: 100, h: 40, kind: "desk" },
      { x: 330, y: 220, w: 100, h: 40, kind: "desk" },
      { x: 790, y: 60, w: 110, h: 44, kind: "desk" },
      { x: 890, y: 150, w: 30, h: 110, kind: "shelf" },
      { x: 50, y: 520, w: 150, h: 34, kind: "counter" },
      { x: 400, y: 400, w: 160, h: 70, kind: "desk" },
      { x: 850, y: 340, w: 60, h: 50, kind: "printer" },
      { x: 880, y: 440, w: 34, h: 100, kind: "shelf" }
    ]
  });

  const case8 = {
    id: "missing-contract", title: "The Missing Contract", difficulty: "Beginner",
    category: "work", scene: "school",
    location: "Harbor & Co. Office", map: map8,
    description: "A signed contract for an important client disappeared from the meeting room just before the 10 a.m. meeting. Read the office emails and notes, talk to the staff, and find at least three clues.",
    playerStart: { x: 100, y: 250 },
    minimumClues: 3, officerId: "officer", culpritId: "henry", proofId: "copycam",
    contradictions: { 0: ["copycam"], 1: ["copycam"] },
    confession: "I'm starting a new job at a rival company next month. I wanted to take the prices with me, so I copied the contract and hid the original in my bag.",
    solution: "Henry said he was out of office at the dentist until eleven and had not touched the contract, but the copy room camera shows him at the copier at 9:40 a.m. holding the blue BLUEFIN folder.",
    npcs: [
      { id: "officer", name: "Officer Ruiz", role: "Police Officer", x: 150, y: 200, look: POLICE.officerB,
        lines: [
          "An important contract has gone missing from the meeting room.",
          "Office English is full of clues — read the emails, the notes and the calendar.",
          "Find at least three clues before you accuse anyone."
        ] },
      { id: "grace", name: "Ms. Grace", role: "Office Manager", x: 760, y: 200, look: LOOK.pearlBun,
        lines: [
          "The Bluefin contract was on the meeting room table at nine o'clock.",
          "At ten, when the client arrived, it was gone, so we had to postpone the meeting.",
          "Henry asked me for the contract this morning, but I told him it had to stay in the meeting room."
        ] },
      { id: "henry", name: "Henry", role: "Suspect", x: 480, y: 160, look: LOOK.charcoalSpiky,
        lines: [
          "I was out of office at the dentist until eleven this morning.",
          "I haven't touched the Bluefin contract all week."
        ] },
      { id: "daniel", name: "Daniel", role: "Suspect", x: 150, y: 420, look: LOOK.blueShort,
        lines: [
          "I went across the street to buy coffee for the client at about half past nine.",
          "I came back at a quarter to ten and waited in reception."
        ] },
      { id: "amy", name: "Amy", role: "Suspect", x: 220, y: 140, look: LOOK.roseLong,
        lines: [
          "I was at the front desk all morning, answering phone calls.",
          "Henry walked past my desk at about twenty to ten. I thought he was at the dentist!"
        ] }
    ],
    clues: [
      { id: "agenda", name: "Meeting Agenda", icon: "📑", x: 480, y: 520,
        text: "Today's agenda: '10:00 a.m. — contract signing with Bluefin Foods. Please arrive ten minutes early.'",
        question: "q1" },
      { id: "email", name: "Email Printout", icon: "📧", x: 370, y: 140,
        text: "Henry, 9:12 a.m.: 'Could you send me the Bluefin contract, please? I'd like to check the prices.' Grace, 9:15 a.m.: 'Sorry, it has to stay in the meeting room.'",
        question: "q2" },
      { id: "copycam", name: "Copy Room Camera", icon: "📹", x: 760, y: 520,
        text: "The copy room camera shows Henry at the copier at 9:40 a.m., holding a blue folder marked BLUEFIN." },
      { id: "calendar", name: "Team Calendar", icon: "📅", x: 590, y: 140,
        text: "The team calendar for today: 'Henry — out of office 9:00–11:00 (dentist). Grace — Bluefin meeting at 10:00.'",
        question: "q3" },
      { id: "cafe", name: "Café Receipt", icon: "🧾", x: 230, y: 480,
        text: "A receipt from the café across the street shows Daniel bought two coffees at 9:35 a.m." }
    ],
    questions: [
      { id: "q1", topic: "work", term: "agenda", prompt: "The 'agenda' lists today's meeting. What is an agenda?",
        choices: ["A list of the things planned for a meeting or a day", "A signed contract", "A kind of office chair", "A list of phone numbers"],
        correct: 0, hint: "You read it before a meeting to know what will happen.",
        explain: "An agenda is a list of the topics or events planned for a meeting or a day." },
      { id: "q2", topic: "work", term: "request", prompt: "Henry wanted the contract. Which request is the most polite?",
        choices: ["Could you send me the contract, please?", "Send me the contract now.", "Give contract.", "You must send me the contract."],
        correct: 0, hint: "Polite requests often start with Could you… and end with please.",
        explain: "'Could you…, please?' is a polite way to ask a colleague for something. Orders like 'Send me…' or 'You must…' sound rude at work." },
      { id: "q3", topic: "tense", term: "sign", prompt: "At nine o'clock Grace told the team: \"We ___ (sign) the Bluefin contract at ten. It's on the agenda.\"",
        choices: ["are going to sign", "signed", "have signed", "were signing"],
        correct: 0, hint: "At nine o'clock the signing was a plan for later that morning.",
        explain: "Use be going to + base verb for a plan that has already been decided: we are going to sign at ten." }
    ]
  };

  /* =====================================================================
     CASE 9 — The Night Shift  (Intermediate, Grand Palm Hotel)
  ===================================================================== */
  const map9 = M.gridMap({
    id: "grand-palm-hotel", name: "Grand Palm Hotel",
    cols: [300, 306, 306], rows: [276, 276],
    cells: [
      [null, { label: "FRONT DESK", floor: "#e6dcc5" }, { label: "MANAGER'S OFFICE", floor: "#d9d1c3" }],
      [{ label: "STAFF LOCKERS", floor: "#d0d4d8" }, { label: "LOBBY", floor: "#e9e0cc" }, { label: "LUGGAGE ROOM", floor: "#d6cdbd" }]
    ],
    furniture: [
      { x: 360, y: 120, w: 200, h: 40, kind: "counter" },
      { x: 780, y: 60, w: 110, h: 44, kind: "desk" },
      { x: 890, y: 150, w: 30, h: 110, kind: "shelf" },
      { x: 50, y: 330, w: 120, h: 40, kind: "locker" },
      { x: 50, y: 510, w: 120, h: 40, kind: "locker" },
      { x: 380, y: 520, w: 120, h: 36, kind: "bench" },
      { x: 860, y: 360, w: 50, h: 50, kind: "crate" },
      { x: 860, y: 480, w: 50, h: 50, kind: "crate" }
    ]
  });

  const case9 = {
    id: "night-shift", title: "The Night Shift", difficulty: "Intermediate",
    category: "work", scene: "museum",
    location: "Grand Palm Hotel", map: map9,
    description: "A guest's cash deposit disappeared from the front desk drawer overnight. Hotels write down who is on duty and when — check the shift records and find at least four clues.",
    playerStart: { x: 420, y: 460 },
    minimumClues: 4, officerId: "officer", culpritId: "rosa", proofId: "clockout",
    contradictions: { 0: ["clockout"], 1: ["jacket"] },
    confession: "I needed the money for my rent. I waited in the staff room after my shift, and when Kevin left the desk I took the envelope from the drawer.",
    solution: "Rosa said she went straight home after the 11 p.m. handover, but her staff card clocked out at 1:20 a.m. — and the missing envelope for Room 512 was found in the pocket of her jacket.",
    npcs: [
      { id: "officer", name: "Officer Lane", role: "Police Officer", x: 470, y: 400, look: POLICE.officerA,
        lines: [
          "A guest's deposit envelope went missing from the front desk overnight.",
          "Hotels write down who is on duty and when. Check the shift records.",
          "Find at least four clues before you make an accusation."
        ] },
      { id: "ahmed", name: "Mr. Ahmed", role: "Hotel Manager", x: 740, y: 180, look: LOOK.whiteSuitShort,
        lines: [
          "A guest's cash deposit disappeared from the front desk drawer last night.",
          "Only the receptionist on duty should have the drawer key.",
          "I'm very sorry about this. We take every complaint seriously."
        ] },
      { id: "dale", name: "Mr. Dale", role: "Hotel Guest", x: 560, y: 470, look: LOOK.sandFedora,
        lines: [
          "I left a cash deposit in an envelope at the front desk when I checked in.",
          "This morning I asked for it back, and the drawer was empty! I'd like to make a complaint."
        ] },
      { id: "rosa", name: "Rosa", role: "Suspect", x: 220, y: 440, look: LOOK.burgundyPony,
        lines: [
          "My shift ended at eleven, and I went straight home after the handover.",
          "I haven't been near the front desk since eleven o'clock last night."
        ] },
      { id: "kevin", name: "Kevin", role: "Suspect", x: 460, y: 210, look: LOOK.mintCap,
        lines: [
          "I started my shift at eleven, and Rosa gave me the drawer key.",
          "Around one o'clock I left the desk for fifteen minutes to help a guest with heavy bags."
        ] },
      { id: "sunny", name: "Sunny", role: "Suspect", x: 760, y: 440, look: LOOK.lilacCurl,
        lines: [
          "I was cleaning rooms on the fifth floor from midnight until three.",
          "I didn't come down to the lobby at all last night."
        ] }
    ],
    clues: [
      { id: "handover", name: "Shift Handover Note", icon: "📝", x: 380, y: 80,
        text: "Evening shift handover, 11:00 p.m.: 'Deposit envelope for Room 512 is in the top drawer. Drawer key given to Kevin.' Signed: Rosa.",
        question: "q1" },
      { id: "clockout", name: "Staff Clock-out Record", icon: "⏱️", x: 250, y: 340,
        text: "Rosa's staff card was used to clock out at 1:20 a.m., more than two hours after her shift ended." },
      { id: "reservation", name: "Reservation Screen", icon: "🛎️", x: 590, y: 90,
        text: "The booking system shows Mr. Dale checked in at 10:40 p.m. and left a cash deposit for Room 512.",
        question: "q2" },
      { id: "cctv", name: "Lobby Camera", icon: "🎥", x: 360, y: 340,
        text: "The lobby camera shows the front desk empty from 12:50 to 1:05 a.m. while Kevin helped a guest with luggage. A person in a black jacket walks behind the desk at 12:58 a.m., but the face is not clear.",
        question: "q3" },
      { id: "jacket", name: "Black Jacket", icon: "🧥", x: 110, y: 420,
        text: "A black jacket with the name badge 'ROSA' hangs in the staff lockers. In its pocket is a hotel envelope marked 'Room 512'." }
    ],
    questions: [
      { id: "q1", topic: "work", term: "handover", prompt: "Rosa wrote a 'handover' note. What is a handover?",
        choices: ["Passing your work and information to the next person on duty", "A thank-you gift for a colleague", "A complaint from a guest", "A spare room key"],
        correct: 0, hint: "Think of handing your work over to someone else.",
        explain: "A handover is when one worker passes their tasks and information to the next person at the end of a shift." },
      { id: "q2", topic: "work", term: "check in", prompt: "Mr. Dale 'checked in' at 10:40 p.m. What does check in mean at a hotel?",
        choices: ["To arrive and register at the front desk", "To pay and leave the hotel", "To clean a guest room", "To book a flight"],
        correct: 0, hint: "The opposite is check out.",
        explain: "To check in means to arrive at a hotel (or an airport) and register at the desk. You check out when you leave." },
      { id: "q3", topic: "tense", term: "help", prompt: "Complete the sentence: \"While Kevin ___ (help) a guest with luggage, someone walked behind the desk.\"",
        choices: ["was helping", "helps", "has helped", "is helping"],
        correct: 0, hint: "While joins a longer past action with a short one that happened in the middle of it.",
        explain: "Use the past continuous after while for the longer action in progress (was helping), and the past simple for the shorter action that interrupted it (walked)." }
    ]
  };

  /* =====================================================================
     CASE 10 — The Office Party  (Advanced, Summit Tower 12th floor)
  ===================================================================== */
  const map10 = M.gridMap({
    id: "summit-tower", name: "Summit Tower, 12th Floor",
    cols: [228, 228, 228, 228], rows: [276, 276],
    cells: [
      [{ label: "LIFT LOBBY", floor: "#dedad0" }, { label: "OPEN OFFICE", floor: "#d6dbe2" }, { label: "ACCOUNTING", floor: "#d9d3c4" }, { label: "HR OFFICE", floor: "#d4cfd9" }],
      [null, { label: "LOUNGE", floor: "#e5d6c4" }, { label: "STAGE", floor: "#d8c9d6" }, { label: "IT CUPBOARD", floor: "#c8ccd2" }]
    ],
    furniture: [
      { x: 50, y: 240, w: 110, h: 36, kind: "bench" },
      { x: 280, y: 60, w: 90, h: 40, kind: "desk" },
      { x: 380, y: 60, w: 80, h: 40, kind: "desk" },
      { x: 510, y: 60, w: 90, h: 40, kind: "desk" },
      { x: 610, y: 60, w: 80, h: 40, kind: "desk" },
      { x: 660, y: 230, w: 30, h: 30, kind: "crate" },
      { x: 820, y: 60, w: 100, h: 44, kind: "desk" },
      { x: 900, y: 130, w: 30, h: 100, kind: "shelf" },
      { x: 280, y: 520, w: 120, h: 36, kind: "bench" },
      { x: 500, y: 330, w: 40, h: 40, kind: "crate" },
      { x: 650, y: 330, w: 40, h: 40, kind: "crate" },
      { x: 880, y: 420, w: 30, h: 120, kind: "server" },
      { x: 740, y: 520, w: 100, h: 30, kind: "shelf" }
    ]
  });

  const case10 = {
    id: "office-party", title: "The Office Party", difficulty: "Advanced",
    category: "work", scene: "station",
    location: "Summit Tower, 12th Floor", map: map10,
    description: "During the year-end party, the staff award — a gift card worth 30,000 baht — vanished from the HR manager's drawer. Everyone was busy, so check who was where, and when. Find at least four clues.",
    playerStart: { x: 80, y: 100 },
    minimumClues: 4, officerId: "officer", culpritId: "jake", proofId: "lift",
    contradictions: { 0: ["lift"], 1: ["replyall"] },
    confession: "I saw the reply-all email and thought nobody would notice during the party. I came back up in the lift, took the card, and left. I'm ashamed of myself.",
    solution: "Jake said he was on leave and never came back to the office, but the lift log shows his card going up to the 12th floor at 5:40 p.m. He also said he had no idea where the gift card was, yet he answered Ms. Tan's reply-all email about her top drawer.",
    npcs: [
      { id: "officer", name: "Officer Moss", role: "Police Officer", x: 130, y: 150, look: POLICE.officerB,
        lines: [
          "A gift card worth thirty thousand baht disappeared during the office party.",
          "The party was busy, so check who was where, and when. The building records don't lie.",
          "This is an advanced case. Read every email carefully before you accuse anyone."
        ] },
      { id: "tan", name: "Ms. Tan", role: "HR Manager", x: 790, y: 200, look: LOOK.oliveBob,
        lines: [
          "The award gift card was in my top drawer at five o'clock.",
          "When I went to get it at six, the drawer was open and the card was gone.",
          "I'm so embarrassed. I accidentally told the whole office where it was."
        ] },
      { id: "jake", name: "Jake", role: "Suspect", x: 560, y: 180, look: LOOK.tieShort,
        lines: [
          "I was on leave all afternoon, and I didn't come back to the office on Friday.",
          "I had no idea where Ms. Tan kept the gift card."
        ] },
      { id: "olivia", name: "Olivia", role: "Suspect", x: 594, y: 470, look: LOOK.goldPony,
        lines: [
          "I was on the stage running the party games from half past five until six.",
          "I never went into the HR office. I was far too busy."
        ] },
      { id: "marcus", name: "Marcus", role: "Suspect", x: 800, y: 400, look: LOOK.stripeCurl,
        lines: [
          "The speakers stopped working at half past five, so I spent half an hour fixing them.",
          "I only left the stage once, to get a cable from the IT cupboard."
        ] }
    ],
    clues: [
      { id: "leave", name: "Leave Request", icon: "🗓️", x: 870, y: 140,
        text: "Jake's leave request: 'On leave Friday afternoon for a family event.' Approved by Ms. Tan.",
        question: "q1" },
      { id: "replyall", name: "Reply-All Email", icon: "📨", x: 330, y: 130,
        text: "4:05 p.m., Ms. Tan to ALL STAFF by mistake: 'The gift card is in my top drawer — don't tell anyone!' 4:07 p.m., Jake: 'Ha! Your secret is safe with me.'",
        question: "q2" },
      { id: "lift", name: "Lift Log", icon: "🛗", x: 190, y: 60,
        text: "The building's lift log shows Jake's staff card going up to the 12th floor at 5:40 p.m. and back down at 5:52 p.m.",
        question: "q3" },
      { id: "photo", name: "Party Photos", icon: "📸", x: 360, y: 420,
        text: "Party photos taken between 5:30 and 6:00 p.m. show Olivia on the stage in every picture, and Marcus fixing the speakers in all but one of them." },
      { id: "giftbox", name: "Empty Gift Card Box", icon: "🎁", x: 630, y: 240,
        text: "The empty gift card box was found in the recycling bin next to the accounting desks." }
    ],
    questions: [
      { id: "q1", topic: "work", term: "on leave", prompt: "Jake was 'on leave' on Friday afternoon. What does on leave mean?",
        choices: ["Officially away from work, with permission", "Working late at the office", "Fired from the company", "Leaving the room for a short break"],
        correct: 0, hint: "You ask HR for it before a holiday.",
        explain: "To be on leave means to be officially away from work for a period, with your employer's permission." },
      { id: "q2", topic: "work", term: "reply all", prompt: "Ms. Tan clicked 'reply all' by mistake. What does reply all mean?",
        choices: ["To answer an email so that everyone who received it gets your answer", "To delete every email in your inbox", "To answer only the person who sent the email", "To send an email to a new person"],
        correct: 0, hint: "All means every person on the email.",
        explain: "Reply all sends your answer to the sender and to everyone else who received the email — so check before you click it!" },
      { id: "q3", topic: "tense", term: "come", prompt: "Jake told the police: \"I didn't come back to the office.\" Report it: Jake said that he ___ back to the office.",
        choices: ["hadn't come", "doesn't come", "hasn't come", "won't come"],
        correct: 0, hint: "In reported speech, the tense moves one step back into the past.",
        explain: "In reported speech the past simple usually moves back to the past perfect: \"I didn't come\" becomes he said that he hadn't come." }
    ]
  };

  window.DW_CASES = window.DW_CASES || [];
  window.DW_CASES.push(case8, case9, case10);
})();
