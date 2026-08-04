/* ============================================================================
   NOVONUS — site copy. All text on the site lives here.
   Concept: skilled-worker demonstrations in a sensor rig become verified,
   force-aware skills that run on robot arms the customer already owns.
   ========================================================================== */

export const site = {
  name: "Novonus",
  category: "Robot programming for contact-rich assembly",
  metaTitle: "Novonus | Infrastructure for Training Robots in Manufacturing",
  metaDescription:
    "Novonus turns your own skilled worker's hand demonstrations into verified, force-aware skills that run on the robot arms you already own. No systems integrator, no robot downtime, no code.",
};

export const hero = {
  eyebrow: "Robot programming for contact-rich assembly",
  title: "Infrastructure for Training Robots in Manufacturing",
  subtitle:
    "Integration costs five times the robot arm, Novonus takes care of it. Workers perform the task in our sensor rig, we process it and robots run it in hours, not weeks. Skills live in the cloud so they're never lost and deployable any time.",
  ctaPrimary: "Start a pilot",
  ctaContact: "Contact",
  ctaSecondary: "See how it works",
};

export const problem = {
  eyebrow: "The problem",
  heading: "Contact-rich assembly still gets programmed the hard way.",
  items: [
    {
      n: "01",
      title: "Programming takes the robot and an expert offline",
      body: "Teach-pendant and teleoperation methods stop the line and tie up a specialist. Teaching a single complex part can cost on the order of 16 hours of robot downtime. And integration runs an estimated 4–6× the price of the robot itself, with programming and integration together making up 50–70% of what a robot application costs.",
    },
    {
      n: "02",
      title: "The hands that know how hard to press are getting scarce",
      body: "Up to 1.9 million US manufacturing jobs could go unfilled by 2033. The people who can feel when a connector seats or a cable is about to jam take months to train, and fewer are entering the trade.",
    },
    {
      n: "03",
      title: "Vision alone plateaus on contact",
      body: "A camera sees where a part goes; it can't feel the force that decides whether it seats or binds. Simulators still can't reliably model the friction, deformation, and multi-point contact that determine whether the task actually succeeds.",
    },
  ],
};

export const solution = {
  eyebrow: "The solution",
  heading: "Teach your robots the human touch.",
  body: "Your worker performs the real task at a bench in our multi-sensor rig. Dense touch, finger pose, motion, and vision, captured together. Our pipeline turns those demonstrations into a verified, force-aware skill your robot can run.",
  pullQuote:
    "Vision-only systems see the task; ours feels it, and it gets better every shift it runs.",
};

export const pipeline = {
  eyebrow: "How it works",
  heading: "Demonstrate, verify, deploy, with you in the loop.",
  steps: [
    {
      n: "01",
      title: "Demonstrate",
      body: "Your worker performs the task by hand in the sensor rig, at a bench. Motion, finger pose, and force are all captured. The line never stops.",
    },
    {
      n: "02",
      title: "Train",
      body: "The pipeline turns those demonstrations into a force-aware skill built for your exact robot and gripper, trained only on data that matches your worker's real force signature.",
    },
    {
      n: "03",
      title: "Verify",
      body: "Before a skill ever touches your robot, it is proven against the library of real demonstrations. Only skills that pass make it out.",
    },
    {
      n: "04",
      title: "Deploy",
      body: "The skill lands in your cloud library, versioned and never lost, then pushes to a compact edge device beside each robot. It runs entirely on-site, no internet required. Your robot's own program calls the skill for the hard part and takes control back. Hours, not weeks.",
    },
    {
      n: "05",
      title: "Adapt",
      body: "Parts vary, batches shift, lines change. Every cycle is checked by an independent success test, and when the world moves, the skill retrains overnight to keep up. You approve every update, and rollback is one click.",
    },
  ],
};

export const who = {
  eyebrow: "Who we build for",
  heading: "Manufacturers with arms already on the floor and high-mix work to do.",
  fitsLabel: "Where it fits",
  fits: [
    "Connector mating",
    "Cable & harness insertion",
    "Precise placement",
    "Machine tending with part-to-part variance",
  ],
  cards: [
    {
      title: "Contract manufacturers",
      body: "High-mix, low-volume shops doing connector, harness, and delicate assembly by hand. We automate the force-critical steps they can't reliably staff, without disrupting the lines they already run.",
    },
    {
      title: "Precision OEMs",
      body: "Aerospace, medical, and electronics makers whose fragile assembly still needs skilled human hands. We capture that expertise and deploy it onto the arms and grippers they already own.",
    },
    {
      title: "High-mix plants with idle arms",
      body: "Teams that bought robots for one job and can't justify re-programming them for the next. We stand up new skills between cycles, so an underused arm earns its keep across changeovers.",
    },
  ],
};

export const runsOn = {
  eyebrow: "Runs on what you already own",
  heading: "Deploy on the robots you already run.",
  body: "Skills are robot-agnostic by design: the output is end-effector motion and a target force the arm realizes through its own motion, not vendor-specific code. Because we capture human demonstrations rather than one robot's control scheme, a skill trained once can deploy across the arms on your floor. We bring up support for mainstream industrial arms one platform at a time.",
};

export const why = {
  eyebrow: "Why Novonus",
  heading: "The Signal Others Miss",
  rows: [
    {
      n: "01",
      title: "Force is the missing signal.",
      body: "A camera sees where a part goes; it can't feel how hard to press. Contact-rich assembly is decided by forces a vision-only system never sees. Our rig captures that force as your worker performs the task, and the skill we deliver is trained to reproduce it, no force sensor needed on your robot.",
    },
    {
      n: "02",
      title: "Grounded in reality.",
      body: "Simulators can't fully model real contact, so a skill trained only in sim fails on real parts. We verify every generated scenario against the real human demonstration and keep only what holds up, then validate on your actual robot before it ships. Reality is our filter.",
    },
    {
      n: "03",
      title: "Runs on the robots you trust.",
      body: "No new hardware on the robot, no rebuilding your line. Because we capture human demonstrations rather than robot-specific code, skills deploy onto the arms and grippers you already own.",
    },
    {
      n: "04",
      title: "Deep where the giants stay shallow.",
      body: "General-purpose robotics chases broad capability. We go deep on the fragile, force-critical assembly others skip, building a verified force dataset in the hardest corner of manufacturing.",
    },
  ],
};

export const stats = {
  eyebrow: "By design",
  items: [
    {
      value: "Off-robot",
      label:
        "Capture happens at a bench, not on the line. Your robot keeps producing while the task is demonstrated.",
    },
    {
      value: "Verified",
      label:
        "Every training sample is checked against the real human demonstration before it's allowed to train the skill.",
    },
    {
      value: "Zero",
      label:
        "Changes to your robot fleet. Skills run on the arms and grippers you already own.",
    },
    {
      value: "You approve",
      label:
        "The system detects, retrains, and proposes; a person on your team ships the change.",
    },
  ],
};

export const scope = {
  eyebrow: "Scope",
  heading: "What we bring and what your integrator does.",
  body: "Novonus provides the skill: the capture rig (loaned per project), the verification-and-training pipeline, the on-site skill runtime, and the improvement loop. We deliberately don't supply the robot, the end-of-arm tooling, the fixturing, or the safety certification. Your certified integrator handles those, and we work alongside them. You keep the hardware and the sign-off; we make the hard, force-critical step work.",
  steps: [
    {
      n: "01",
      title: "Show us the task.",
      body: "Pick the station that needs automating and book a pilot. We bring the sensor rig to your floor and take a quick 3D scan of the workstation, so the skill is trained against your actual setup, parts and all.",
    },
    {
      n: "02",
      title: "Your worker demonstrates.",
      body: "Your best operator performs the task by hand a handful of times, wearing the rig, right at the scanned station. Takes a shift, not a shutdown; the line keeps running the whole time.",
    },
    {
      n: "03",
      title: "Approve and run.",
      body: "We train and verify the skill, then deploy it to a compact edge device beside your robot. You approve it, your robot runs it, and as parts and batches change it retrains overnight, with every update yours to approve.",
    },
  ],
  pricingLabel: "Pricing",
  pricingPoints: [
    "Start with a paid pilot on one station, with clear success criteria.",
    "After that, a one-time fee per trained skill plus a subscription that covers the edge runtime, your cloud skill library, and overnight retraining. Priced so the skill pays for itself within a year.",
    "The sensor rig stays at your facility as part of the subscription, kept calibrated by us, so retraining is always one shift away. Want to buy the rig instead? You can.",
  ],
  agnosticKicker: "Hardware agnostic",
  agnosticHeading: "Deploy on the robots you already run.",
  agnosticBody:
    "Skills are robot-agnostic by design: the output is end-effector motion and a target force the arm realizes through its own motion, not vendor-specific code. Because we capture human demonstrations rather than one robot's control scheme, a skill trained once can deploy across the arms on your floor. We bring up support for mainstream industrial arms one platform at a time.",
};

export const brand = {
  kicker: "Introducing",
  word: "novo·nus",
  ipa: "ˈnoʊ-voʊ-nəs",
  etymology: "Latin novāre + Ancient Greek νοῦς",
  roots: [
    {
      word: "novo",
      ipa: "ˈnoʊ-voʊ",
      greek: "",
      pos: "verb, transitive",
      lang: "Latin",
      def: "to make new; to renew; to refresh.",
    },
    {
      word: "nous",
      ipa: "ˈnuːs",
      greek: "νοῦς",
      pos: "noun, masculine",
      lang: "Ancient Greek",
      def: "the mind; the intellect; the practical know-how by which one grasps a task.",
    },
  ],
  punchline: "the making of a new mind.",
  tail: "because that's what we help robots do.",
};

export const cta = {
  eyebrow: "Start a pilot",
  heading: "Bring us one task.",
  body: "A connector to mate, a cable to insert, a placement or machine-tending step with part-to-part variance, the kind of job that still needs a skilled hand. We'll scope a paid 4–8 week pilot on your floor, on your robot, and show you a verified skill running before you commit to anything bigger.",
  primary: "Start a pilot",
  secondary: "Contact",
  email: "deepayanc10@gmail.com",
};

export const footer = {
  line: "Novonus · Robot programming for contact-rich assembly",
  year: "© 2026",
  marquee: "NOVONUS · ROBOT PROGRAMMING FOR CONTACT-RICH ASSEMBLY",
};
