/* ============================================================
   Pack 361 website settings
   Edit the values between the quotes, then click "Commit changes".
   Every page on the site reads from this one file.
   Keep the quotes and the commas exactly as they are.
   ============================================================ */
window.PACK361 = {

  // Shown in the top bar and on Home
  scoutingYear: "2026-27",
  schoolLine: "K.L. Carver Elementary School • San Marino • 2026-2027",

  // Navy announcement banner at the top of every page
  banner: {
    eyebrow: "Scouting year 2026-27",
    title: "Registration is open",
    text: "Pack fee $175 per scout. One form for the whole family.",
    bubbleTag: "Kindergarten to 5th grade",
    // The part in <span class="pop-date">…</span> gets the navy-and-gold highlight
    bubbleText: "It's not too late to join! We're still accepting registrations for <span class=\"pop-date\">2026-27</span>"
  },

  // Next pack meeting (Home page, Join page and the footer)
  meetingWhen: "Friday, December 4 at 6 pm",
  meetingWhere: "K.L. Carver Auditorium",

  // Registration app: paste the web app link (ends in /exec)
  registrationAppUrl: "https://script.google.com/macros/s/AKfycbyaD59WByqsJeOXdUOZez-Gybo0EEVhSJfGxY5x_OG52RvtB7jLCVA9ptOsFunuBNU/exec",

  // Other links
  medicalFormUrl: "https://drive.google.com/uc?export=download&id=1vSPqn9QRaI5pdT7gcY9V-OJMvlNnbH22",
  shirtFormUrl: "https://forms.gle/yoT9Hh1neWRNdrSD9",

  // Leave empty ("") to hide the Cubmaster line on the Resources page
  cubmaster: "",

  // Home page, "Big events this year": [name, note]
  bigEvents: [
    ["Pinewood Derby", "Kit included in pack dues"],
    ["Blue & Gold Banquet", "Included in pack dues"],
    ["Spring campout", "Lacy Park"]
  ],

  // Dens for this scouting year: rank, grade, boys' den, girls' den
  dens: [
    ["Lion", "Kindergarten", 3, 9],
    ["Tiger", "1st grade", 2, 8],
    ["Wolf", "2nd grade", 1, 7],
    ["Bear", "3rd grade", 6, 12],
    ["Webelos", "4th grade", 5, 11],
    ["Arrow of Light", "5th grade", 4, 10]
  ]
};
