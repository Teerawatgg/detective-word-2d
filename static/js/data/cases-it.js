/* Cases 5–7: IT English (IT vocabulary + one tense question each).
   Same shape as cases-detective.js. Thai text: thai-dialogue.js, thai-content.js. */
(function () {
  "use strict";
  const M = window.DW_MAPKIT;
  const POLICE = window.DW_POLICE_LOOKS;
  const LOOK = {
    slateBob: { skin: "#f3cfa6", hair: "#1d1a1a", hairStyle: "bob", top: "#3b4f7a", bottom: "#262f45", shoes: "#1b1b1b", eye: "#1a1414", glasses: true, glassesColor: "#20242e" },
    yellowCap: { skin: "#e8b58b", hair: "#6b3e1f", hairStyle: "cap", top: "#e0a526", bottom: "#34495e", shoes: "#22252b", accent: "#7d3c98", eye: "#21170f" },
    greenDev: { skin: "#c58a5e", hair: "#141212", hairStyle: "short", top: "#27ae60", bottom: "#2c3e50", shoes: "#1c1c1c", eye: "#141010", glasses: true, glassesColor: "#141414" },
    redLong: { skin: "#ffdcc0", hair: "#a93226", hairStyle: "long", top: "#f39c12", bottom: "#3d3d3d", shoes: "#2a2320", eye: "#3b2116" },
    greySuit: { skin: "#d8a47f", hair: "#9a9a9a", hairStyle: "short", top: "#3c3c46", bottom: "#24242b", shoes: "#151515", eye: "#1f1a17", collar: "#ffffff" },
    navyBun: { skin: "#c98456", hair: "#16110f", hairStyle: "bun", top: "#1f4e79", bottom: "#1a2a3a", shoes: "#141414", eye: "#130e0b" },
    tealPony: { skin: "#f2c8a2", hair: "#2b1d14", hairStyle: "pony", top: "#16a085", bottom: "#2c3e50", shoes: "#1d1d1d", eye: "#22160f" },
    hoodieCurl: { skin: "#e3b48c", hair: "#3a2a1e", hairStyle: "curly", top: "#5d6d7e", bottom: "#2e3b48", shoes: "#202020", eye: "#1e1610" },
    plumBob: { skin: "#8d5a3b", hair: "#120d0b", hairStyle: "bob", top: "#7d3c98", bottom: "#3b2147", shoes: "#1a1218", eye: "#120c0a" },
    orangeSpiky: { skin: "#f5cba7", hair: "#e67e22", hairStyle: "spiky", top: "#34495e", bottom: "#1f2d3a", shoes: "#151b22", eye: "#2b1a0f" },
    maroonLong: { skin: "#e0ac85", hair: "#4a2c1d", hairStyle: "long", top: "#922b21", bottom: "#2b2b2b", shoes: "#1b1b1b", eye: "#24170f", glasses: true, glassesColor: "#7b241c" },
    beigeFedora: { skin: "#c68b63", hair: "#2a1f19", hairStyle: "fedora", top: "#c8b08a", bottom: "#4a3f33", shoes: "#2b2219", accent: "#5b4a36", eye: "#1d140f" }
  };

  /* =====================================================================
     CASE 5 — The Leaked Password  (Beginner, Pixel Lab startup office)
  ===================================================================== */
  const map5 = M.gridMap({
    id: "pixel-lab", name: "Pixel Lab Office",
    cols: [300, 306, 306], rows: [276, 276],
    cells: [
      [{ label: "OPEN OFFICE", floor: "#d6dbe3" }, { label: "MEETING ROOM", floor: "#d9d2c3" }, { label: "MANAGER'S OFFICE", floor: "#cfd6cc" }],
      [{ label: "RECEPTION", floor: "#e1dacb" }, { label: "KITCHEN", floor: "#e4dcc8" }, { label: "PRINT CORNER", floor: "#cdd2d8" }]
    ],
    furniture: [
      { x: 50, y: 60, w: 100, h: 40, kind: "desk" },
      { x: 180, y: 60, w: 100, h: 40, kind: "computer" },
      { x: 400, y: 110, w: 150, h: 60, kind: "desk" },
      { x: 780, y: 70, w: 110, h: 44, kind: "desk" },
      { x: 880, y: 150, w: 34, h: 120, kind: "shelf" },
      { x: 50, y: 470, w: 130, h: 40, kind: "counter" },
      { x: 350, y: 520, w: 150, h: 34, kind: "counter" },
      { x: 700, y: 520, w: 100, h: 36, kind: "computer" },
      { x: 850, y: 380, w: 60, h: 50, kind: "printer" }
    ]
  });

  const case5 = {
    id: "leaked-password", title: "The Leaked Password", difficulty: "Beginner",
    category: "it", scene: "school",
    location: "Pixel Lab Office", map: map5,
    description: "Someone posted the company's admin password on a public forum this afternoon. Check the computer records, talk to the team, and find at least three clues.",
    playerStart: { x: 150, y: 250 },
    minimumClues: 3, officerId: "officer", culpritId: "oscar", proofId: "loginlog",
    contradictions: { 0: ["badge"], 1: ["loginlog"] },
    confession: "I just wanted to look cool on the forum. I saw the sticky note, used the shared computer, and posted the password. I'm really sorry.",
    solution: "Oscar said he never logged in to any computer after lunch, but the login record shows his account on PC-07 from 2:25 to 2:34 p.m. — and the forum post was made from that computer at 2:30.",
    npcs: [
      { id: "officer", name: "Officer Park", role: "Police Officer", x: 120, y: 400, look: POLICE.officerA,
        lines: [
          "The company's admin password was leaked online this afternoon.",
          "Check the computer records and talk to everyone in the office.",
          "Find at least three clues before you make an accusation."
        ] },
      { id: "kim", name: "Ms. Kim", role: "IT Manager", x: 760, y: 200, look: LOOK.slateBob,
        lines: [
          "Someone posted our admin password on a public forum at two-thirty.",
          "I kept the password on a sticky note under my keyboard. I know — that was a big mistake.",
          "PC-07 is the shared computer in the print corner. Anyone on the team can use it."
        ] },
      { id: "oscar", name: "Oscar", role: "Suspect", x: 470, y: 420, look: LOOK.yellowCap,
        lines: [
          "I stayed in the meeting room with the design team all afternoon.",
          "I never logged in to any computer after lunch."
        ] },
      { id: "ben", name: "Ben", role: "Suspect", x: 230, y: 150, look: LOOK.greenDev,
        lines: [
          "I was fixing a bug in our app at my desk the whole afternoon.",
          "My computer is PC-02, not PC-07, and I never use the shared one."
        ] },
      { id: "lina", name: "Lina", role: "Suspect", x: 470, y: 230, look: LOOK.redLong,
        lines: [
          "I was in the meeting room from one o'clock until three.",
          "Oscar left the room for a while, but I didn't see where he went."
        ] }
    ],
    clues: [
      { id: "sticky", name: "Sticky Note", icon: "🗒️", x: 835, y: 140,
        text: "A yellow sticky note under Ms. Kim's keyboard. The admin password is written on it in large letters.",
        question: "q1" },
      { id: "loginlog", name: "Login Record", icon: "🖥️", x: 750, y: 480,
        text: "The login record for PC-07 shows the user 'oscar' logged in at 2:25 p.m. and logged out at 2:34 p.m.",
        question: "q2" },
      { id: "forum", name: "Forum Post", icon: "🌐", x: 820, y: 405,
        text: "A printed screenshot of a public forum post: 'Free admin password for Pixel Lab!' It was posted at 2:30 p.m. from PC-07.",
        question: "q3" },
      { id: "badge", name: "Door Badge Log", icon: "🪪", x: 580, y: 60,
        text: "The meeting room door log shows Oscar's badge leaving the room at 2:21 p.m. and coming back at 2:37 p.m." },
      { id: "mug", name: "Coffee Cup", icon: "☕", x: 420, y: 200,
        text: "A coffee cup with Lina's name on it sits next to her laptop in the meeting room. It is still warm." }
    ],
    questions: [
      { id: "q1", topic: "it", term: "password", prompt: "The note shows the admin 'password'. What is a password?",
        choices: ["A secret word you type to log in", "A list of phone numbers", "The name of a website", "A type of computer screen"],
        correct: 0, hint: "You type it with your username, and you should never share it.",
        explain: "A password is a secret word or set of characters that proves who you are when you log in." },
      { id: "q2", topic: "it", term: "log in", prompt: "The record shows Oscar 'logged in' at 2:25 p.m. What does log in mean?",
        choices: ["To enter your username and password to start using a system", "To turn off a computer", "To print a document", "To delete your account"],
        correct: 0, hint: "The opposite is log out.",
        explain: "To log in means to enter your username and password so that a computer system lets you use it." },
      { id: "q3", topic: "tense", term: "post", prompt: "Complete the sentence: \"Someone ___ (post) the password at 2:30 p.m.\"",
        choices: ["posted", "has posted", "posts", "is posting"],
        correct: 0, hint: "The sentence gives an exact time that is already finished.",
        explain: "A finished action at an exact past time takes the past simple: posted. The present perfect (has posted) cannot be used with a time like 'at 2:30 p.m.'." }
    ]
  };

  /* =====================================================================
     CASE 6 — The Deleted Database  (Intermediate, Cloudline Data Center)
  ===================================================================== */
  const map6 = M.gridMap({
    id: "cloudline-datacenter", name: "Cloudline Data Center",
    cols: [260, 392, 260], rows: [220, 332],
    cells: [
      [{ label: "LOBBY", floor: "#dcdfe3" }, { label: "CONTROL ROOM", floor: "#c9d3dd" }, { label: "DIRECTOR'S OFFICE", floor: "#d7d0c4" }],
      [{ label: "BREAK ROOM", floor: "#e0d7c6" }, { label: "SERVER HALL", floor: "#bfc8d2" }, { label: "COOLING ROOM", floor: "#c4d6db" }]
    ],
    furniture: [
      { x: 50, y: 50, w: 120, h: 36, kind: "counter" },
      { x: 320, y: 50, w: 110, h: 40, kind: "computer" },
      { x: 530, y: 50, w: 110, h: 40, kind: "computer" },
      { x: 800, y: 60, w: 110, h: 44, kind: "desk" },
      { x: 880, y: 130, w: 34, h: 90, kind: "shelf" },
      { x: 50, y: 500, w: 120, h: 40, kind: "bench" },
      { x: 380, y: 300, w: 28, h: 100, kind: "server" },
      { x: 380, y: 440, w: 28, h: 100, kind: "server" },
      { x: 580, y: 300, w: 28, h: 100, kind: "server" },
      { x: 580, y: 440, w: 28, h: 100, kind: "server" },
      { x: 850, y: 480, w: 60, h: 60, kind: "crate" }
    ]
  });

  const case6 = {
    id: "deleted-database", title: "The Deleted Database", difficulty: "Intermediate",
    category: "it", scene: "aquarium",
    location: "Cloudline Data Center", map: map6,
    description: "The customer database was deleted just before midnight, and the nightly backup was switched off. Every account leaves a trace — read the system logs and find at least four clues.",
    playerStart: { x: 100, y: 180 },
    minimumClues: 4, officerId: "officer", culpritId: "greg", proofId: "vpn",
    contradictions: { 1: ["vpn", "auditlog"] },
    confession: "They ended my contract without a word of thanks. My access still worked, so I connected from home and deleted everything. It was stupid, I know.",
    solution: "Greg said he had not connected to the company system since his last day, but the VPN record shows his account connected at 11:40 p.m., and the audit log shows that same account deleted the database at 11:48 p.m.",
    npcs: [
      { id: "officer", name: "Officer Quinn", role: "Police Officer", x: 150, y: 150, look: POLICE.officerB,
        lines: [
          "The company's customer database was deleted at 11:48 last night.",
          "Greg, the former contractor, came in this morning to answer our questions.",
          "Read the system logs carefully, and find at least four clues before you name a suspect."
        ] },
      { id: "alvarez", name: "Mr. Alvarez", role: "IT Director", x: 780, y: 170, look: LOOK.greySuit,
        lines: [
          "Our customer database was deleted just before midnight.",
          "Luckily we have a backup from Monday, but we have lost two days of data.",
          "Greg's contract ended on Friday. I asked the team to remove his access, but I'm not sure they did."
        ] },
      { id: "greg", name: "Greg", role: "Suspect", x: 150, y: 400, look: LOOK.hoodieCurl,
        lines: [
          "My contract ended last Friday, and I said goodbye to everyone that afternoon.",
          "I haven't connected to the company system since my last day."
        ] },
      { id: "raj", name: "Raj", role: "Suspect", x: 480, y: 150, look: LOOK.orangeSpiky,
        lines: [
          "I switched off the backup at nine-fifteen because the disk was full.",
          "I went home at half past nine and planned to fix it this morning."
        ] },
      { id: "mei", name: "Mei", role: "Suspect", x: 480, y: 400, look: LOOK.navyBun,
        lines: [
          "I was in the server hall all night, checking the cooling system.",
          "I didn't touch the database — I don't even have a database password."
        ] }
    ],
    clues: [
      { id: "auditlog", name: "Audit Log", icon: "📜", x: 375, y: 120,
        text: "The audit log shows the command DELETE DATABASE was run at 11:48 p.m. from the account 'g.hart'.",
        question: "q3" },
      { id: "vpn", name: "VPN Record", icon: "🔐", x: 585, y: 120,
        text: "The VPN record shows the account 'g.hart' (Greg Hart) connected from outside the building at 11:40 p.m. and disconnected at 11:52 p.m." },
      { id: "accesslist", name: "Access List", icon: "📋", x: 840, y: 200,
        text: "An access list printed on Monday still shows 'g.hart' with full admin access, even though his contract ended last Friday.",
        question: "q2" },
      { id: "backup", name: "Backup Settings", icon: "💾", x: 480, y: 520,
        text: "The nightly backup was switched off at 9:15 p.m. by the account 'r.patel', with the note 'Disk full — will fix tomorrow'.",
        question: "q1" },
      { id: "doorlog", name: "Building Door Log", icon: "🚪", x: 240, y: 60,
        text: "The building door log shows no visitors after 8 p.m. Only Raj and Mei came in after that, and Raj left at 9:31 p.m." }
    ],
    questions: [
      { id: "q1", topic: "it", term: "backup", prompt: "The nightly 'backup' was switched off. What is a backup?",
        choices: ["A copy of data kept in case the original is lost", "A broken computer", "A new password", "A kind of network cable"],
        correct: 0, hint: "Think of a spare copy you can go back to.",
        explain: "A backup is a copy of your data, saved separately, so you can restore it if the original is lost or deleted." },
      { id: "q2", topic: "it", term: "access", prompt: "Greg still had admin 'access'. What does access mean here?",
        choices: ["Permission to enter or use a system", "A computer virus", "A printed report", "A meeting room"],
        correct: 0, hint: "When your access is removed, you can no longer get in.",
        explain: "Access means the permission or the ability to enter a place or use a computer system." },
      { id: "q3", topic: "tense", term: "delete", prompt: "Complete the sentence: \"The database ___ (delete) at 11:48 p.m. last night.\"",
        choices: ["was deleted", "is deleted", "has deleted", "deleted"],
        correct: 0, hint: "The database did not do the action — someone did it to the database.",
        explain: "Use the past simple passive (was/were + past participle) when the subject receives a finished past action: the database was deleted." }
    ]
  };

  /* =====================================================================
     CASE 7 — The Hacked Website  (Advanced, Brightwave online shop)
  ===================================================================== */
  const map7 = M.gridMap({
    id: "brightwave-office", name: "Brightwave Office",
    cols: [300, 306, 306], rows: [276, 276],
    cells: [
      [{ label: "RECEPTION", floor: "#e2dccd" }, { label: "MARKETING", floor: "#e3d6cf" }, null],
      [{ label: "BREAK AREA", floor: "#dfe0cf" }, { label: "DEVELOPER ROOM", floor: "#cbd3de" }, { label: "SERVER CLOSET", floor: "#c3c9cf" }]
    ],
    furniture: [
      { x: 60, y: 60, w: 130, h: 40, kind: "counter" },
      { x: 360, y: 60, w: 100, h: 40, kind: "desk" },
      { x: 500, y: 60, w: 100, h: 40, kind: "desk" },
      { x: 560, y: 200, w: 50, h: 44, kind: "printer" },
      { x: 50, y: 500, w: 120, h: 40, kind: "bench" },
      { x: 200, y: 520, w: 100, h: 34, kind: "counter" },
      { x: 360, y: 500, w: 100, h: 40, kind: "computer" },
      { x: 500, y: 500, w: 100, h: 40, kind: "computer" },
      { x: 860, y: 330, w: 30, h: 110, kind: "server" },
      { x: 860, y: 460, w: 30, h: 90, kind: "server" }
    ]
  });

  const case7 = {
    id: "hacked-website", title: "The Hacked Website", difficulty: "Advanced",
    category: "it", scene: "station",
    location: "Brightwave Online Shop", map: map7,
    description: "At 3:10 this morning the shop's homepage was replaced with a fake sale page that collected customers' card numbers. Security reports record every login and every code — compare them with each statement and find at least four clues.",
    playerStart: { x: 200, y: 140 },
    minimumClues: 4, officerId: "officer", culpritId: "nina", proofId: "twofactor",
    /* the deployment log only shows Nina's ACCOUNT; the two-factor code on her
       phone is what proves Nina herself was awake and logging in */
    contradictions: { 0: ["twofactor"], 1: ["twofactor"] },
    confession: "I owed someone a lot of money, and he said one fake page would clear it. I typed the code from my phone and uploaded it myself.",
    solution: "Nina said her phone was switched off all night and that she never logged in after midnight, but the security system sent a two-factor code to her phone at 3:08 a.m. and it was entered correctly at 3:09 — one minute before her account uploaded the fake page.",
    npcs: [
      { id: "officer", name: "Officer Grant", role: "Police Officer", x: 120, y: 200, look: POLICE.officerA,
        lines: [
          "Someone uploaded a fake page to the shop's website at 3:10 this morning.",
          "The security system records every login and every code it sends.",
          "This case is advanced: compare each statement with the exact times before you accuse anyone."
        ] },
      { id: "osei", name: "Ms. Osei", role: "Shop Owner", x: 470, y: 180, look: LOOK.plumBob,
        lines: [
          "At three in the morning, our homepage was replaced with a fake sale page.",
          "The fake page asked customers for their card numbers, and twelve people typed them in.",
          "Only staff accounts can upload a new page, and every login needs a two-factor code."
        ] },
      { id: "nina", name: "Nina", role: "Suspect", x: 420, y: 400, look: LOOK.tealPony,
        lines: [
          "My phone was switched off all night because the battery died.",
          "I didn't log in to the shop system at all after midnight."
        ] },
      { id: "tariq", name: "Tariq", role: "Suspect", x: 370, y: 240, look: LOOK.beigeFedora,
        lines: [
          "I went to bed before midnight and slept until seven.",
          "I don't even know how to upload a page — that's the developers' job."
        ] },
      { id: "carlos", name: "Carlos", role: "Suspect", x: 150, y: 420, look: LOOK.maroonLong,
        lines: [
          "My contract finished last month, and the team removed my account.",
          "I was at a friend's birthday party across the city until four in the morning."
        ] }
    ],
    clues: [
      { id: "deploylog", name: "Upload Log", icon: "⬆️", x: 550, y: 460,
        text: "The upload log shows a new homepage was uploaded at 3:10 a.m. with the message 'quick fix'. The upload used Nina's account.",
        question: "q1" },
      { id: "twofactor", name: "Two-Factor Code", icon: "📱", x: 400, y: 470,
        text: "The security system sent a two-factor code to Nina's phone at 3:08 a.m. The code was typed in correctly at 3:09 a.m.",
        question: "q3" },
      { id: "firewall", name: "Firewall Report", icon: "🧱", x: 800, y: 400,
        text: "The firewall blocked 40 login attempts from an unknown address between 1:00 and 2:00 a.m. None of them succeeded.",
        question: "q2" },
      { id: "chat", name: "Team Chat", icon: "💬", x: 410, y: 130,
        text: "At 11:30 p.m. Tariq wrote in the team chat: 'Going to bed, see you tomorrow!' His account did not log in again until 8:45 a.m." },
      { id: "party", name: "Party Photo", icon: "🎉", x: 250, y: 440,
        text: "A photo posted online at 3:05 a.m. shows Carlos singing at a birthday party on the other side of the city." }
    ],
    questions: [
      { id: "q1", topic: "it", term: "upload", prompt: "A new homepage was 'uploaded' at 3:10 a.m. What does upload mean?",
        choices: ["To send a file from your computer to a server or website", "To copy a file from the internet onto your computer", "To print a web page", "To delete a website"],
        correct: 0, hint: "Up goes from you to the internet; down comes from the internet to you.",
        explain: "To upload means to send a file from your device to a server or website. The opposite, download, brings a file from the internet to your device." },
      { id: "q2", topic: "it", term: "firewall", prompt: "The 'firewall' blocked 40 login attempts. What is a firewall?",
        choices: ["A security system that blocks unwanted access to a network", "A wall that stops a real fire", "A very fast internet cable", "A program for editing photos"],
        correct: 0, hint: "It stands between the shop's network and the outside world.",
        explain: "A firewall is a security system that checks network traffic and blocks connections that are not allowed." },
      { id: "q3", topic: "tense", term: "code", prompt: "Which sentence about the two-factor code is correct?",
        choices: ["The code was typed in at 3:09 a.m.", "The code has been typed in at 3:09 a.m.", "The code is typed in at 3:09 a.m. last night.", "The code had type in at 3:09 a.m."],
        correct: 0, hint: "The present perfect never goes with an exact past time.",
        explain: "An exact past time (at 3:09 a.m.) needs the past simple: was typed in. 'Has been typed in at 3:09' is wrong, because the present perfect cannot go with a finished time." }
    ]
  };

  window.DW_CASES = window.DW_CASES || [];
  window.DW_CASES.push(case5, case6, case7);
})();
