/* Cases 1–4: Detective English (investigation vocabulary + one tense question each).

   Every case file has the same shape, described in README.md ("Adding a case"):
   a map built with engine/mapkit.js, NPCs (one officer, witnesses, suspects),
   clues, quizzes, and the "catch the lie" answer (culprit + contradictions).
   Thai text for these cases is in thai-dialogue.js and thai-content.js. */
(function () {
  "use strict";
  const M = window.DW_MAPKIT;
  const POLICE = window.DW_POLICE_LOOKS;
  const LOOK = {
    teacher: { skin: "#f0c9a0", hair: "#5b3625", hairStyle: "bun", top: "#7a5a94", bottom: "#453455", shoes: "#382c22", eye: "#2b1f18" },
    ginger: { skin: "#ffd9b0", hair: "#b3572c", hairStyle: "curly", top: "#3a7d55", bottom: "#26482f", shoes: "#2b2117", eye: "#3b2116" },
    blondePony: { skin: "#f3d0a8", hair: "#d9b24c", hairStyle: "pony", top: "#c25a7a", bottom: "#40354e", shoes: "#2a2320", eye: "#41352a" },
    darkBob: { skin: "#c98456", hair: "#181414", hairStyle: "bob", top: "#2e6f8e", bottom: "#20374b", shoes: "#1b1b1b", eye: "#1a120f" },
    fedoraMan: { skin: "#e0ab7c", hair: "#3d3226", hairStyle: "fedora", top: "#4b4237", bottom: "#332c22", shoes: "#241d16", accent: "#3d3226", eye: "#221a12" },
    capKid: { skin: "#f2c8a2", hair: "#241d1d", hairStyle: "cap", top: "#d97b3f", bottom: "#2c3e50", shoes: "#20242e", accent: "#0b3d91", eye: "#1c140f" },
    longHairW: { skin: "#f6d6ae", hair: "#241f1d", hairStyle: "long", top: "#8d3f5b", bottom: "#3c2c3a", shoes: "#241d18", eye: "#2a1e19" },
    greyTech: { skin: "#e6bd90", hair: "#7c7c7c", hairStyle: "short", top: "#5c6b73", bottom: "#33393d", shoes: "#1e2124", eye: "#242424" },
    bunLady: { skin: "#d69a6b", hair: "#241d1a", hairStyle: "bun", top: "#4f6d4a", bottom: "#2c3a29", shoes: "#211a15", eye: "#1c130f" },
    spikyBoy: { skin: "#eec295", hair: "#1c1c1c", hairStyle: "spiky", top: "#c0392b", bottom: "#2c2c2c", shoes: "#181818", eye: "#181818" },
    auburnCurl: { skin: "#f7d3ab", hair: "#8a3b23", hairStyle: "curly", top: "#3f7f8c", bottom: "#28464e", shoes: "#20201c", eye: "#3a2013" },
    navyPony: { skin: "#c98456", hair: "#241d1d", hairStyle: "pony", top: "#2c3e6b", bottom: "#1c2740", shoes: "#181818", eye: "#161211" },
    silverShort: { skin: "#efc39b", hair: "#b7bec4", hairStyle: "short", top: "#4c5a67", bottom: "#2c343c", shoes: "#1a1e22", eye: "#2b2b2b" },
    blondeBob: { skin: "#ffe0bb", hair: "#e2c05a", hairStyle: "bob", top: "#8a5fb0", bottom: "#42355a", shoes: "#221c2c", eye: "#443626" },
    tealSpiky: { skin: "#d9a57a", hair: "#2e2a26", hairStyle: "spiky", top: "#2f5d62", bottom: "#1f3337", shoes: "#1a1a1a", eye: "#1c1c1c" },
    wineFedora: { skin: "#f1c9a5", hair: "#5a5a5a", hairStyle: "fedora", top: "#5b2333", bottom: "#2d1a20", shoes: "#1e1414", accent: "#2b2b2b", eye: "#2a2020" }
  };

  /* =======================================================================
     CASE 1 — The Missing Laptop  (Beginner, Narin School)
  ======================================================================= */
  const map1 = M.gridMap({
    id: "school-campus", name: "Narin School",
    cols: [300, 306, 306], rows: [246, 306],
    cells: [
      [{ label: "STAFF OFFICE", floor: "#d8d1c3" }, { label: "CLASSROOM 204", floor: "#d8caa8" }, { label: "LIBRARY", floor: "#c9d8c2" }],
      [{ label: "SCHOOL YARD", floor: "#a8c895" }, { label: "HALLWAY", floor: "#c8ced8" }, { label: "EQUIPMENT ROOM", floor: "#cfc6b6" }]
    ],
    furniture: [
      { x: 60, y: 90, w: 110, h: 44, kind: "desk" },
      { x: 355, y: 55, w: 90, h: 40, kind: "desk" },
      { x: 500, y: 55, w: 90, h: 40, kind: "desk" },
      { x: 355, y: 180, w: 80, h: 40, kind: "desk" },
      { x: 690, y: 70, w: 34, h: 150, kind: "shelf" },
      { x: 780, y: 70, w: 34, h: 150, kind: "shelf" },
      { x: 870, y: 70, w: 34, h: 150, kind: "shelf" },
      { x: 60, y: 400, w: 120, h: 54, kind: "bench" },
      { x: 660, y: 320, w: 120, h: 44, kind: "locker" },
      { x: 800, y: 320, w: 100, h: 44, kind: "locker" }
    ]
  });

  const case1 = {
    id: "missing-laptop", title: "The Missing Laptop", difficulty: "Beginner",
    category: "detective", scene: "school",
    location: "Narin School", map: map1,
    description: "A teacher's laptop disappeared from Classroom 204 sometime after four in the afternoon. Talk to everyone, gather at least three clues, and work out who is lying.",
    playerStart: { x: 130, y: 220 },
    minimumClues: 3, officerId: "officer", culpritId: "mike", proofId: "camera",
    /* which of the culprit's lines are false, and which clues prove each one */
    contradictions: { 0: ["camera"], 1: ["camera"] },
    confession: "Okay… I took it. I only wanted to borrow it for my game tournament, and I was going to bring it back tomorrow.",
    solution: "Mike claimed he went straight home at four o'clock, but the security camera recorded him entering Classroom 204 at 4:15 p.m. — right when the laptop went missing.",
    npcs: [
      { id: "officer", name: "Officer Reyes", role: "Police Officer", x: 220, y: 165, look: POLICE.officerA,
        lines: [
          "A laptop went missing from Classroom 204 sometime this afternoon.",
          "Talk to the teacher and the students, and check the library and the yard for clues.",
          "Find at least three pieces of evidence before you make an accusation."
        ] },
      { id: "teacher", name: "Ms. Anna", role: "Teacher", x: 470, y: 225, look: LOOK.teacher,
        lines: [
          "I left the classroom for only fifteen minutes to make photocopies.",
          "When I came back, the laptop bag was empty on my desk.",
          "It was definitely still there at four o'clock — I remember checking the time."
        ] },
      { id: "tom", name: "Tom", role: "Suspect", x: 300, y: 480, look: LOOK.spikyBoy,
        lines: [
          "I was playing football on the school field at four o'clock.",
          "My teammates can confirm exactly where I was the whole time."
        ] },
      { id: "jenny", name: "Jenny", role: "Suspect", x: 750, y: 245, look: LOOK.blondePony,
        lines: [
          "I was reading in the library the entire afternoon.",
          "I signed in before four and didn't leave until five."
        ] },
      { id: "mike", name: "Mike", role: "Suspect", x: 760, y: 380, look: LOOK.capKid,
        lines: [
          "I went straight home right after school ended at four.",
          "I never even walked past Classroom 204 today."
        ] }
    ],
    clues: [
      { id: "note", name: "Teacher's Note", icon: "📝", x: 410, y: 145,
        text: "A short note pinned to the desk: 'Laptop last seen at 4:00 p.m. Do not remove without permission.'",
        question: "q1" },
      { id: "log", name: "Library Sign-in Sheet", icon: "📚", x: 780, y: 235,
        text: "The library log shows Jenny signed in at 3:55 p.m. and signed out at 5:00 p.m.",
        question: "q2" },
      { id: "photo", name: "Team Photo", icon: "📷", x: 170, y: 470,
        text: "A photo taken by a parent clearly shows Tom on the field at 4:10 p.m.",
        question: "q4" },
      { id: "camera", name: "Security Camera", icon: "📹", x: 900, y: 460,
        text: "Hallway footage shows Mike entering Classroom 204 alone at 4:15 p.m., then leaving quickly two minutes later.",
        question: "q3" },
      { id: "fiber", name: "Blue Fiber", icon: "🧵", x: 700, y: 400,
        text: "A single blue fiber, likely from a school jacket, was caught on the empty laptop bag's zipper." }
    ],
    questions: [
      { id: "q1", topic: "vocab", term: "last seen", prompt: "The note says the laptop was 'last seen' at 4:00 p.m. What does last seen mean?",
        choices: ["The most recent time someone noticed it", "The very first time it appeared", "The time it was cleaned", "The time class ended"],
        correct: 0, hint: "Think about the word last on its own.",
        explain: "'Last seen' means the most recent moment someone can confirm they saw the object." },
      { id: "q2", topic: "vocab", term: "sign in", prompt: "Jenny 'signed in' at the library. What does sign in mean?",
        choices: ["To write your name to record your arrival", "To close a book", "To pay a fine", "To leave a building"],
        correct: 0, hint: "Think about what you do at a front desk when you arrive.",
        explain: "To sign in means to write your name (or scan a card) to record that you have arrived somewhere." },
      { id: "q3", topic: "vocab", term: "entering", prompt: "The camera shows Mike 'entering' the classroom. What does entering mean?",
        choices: ["Going into a place", "Leaving a place", "Cleaning a place", "Locking a place"],
        correct: 0, hint: "Enter and exit are opposites.",
        explain: "Entering means going into a place — the opposite of exiting or leaving." },
      { id: "q4", topic: "tense", term: "play", prompt: "Complete Tom's alibi: \"At 4:10 p.m. I ___ (play) football on the field.\"",
        choices: ["was playing", "am playing", "have played", "will play"],
        correct: 0, hint: "The action was in progress at one exact moment in the past.",
        explain: "Use the past continuous (was/were + -ing) for an action in progress at a moment in the past: at 4:10 he was playing." }
    ],
  };

  /* =======================================================================
     CASE 2 — The Vanishing Sculpture  (Intermediate, Bayview Museum)
  ======================================================================= */
  const map2 = M.gridMap({
    id: "bayview-museum", name: "Bayview Museum",
    cols: [300, 306, 306], rows: [306, 246],
    cells: [
      [{ label: "ENTRANCE LOBBY", floor: "#e3ded0" }, { label: "MAIN GALLERY", floor: "#d9d2c0" }, null],
      [{ label: "SECURITY OFFICE", floor: "#c7cbd6" }, { label: "SCULPTURE HALL", floor: "#cdd8d0" }, { label: "WORKSHOP", floor: "#d6c9b7" }]
    ],
    furniture: [
      { x: 55, y: 70, w: 130, h: 40, kind: "counter" },
      { x: 400, y: 60, w: 40, h: 190, kind: "shelf" },
      { x: 520, y: 60, w: 40, h: 190, kind: "shelf" },
      { x: 55, y: 350, w: 130, h: 50, kind: "computer" },
      { x: 480, y: 400, w: 60, h: 60, kind: "crate" },
      { x: 700, y: 410, w: 60, h: 60, kind: "crate" },
      { x: 780, y: 350, w: 90, h: 40, kind: "desk" }
    ]
  });

  const case2 = {
    id: "vanishing-sculpture", title: "The Vanishing Sculpture", difficulty: "Intermediate",
    category: "detective", scene: "museum",
    location: "Bayview Museum",
    description: "A priceless bronze sculpture disappeared from the Sculpture Hall overnight, and the main camera was mysteriously switched off for eleven minutes. Question the staff and find at least four clues before naming a suspect.",
    map: map2, playerStart: { x: 130, y: 260 },
    minimumClues: 4, officerId: "officer", culpritId: "victor", proofId: "glove",
    contradictions: { 0: ["glove", "signin"] },
    confession: "Fine. I switched off the camera and carried the sculpture out to my car. A buyer offered me more than I earn in a year.",
    solution: "Victor claimed he never entered the Sculpture Hall that night, but a glove matching his uniform was found beside the empty pedestal, and the camera was switched off during exactly the eleven minutes he was signed in alone.",
    npcs: [
      { id: "officer", name: "Officer Diaz", role: "Police Officer", x: 220, y: 170, look: POLICE.officerB,
        lines: [
          "The bronze sculpture vanished from the Sculpture Hall sometime after midnight.",
          "The main camera was disabled for eleven minutes — someone knew the system well.",
          "Check the sign-in sheet, the workshop, and speak to every member of staff on duty."
        ] },
      { id: "curator", name: "Ms. Wren", role: "Curator", x: 470, y: 250, look: LOOK.longHairW,
        lines: [
          "I locked the gallery myself at eleven and went straight home.",
          "The sculpture was on its pedestal when I left — I always check before locking up.",
          "Only three people have a key to the Sculpture Hall: myself, the guard, and the technician."
        ] },
      { id: "victor", name: "Victor", role: "Suspect", x: 150, y: 460, look: LOOK.fedoraMan,
        lines: [
          "As the night guard, I stayed at the front desk all night and never went near the Sculpture Hall.",
          "I don't know anything about the camera going offline."
        ] },
      { id: "cleaner", name: "Priya", role: "Suspect", x: 470, y: 100, look: LOOK.bunLady,
        lines: [
          "I mopped the Main Gallery and left before midnight, well before the theft.",
          "I saw the guard near the security office around eleven-thirty."
        ] },
      { id: "artist", name: "Noah", role: "Suspect", x: 900, y: 480, look: LOOK.greyTech,
        lines: [
          "I was repairing the pedestal lighting in the workshop until one in the morning.",
          "I never had a key to the Sculpture Hall itself."
        ] }
    ],
    clues: [
      { id: "signin", name: "Staff Sign-in Sheet", icon: "🗒️", x: 900, y: 450,
        text: "The sheet shows Victor signed in alone in the Sculpture Hall from 12:02 to 12:13 a.m.",
        question: "q1" },
      { id: "cameralog", name: "Camera Control Log", icon: "🖥️", x: 250, y: 460,
        text: "A system log shows the main camera was switched off at 12:03 a.m. and switched back on at 12:14 a.m.",
        question: "q2" },
      { id: "glove", name: "White Cotton Glove", icon: "🧤", x: 580, y: 500,
        text: "A single white cotton glove, part of the guard's uniform, was found beside the empty pedestal.",
        question: "q3" },
      { id: "toolbox", name: "Workshop Toolbox", icon: "🧰", x: 900, y: 400,
        text: "The workshop toolbox is missing a small screwdriver, the exact type used on camera housings." },
      { id: "mop", name: "Damp Mop", icon: "🧹", x: 470, y: 160,
        text: "Priya's mop is still damp, matching her claim that she cleaned before midnight.",
        question: "q4" }
    ],
    questions: [
      { id: "q1", topic: "vocab", term: "alone", prompt: "The sheet says Victor 'signed in alone.' What does alone mean here?",
        choices: ["With no other person present", "With a friend", "Very quickly", "By accident"],
        correct: 0, hint: "Think about being by yourself.",
        explain: "Alone means without any other person present — nobody else was with him." },
      { id: "q2", topic: "vocab", term: "switched off", prompt: "The camera was 'switched off.' What does switched off mean?",
        choices: ["Turned off so it stops working", "Turned on and working", "Moved to another room", "Cleaned and repaired"],
        correct: 0, hint: "The opposite is switched on.",
        explain: "Switched off means turned off, so the device stops recording or working." },
      { id: "q3", topic: "vocab", term: "beside", prompt: "The glove was found 'beside' the pedestal. What does beside mean?",
        choices: ["Right next to something", "Inside something", "Far away from something", "Under something"],
        correct: 0, hint: "Beside sounds like 'by the side of.'",
        explain: "Beside means positioned right next to something, at its side." },
      { id: "q4", topic: "tense", term: "finish", prompt: "Complete the sentence: \"By the time the sculpture vanished, Priya ___ (finish) mopping and gone home.\"",
        choices: ["had finished", "has finished", "finishes", "is finishing"],
        correct: 0, hint: "Which happened first — the mopping or the theft?",
        explain: "Use the past perfect (had + past participle) for an action that was completed before another past event: she had finished before the theft." }
    ],
  };

  /* =======================================================================
     CASE 3 — The Stolen Suitcase  (Intermediate, Riverside Station)
  ======================================================================= */
  const map3 = M.gridMap({
    id: "riverside-station", name: "Riverside Station",
    cols: [456, 456], rows: [184, 184, 184],
    cells: [
      [{ label: "TICKET HALL", floor: "#dfd8c6" }, { label: "WAITING AREA", floor: "#d3d9e0" }],
      [{ label: "PLATFORM 1", floor: "#c7c2b4" }, { label: "PLATFORM 2", floor: "#c2c8ca" }],
      [{ label: "LOST & FOUND", floor: "#dccdb0" }, { label: "STAFF STORAGE", floor: "#cfc6b6" }]
    ],
    furniture: [
      { x: 60, y: 70, w: 130, h: 40, kind: "counter" },
      { x: 560, y: 70, w: 110, h: 46, kind: "bench" },
      { x: 780, y: 70, w: 110, h: 46, kind: "bench" },
      // split in pieces so the doorway lanes above (x 200-304, x 656-760) stay open
      { x: 60, y: 260, w: 128, h: 18, kind: "crate" },
      { x: 316, y: 260, w: 84, h: 18, kind: "crate" },
      { x: 540, y: 260, w: 104, h: 18, kind: "crate" },
      { x: 772, y: 260, w: 108, h: 18, kind: "crate" },
      { x: 60, y: 460, w: 110, h: 44, kind: "desk" },
      { x: 560, y: 470, w: 40, h: 90, kind: "shelf" },
      { x: 680, y: 470, w: 40, h: 90, kind: "shelf" },
      { x: 800, y: 470, w: 40, h: 90, kind: "shelf" }
    ]
  });

  const case3 = {
    id: "stolen-suitcase", title: "The Stolen Suitcase", difficulty: "Intermediate",
    category: "detective", scene: "station",
    location: "Riverside Station",
    description: "A traveller's suitcase was taken from Platform 2 during the evening rush. The station has hundreds of passengers a day, so timing is everything — find at least four clues to narrow down the culprit.",
    map: map3, playerStart: { x: 150, y: 130 },
    minimumClues: 4, officerId: "officer", culpritId: "harlan", proofId: "footage",
    contradictions: { 0: ["footage"], 1: ["footage"] },
    confession: "All right, I crossed to Platform 2. I saw the suitcase alone by the bench, and I just… took it.",
    solution: "Harlan claimed he was on Platform 1 the whole time, but the platform footage clearly shows him crossing to Platform 2 at 6:42 p.m. — the exact minute the suitcase disappeared.",
    npcs: [
      { id: "officer", name: "Officer Blake", role: "Police Officer", x: 220, y: 150, look: POLICE.officerA,
        lines: [
          "A suitcase was stolen from Platform 2 around 6:40 this evening.",
          "The owner says it was brown leather with a red luggage tag.",
          "Check both platforms and the lost & found office, then find at least four clues."
        ] },
      { id: "vendor", name: "Sara", role: "Food Vendor", x: 620, y: 150, look: LOOK.darkBob,
        lines: [
          "I was selling snacks near Platform 2 all evening and never left my cart.",
          "I noticed a man in a grey coat moving between the platforms around that time."
        ] },
      { id: "harlan", name: "Harlan", role: "Suspect", x: 190, y: 340, look: LOOK.navyPony,
        lines: [
          "I stayed on Platform 1 the entire time, waiting for the seven o'clock train.",
          "I never crossed over to Platform 2 at all."
        ] },
      { id: "mira", name: "Mira", role: "Suspect", x: 700, y: 340, look: LOOK.auburnCurl,
        lines: [
          "I was on Platform 2 but my train left at 6:30, before the theft happened.",
          "I didn't see anyone near the brown suitcase before I boarded."
        ] },
      { id: "conductor", name: "Conductor Lee", role: "Suspect", x: 250, y: 540, look: LOOK.silverShort,
        lines: [
          "I checked tickets on Platform 1 until my train departed at 6:45.",
          "I have no reason to take a passenger's bag."
        ] }
    ],
    clues: [
      { id: "tag", name: "Luggage Tag", icon: "🏷️", x: 650, y: 300,
        text: "A torn red luggage tag was found on the floor of Platform 2, matching the owner's description.",
        question: "q1" },
      { id: "footage", name: "Platform Footage", icon: "🎥", x: 900, y: 500,
        text: "Security footage shows a man in a grey coat crossing from Platform 1 to Platform 2 at 6:42 p.m. His face matches Harlan.",
        question: "q2" },
      { id: "ticket", name: "Used Ticket Stub", icon: "🎫", x: 220, y: 500,
        text: "Mira's ticket stub confirms she boarded the 6:30 p.m. train, before the theft occurred.",
        question: "q3" },
      { id: "form", name: "Lost & Found Form", icon: "📋", x: 300, y: 460,
        text: "A lost & found report filed at 6:50 p.m. describes a brown suitcase last seen near the bench on Platform 2." },
      { id: "print", name: "Wet Footprint", icon: "👣", x: 900, y: 340,
        text: "A wet footprint leads from Platform 2 toward the staff storage corridor.",
        question: "q4" }
    ],
    questions: [
      { id: "q1", topic: "vocab", term: "torn", prompt: "The tag was found 'torn.' What does torn mean?",
        choices: ["Ripped or pulled apart", "Painted a new colour", "Perfectly clean", "Very heavy"],
        correct: 0, hint: "Think about paper ripping.",
        explain: "Torn means ripped or pulled apart, usually leaving a rough edge." },
      { id: "q2", topic: "vocab", term: "crossing", prompt: "The footage shows Harlan 'crossing' platforms. What does crossing mean?",
        choices: ["Moving from one side to the other", "Standing still", "Falling down", "Buying a ticket"],
        correct: 0, hint: "Think of crossing a street.",
        explain: "Crossing means moving from one side of something to the other side." },
      { id: "q3", topic: "vocab", term: "confirm", prompt: "Mira's ticket 'confirms' she boarded early. What does confirm mean?",
        choices: ["To prove that something is true", "To cancel a plan", "To ask a question", "To lose something"],
        correct: 0, hint: "Confirm and 'con-firm' — make firm, make sure.",
        explain: "To confirm means to prove or show that something is definitely true." },
      { id: "q4", topic: "tense", term: "walk", prompt: "Choose the correct question for Harlan: \"___ you walk to the staff storage area at 6:42?\"",
        choices: ["Did", "Do", "Have", "Were"],
        correct: 0, hint: "6:42 this evening is finished, and walk is in its base form.",
        explain: "For a finished action at a stated past time, ask with the past simple: Did + subject + base verb (Did you walk…?)." }
    ],
  };

  /* =======================================================================
     CASE 4 — The Empty Tank  (Advanced, Coral Bay Aquarium)
  ======================================================================= */
  const map4 = M.gridMap({
    id: "coral-bay-aquarium", name: "Coral Bay Aquarium",
    cols: [228, 228, 228, 228], rows: [552],
    cells: [[
      { label: "RECEPTION", floor: "#dfeaea" },
      { label: "MAIN TANK HALL", floor: "#bfe0e2" },
      { label: "FEEDING ROOM", floor: "#cfe3d6" },
      { label: "FILTRATION ROOM", floor: "#c7cdd6" }
    ]],
    furniture: [
      { x: 45, y: 60, w: 110, h: 40, kind: "counter" },
      { x: 270, y: 60, w: 150, h: 90, kind: "crate" },
      { x: 270, y: 400, w: 150, h: 90, kind: "crate" },
      { x: 510, y: 60, w: 130, h: 50, kind: "desk" },
      { x: 510, y: 420, w: 130, h: 60, kind: "counter" },
      // split in two so the doorway lane (y 248-352) stays open
      { x: 750, y: 60, w: 40, h: 168, kind: "server" },
      { x: 750, y: 372, w: 40, h: 108, kind: "server" }
    ]
  });

  const case4 = {
    id: "empty-tank", title: "The Empty Tank", difficulty: "Advanced",
    category: "detective", scene: "aquarium",
    location: "Coral Bay Aquarium",
    description: "A rare deep-sea fish worth a small fortune has vanished from Tank Four, and the tank's lock shows no sign of damage. Cross-reference every log carefully — this case rewards careful reading, not guessing.",
    map: map4, playerStart: { x: 130, y: 470 },
    minimumClues: 4, officerId: "officer", culpritId: "dorian", proofId: "keycard",
    contradictions: { 1: ["keycard"] },
    confession: "Someone offered me a lot of money for that fish, so I came back after my shift and used my keycard. I wrote the second entry in the log, too.",
    solution: "Dorian claimed he never used his staff keycard after his shift ended at six, but the electronic lock recorded his card opening Tank Four at 9:47 p.m. — matching the exact time the feeding log was falsified.",
    npcs: [
      { id: "officer", name: "Officer Nash", role: "Police Officer", x: 130, y: 300, look: POLICE.officerB,
        lines: [
          "A rare fish disappeared from Tank Four sometime after closing.",
          "The lock wasn't broken, so whoever did this used a real staff keycard.",
          "Read every log carefully — the times matter more than anything else here."
        ] },
      { id: "keeper", name: "Elena", role: "Keeper", x: 460, y: 250, look: LOOK.ginger,
        lines: [
          "I fed every tank at six and locked up at half past six exactly.",
          "The feeding log should show my entry, and only mine, at that time."
        ] },
      { id: "dorian", name: "Dorian", role: "Suspect", x: 670, y: 500, look: LOOK.tealSpiky,
        lines: [
          "My shift ended at six and I went straight home afterward.",
          "I haven't used my staff keycard since I clocked out."
        ] },
      { id: "collector", name: "Mr. Voss", role: "Suspect", x: 130, y: 150, look: LOOK.wineFedora,
        lines: [
          "I visited the aquarium in the afternoon, well before closing time.",
          "I only wanted to see the fish, not take it — collectors don't need to steal."
        ] },
      { id: "volunteer", name: "Hana", role: "Suspect", x: 900, y: 250, look: LOOK.blondeBob,
        lines: [
          "I was cleaning the filtration room until eight, then I left for the night.",
          "I don't have a keycard for the tank room at all."
        ] }
    ],
    clues: [
      { id: "feedlog", name: "Feeding Log", icon: "📔", x: 460, y: 470,
        text: "The feeding log shows an entry at 6:30 p.m. signed 'E.K.', and a second, unsigned entry at 9:47 p.m.",
        question: "q1" },
      { id: "keycard", name: "Electronic Lock Record", icon: "🔑", x: 900, y: 400,
        text: "The tank room's electronic lock recorded Dorian's staff keycard opening the door at 9:47 p.m.",
        question: "q2" },
      { id: "watersample", name: "Water Sample", icon: "🧪", x: 460, y: 120,
        text: "A lab technician confirms the water sample from Tank Four was disturbed within the last few hours.",
        question: "q4" },
      { id: "visitorlog", name: "Visitor Sign-in Sheet", icon: "📖", x: 200, y: 150,
        text: "Mr. Voss signed out of the building at 4:15 p.m., long before closing time.",
        question: "q3" },
      { id: "net", name: "Wet Net", icon: "🥅", x: 850, y: 500,
        text: "A wet fishing net was found leaning against the filtration room wall, still dripping." }
    ],
    questions: [
      { id: "q1", topic: "vocab", term: "unsigned", prompt: "The second log entry is 'unsigned.' What does unsigned mean?",
        choices: ["Without a name written on it", "Written very neatly", "Copied twice", "Checked by a manager"],
        correct: 0, hint: "The prefix un- often means 'not.'",
        explain: "Unsigned means without a signature or name — nobody wrote their name on it." },
      { id: "q2", topic: "vocab", term: "recorded", prompt: "The lock 'recorded' Dorian's keycard. What does recorded mean?",
        choices: ["Saved information about an event", "Destroyed information", "Repaired a machine", "Sold an item"],
        correct: 0, hint: "Think of a recording, like a video recording.",
        explain: "Recorded means information about an event was saved, often automatically by a machine." },
      { id: "q3", topic: "vocab", term: "long before", prompt: "Mr. Voss signed out 'long before' closing time. What does long before mean?",
        choices: ["A large amount of time earlier", "Just a few seconds earlier", "At exactly the same time", "Slightly after"],
        correct: 0, hint: "Long before means there is a big gap in time.",
        explain: "Long before means a large amount of time earlier than a stated moment." },
      { id: "q4", topic: "tense", term: "not use", prompt: "Dorian says: \"I ___ (not use) my keycard since I clocked out.\" Which form is correct?",
        choices: ["haven't used", "didn't use", "don't use", "wasn't using"],
        correct: 0, hint: "Look at the word since.",
        explain: "Since + a past moment needs the present perfect (have/has + past participle). It links that moment with now: I haven't used it since six." }
    ],
  };

  window.DW_CASES = window.DW_CASES || [];
  window.DW_CASES.push(case1, case2, case3, case4);
})();
