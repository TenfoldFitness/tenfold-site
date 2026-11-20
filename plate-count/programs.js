/* 6-phase block, 4 weeks each, 24 weeks total.
   Phases 1-3 run in a surplus and build. Phases 4-6 run in a deficit and
   hold. Strength peaks in Phase 3, while fed, then volume steps down
   through the cut so the muscle built in the first half survives it.
   Tiers: main = heavy compound (strength or hypertrophy option),
   sec = loaded secondary, iso = isolation, core = trunk. */

window.PHASES = [
{id:"ph1", name:"Phase 1", sub:"Weeks 1-4", weeks:4, block:"build", cardio:"20 min",
 targets:{k:1900,p:160,c:189,f:56},
 note:"Foundation. Groove the movements, build work capacity, set your baselines. Pick a weight you could do two more reps with on the first working set and write everything down.",
 tech:"Two-step reps on A and B: pause just before the bottom, then pause again halfway up. It kills momentum and puts the work on the muscle.",
 scheme:{
   main:{h:{w:"2-3",s:3,r:"12-15",rest:"2-3 min"}, s:{w:"2-4",s:3,r:"8",rest:"3 min"}},
   sec: {h:{w:"1-2",s:3,r:"12-15",rest:"90 sec"}},
   iso: {h:{w:"1",  s:3,r:"15",   rest:"45-60 sec"}},
   core:{h:{w:"0",  s:3,r:"15-20",rest:"60 sec"}}}},

{id:"ph2", name:"Phase 2", sub:"Weeks 5-8", weeks:4, block:"build", cardio:"20 min",
 targets:{k:1900,p:160,c:189,f:56},
 note:"Volume. Reps down slightly, a set added to the compounds and secondaries. This is the phase that builds the tissue the next one will load.",
 tech:"Keep the two-step reps. Full range beats extra weight: if the load is shortening your range, it is too heavy.",
 scheme:{
   main:{h:{w:"2-3",s:4,r:"10-12",rest:"2-3 min"}, s:{w:"2-4",s:3,r:"6",rest:"3 min"}},
   sec: {h:{w:"1-2",s:4,r:"10-12",rest:"90 sec"}},
   iso: {h:{w:"1",  s:3,r:"12-15",rest:"45-60 sec"}},
   core:{h:{w:"0",  s:3,r:"15-20",rest:"60 sec"}}}},

{id:"ph3", name:"Phase 3", sub:"Weeks 9-12", weeks:4, block:"build", cardio:"20 min",
 targets:{k:1900,p:160,c:189,f:56},
 note:"Peak strength, and the heaviest work of the whole programme. This lands here on purpose: it is the last phase before the deficit, so it is the last phase where you can properly express strength. Set your records now.",
 tech:"Drop the two-step on A and B and just move weight. Add a drop set to the last set of each isolation movement: strip about a third and keep going.",
 scheme:{
   main:{h:{w:"2-3",s:4,r:"6-8",rest:"3 min"}, s:{w:"2-4",s:4,r:"3-4",rest:"3-4 min"}},
   sec: {h:{w:"1-2",s:4,r:"8-10",rest:"2 min"}},
   iso: {h:{w:"1",  s:3,r:"10-12",rest:"60-90 sec", tech:"Drop set on the last set."}},
   core:{h:{w:"0",  s:3,r:"20",  rest:"60 sec"}}}},

{id:"ph4", name:"Phase 4", sub:"Weeks 13-16", weeks:4, block:"cut", cardio:"25 min",
 targets:{k:1900,p:160,c:189,f:56},
 note:"The cut starts here. Calories come down, protein goes up, and the training load deliberately does not drop yet. Heavy work is what tells your body to keep the muscle you just built.",
 tech:"Expect the last rep to feel harder than the same weight did last month. That is the deficit, not a step backwards. Hold the loads.",
 scheme:{
   main:{h:{w:"2-3",s:4,r:"6-8",rest:"3 min"}, s:{w:"2-4",s:3,r:"4",rest:"3 min"}},
   sec: {h:{w:"1-2",s:3,r:"8-10",rest:"2 min"}},
   iso: {h:{w:"1",  s:3,r:"10-12",rest:"60 sec"}},
   core:{h:{w:"0",  s:3,r:"20",  rest:"60 sec"}}}},

{id:"ph5", name:"Phase 5", sub:"Weeks 17-20", weeks:4, block:"cut", cardio:"25-30 min",
 targets:{k:1900,p:160,c:189,f:56},
 note:"Volume steps down, intensity does not. Recovery is the limiting factor in a deficit, so the work that stays is the work that matters most.",
 tech:"If a session feels flat, cut the isolation work before you cut the compounds. Weight on the bar is the last thing to give up.",
 scheme:{
   main:{h:{w:"2-3",s:3,r:"6-8",rest:"3 min"}, s:{w:"2-4",s:3,r:"4",rest:"3 min"}},
   sec: {h:{w:"1-2",s:3,r:"8-10",rest:"2 min"}},
   iso: {h:{w:"1",  s:2,r:"10-12",rest:"60 sec"}},
   core:{h:{w:"0",  s:3,r:"20",  rest:"60 sec"}}}},

{id:"ph6", name:"Phase 6", sub:"Weeks 21-24", weeks:4, block:"cut", cardio:"30 min",
 targets:{k:1900,p:160,c:189,f:56},
 note:"Lowest volume of the block, heaviest relative loads still on the bar. The job of these four weeks is to finish the cut without giving back what Phases 1 to 3 built.",
 tech:"Holding your Phase 3 numbers at a lighter bodyweight is the win here. Matching them is a success, not a plateau.",
 scheme:{
   main:{h:{w:"2-3",s:3,r:"5-6",rest:"3 min"}, s:{w:"2-4",s:3,r:"3",rest:"3-4 min"}},
   sec: {h:{w:"1-2",s:2,r:"6-8",rest:"2-3 min"}},
   iso: {h:{w:"1",  s:2,r:"10-12",rest:"60 sec"}},
   core:{h:{w:"0",  s:2,r:"20",  rest:"60 sec"}}}}
];

var WALK = "Treadmill walk, 5 incline at 3.5 mph, holding 8 lb dumbbells";
var BIKE = "Spin bike, steady moderate effort";

window.DAYS = [
{d:"Mon", title:"Chest",
 bands:["Band pull-aparts 2x20","Band chest press 2x15","Scapular push-ups 2x10"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Barbell Bench Press",t:"main",cue:"Bar to the lower pecs, not the throat. Stop just short of lockout to keep tension on the chest.",
   sw:["Dumbbell Bench Press","Smith Machine Bench Press"]},
  {L:"B",n:"Incline Dumbbell Press",t:"main",cue:"Stop just short of the dumbbells touching at the top.",
   sw:["Incline Barbell Press","Incline Smith Press"]},
  {L:"C",n:"Decline Press",t:"sec",cue:"The fullest range the chest gets, and the most complete chest movement in the day.",
   sw:["Weighted Dip","Decline Barbell Press","Hammer Chest Press"]},
  {L:"D",n:"Seated Machine Chest Press",t:"sec",cue:"Machine work late in the session lets you push near failure safely.",
   sw:["Flat Machine Press","Standing Cable Press"]},
  {L:"E",n:"Pec Deck Fly",t:"iso",cue:"Put a block or rolled towel behind your upper back so the shoulders sit back and the chest does the work.",
   sw:["Incline Dumbbell Fly","Low to High Cable Fly"]},
  {L:"F",n:"Dumbbell Pullover",t:"iso",cue:"Ribs down. Stretch through the lats and upper chest.",
   sw:["Cable Pullover"]},
  {L:"G",n:"Cable Rope Crunch",t:"core",cue:"Kneeling. Round the spine down, do not hinge at the hips.",
   sw:["Ab Crunch Machine","Decline Crunch"]}
 ]},

{d:"Tue", title:"Back",
 bands:["Band pull-aparts 2x20","Band lat pulldown 2x15","Band face pulls 2x15"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Incline Pulldown",t:"main",cue:"Chest on an incline bench facing the cable. Pull to the chest and lift the torso slightly into the squeeze.",
   sw:["Neutral Grip Lat Pulldown","Pull-up","Hammer Strength Pulldown"]},
  {L:"C",n:"Low Cable Row",t:"sec",cue:"Sit up high, on a plate or box, so you pull upward. Lean forward into every rep for the stretch, then come upright at the contraction.",
   sw:["Chest-Supported Row","Seated Machine Row"]},
  {L:"D",n:"Bent-Over Dumbbell Row",t:"sec",cue:"Torso angle fixed across every set. Drive the elbows back, not down.",
   sw:["Single Arm Dumbbell Row","Barbell Row"]},
  {L:"E",n:"Hammer Strength Pulldown",t:"sec",cue:"Hold the support bars rather than the handles, parallel grip. It puts the pull on the back instead of the biceps.",
   sw:["Close Grip Pulldown","Straight Arm Pulldown"]},
  {L:"F",n:"High Cable Reverse Fly",t:"iso",cue:"Stop just before the handles cross so tension never leaves.",
   sw:["Reverse Pec Deck","Bent-Over Rear Delt Raise"]},
  {L:"G",n:"Cable Face Pull",t:"iso",cue:"High elbows, external rotation at the end of the pull.",
   sw:["Band Face Pull"]},
  {L:"H",n:"Hanging Leg Raise",t:"core",cue:"Curl the pelvis up. Do not just swing the legs.",
   sw:["Roman Chair Leg Raise","Windshield Wiper"]}
 ]},

{d:"Wed", title:"Legs",
 bands:["Banded glute bridge 2x20","Band lateral walk 2x15 each way","Band monster walk 2x15","Bodyweight squats 1x20"],
 bosu:["Bosu single-leg stand 3x30 sec each leg","Bosu single-leg RDL reach 3x8 each leg","Bosu split squat hold 2x20 sec each leg"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Low Bar Back Squat",t:"main",cue:"Warm up thoroughly, belt on for working sets. Depth consistent set to set, or the numbers mean nothing.",
   sw:["High Bar Back Squat","Front Squat","Belt Squat","Smith Machine Squat"]},
  {L:"B",n:"Elevated Romanian Deadlift",t:"main",cue:"Stand on plates or a platform for extra stretch. Lower to mid-shin, then pull through the glutes and squeeze at the top.",
   sw:["Stiff Leg Deadlift","Dumbbell RDL","Barbell Good Morning"]},
  {L:"C",n:"Leg Press",t:"sec",cue:"Foot height matters. Too high shifts the work to glutes and hamstrings, too low puts the knees at risk. Mid-platform, push through the heel, brief pause at the bottom.",
   sw:["Heels-Elevated Goblet Squat (no leg press at your weekday gym — do this instead)","Reverse Hack Squat","Hack Squat","Belt Squat"]},
  {L:"D",n:"Barbell Hip Thrust",t:"sec",cue:"The single best glute builder you can load heavily. Two second hold at lockout, chin tucked.",
   sw:["Glute Focused DB Step-Up","Kettlebell Swing","Single Leg Hip Thrust"]},
  {L:"E",n:"Lying Leg Curl",t:"iso",cue:"Two seconds down on every rep.",
   sw:["Seated Leg Curl","Glute-Hamstring Raise","Banded Leg Curl"]},
  {L:"F",n:"Leg Extension",t:"iso",cue:"Pause and squeeze at the top. Toes slightly out biases the inner quad.",
   sw:["Sissy Squat"]},
  {L:"G",n:"Seated Calf Raise",t:"iso",cue:"Pause at the top and at the bottom. Three to four seconds in the stretch.",
   sw:["Standing Calf Raise","Donkey Calf Raise"]}
 ]},

{d:"Thu", title:"Shoulders",
 bands:["Band pull-aparts 2x20","Band external rotation 2x15 each","Band lateral raise 2x20"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Seated Dumbbell Press",t:"main",cue:"Press until the arms reach parallel, then reverse. Ribs down, glutes tight.",
   sw:["Standing Barbell Overhead Press","Smith Machine Press"]},
  {L:"B",n:"Dumbbell Lateral Raise",t:"sec",cue:"Lead with the elbow. Done before the upright row on purpose, so the side delt is pre-exhausted.",
   sw:["Cable Lateral Raise","Machine Lateral Raise"]},
  {L:"C",n:"Wide Grip Upright Row",t:"sec",cue:"Grip wider than shoulders, elbows toward the ceiling, stop at elbow height. Drop it if the shoulder complains.",
   sw:["Cable Upright Row","Dumbbell High Pull"]},
  {L:"D",n:"Rear Delt Cable Fly",t:"sec",cue:"Stop just before the handles cross.",
   sw:["Reverse Pec Deck","Bent-Over Rear Delt Raise"]},
  {L:"E",n:"Underhand Front Raise",t:"iso",cue:"EZ bar with a narrow underhand grip, or one dumbbell cradled in both palms. From just below parallel to just above.",
   sw:["Plate Front Raise","Cable Front Raise"]},
  {L:"F",n:"Seated Machine Lateral Raise",t:"iso",cue:"Machine at the end so you can go to failure safely.",
   sw:["Banded Lateral Raise"]},
  {L:"G",n:"Barbell Shrug",t:"iso",cue:"Straight up, pause at the top. No rolling.",
   sw:["Dumbbell Shrug","Trap Bar Shrug"]}
 ]},

{d:"Fri", title:"Arms",
 bands:["Band pushdowns 2x20","Band curls 2x20","Band pull-aparts 1x20"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Close Grip Bench Press",t:"main",cue:"Hands just inside shoulder width, elbows tucked. On the Smith, stop at parallel rather than going below.",
   sw:["Weighted Dip","Smith Close Grip Press"]},
  {L:"B",n:"EZ Bar Drag Curl",t:"main",cue:"Drag the bar straight up the body. Squeeze the shoulder blades, let the elbows slide back, hold the top hard.",
   sw:["Barbell Curl","Cable Curl"]},
  {L:"C",n:"Overhead Cable Tricep Extension",t:"sec",cue:"The stretched position is where the long head grows.",
   sw:["Overhead Dumbbell Extension","Lying Skull Crusher"]},
  {L:"D",n:"Preacher Curl",t:"sec",cue:"Do not lock out at the bottom. Keep the tension on.",
   sw:["Machine Preacher Curl","Incline Dumbbell Curl"]},
  {L:"E",n:"Tricep Rope Pushdown",t:"iso",cue:"Elbows pinned. Keep the weight out in front rather than driving it into your legs.",
   sw:["Straight Bar Pushdown","Banded Pushdown"]},
  {L:"F",n:"Alternating Dumbbell Curl",t:"iso",cue:"Turn the wrist up through the rep for more tension at the top.",
   sw:["Hammer Curl","Cross-Body Hammer Curl"]},
  {L:"G",n:"Wrist Curl and Reverse Wrist Curl",t:"iso",cue:"One set of each, back to back. Grip carries over to everything else in the week.",
   sw:["Farmer Carry"]},
  {L:"H",n:"Cable Wood Chop",t:"core",cue:"Rotate from the trunk, not the arms.",
   sw:["Russian DB Twist","Cable Side Crunch"]}
 ]},

{d:"Sat", title:"Upper / Lower",
 bands:["Band pull-aparts 2x20","Banded glute bridge 2x20","Band lateral walk 2x15 each way"],
 bosu:["Bosu single-leg stand 3x30 sec each leg","Bosu plank hold 3x30 sec","Bosu single-leg reach 2x8 each leg"],
 cardio:BIKE, cardioSwap:WALK,
 ex:[
  {L:"A",n:"Front Squat",t:"main",cue:"Elbows high, torso vertical. A different demand than Wednesday's low bar work, and easier on the spine.",
   sw:["Back Squat","Hack Squat","Goblet Squat"]},
  {L:"B",n:"Weighted Pull-up",t:"main",cue:"Bodyweight until you own 3 sets of 8, then start adding load.",
   sw:["Lat Pulldown","Assisted Pull-up"]},
  {L:"C",n:"Incline Dumbbell Press",t:"sec",cue:"Lighter than Monday. This is volume, not a max effort.",
   sw:["Flat Dumbbell Press","Machine Chest Press"]},
  {L:"D",n:"Bulgarian Split Squat",t:"sec",cue:"Rear foot elevated. Long stride loads the glute, short stride loads the quad.",
   sw:["Reverse Lunge","Walking Lunge","Weighted Step-Up"]},
  {L:"E",n:"Chest-Supported Row",t:"sec",cue:"Chest stays on the pad. No body english.",
   sw:["Seated Cable Row","Single Arm Dumbbell Row"]},
  {L:"F",n:"Single-Leg Romanian Deadlift",t:"iso",cue:"Balance and asymmetry work under load. Own it at bodyweight before you add a dumbbell.",
   sw:["Seated Leg Curl","Lying Leg Curl"]},
  {L:"G",n:"Side Lunge",t:"iso",cue:"Frontal plane work for the adductors, the direction nothing else in the week trains. Goblet hold is fine.",
   sw:["Cossack Squat","Lateral Band Walk"]},
  {L:"H",n:"Weighted Plank Hold",t:"core",cue:"30 to 45 seconds a set. Add weight each set and find the heaviest you can hold.",
   sw:["Bosu Plank","Ab Wheel Rollout"]}
 ]},

{d:"Sun", title:"Rest", rest:"Full rest. An easy walk is fine if you want to move, but nothing structured."}
];

/* ---------------------------------------------------------------------------------------------
   Phases 2 to 6 follow this weekly split. Phase 1 keeps the original DAYS above, exactly as written.
     Mon Chest, Tue Quads, Wed Back, Thu Hamstrings and calves, Fri Shoulders, Sat Arms, Sun off.
   Pull-ups are bodyweight (bw:true) and appear twice a week: Back day and Arms day (as a chin-up).
   An exercise's own s and r override the phase scheme, which is how the bodyweight rep range is set.
   --------------------------------------------------------------------------------------------- */
window.DAYS_V2 = [
JSON.parse(JSON.stringify(window.DAYS[0])),   // Monday: its own copy, so extra options never touch Phase 1

{d:"Tue", title:"Quads",
 bands:["Banded glute bridge 2x20","Band lateral walk 2x15 each way","Bodyweight squats 1x20"],
 bosu:["Bosu single-leg stand 3x30 sec each leg","Bosu split squat hold 2x20 sec each leg"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Low Bar Back Squat",t:"main",cue:"Warm up thoroughly, belt on for working sets. Depth consistent set to set, or the numbers mean nothing.",
   sw:["High Bar Back Squat","Front Squat","Smith Machine Back Squat","Belt Squat"]},
  {L:"B",n:"Reverse Hack Squat",t:"main",cue:"Chest against the pad, feet low and close so the knees travel forward. Controlled lowering to full depth, drive through the whole foot.",
   sw:["Hack Squat","Belt Squat","Heels-Elevated Goblet Squat (no machine at your weekday gym, do this instead)"]},
  {L:"C",n:"Leg Press",t:"sec",cue:"Foot height matters. Mid-platform, push through the heel, brief pause at the bottom.",
   sw:["Machine Leg Press","Heels-Elevated Goblet Squat (no leg press at your weekday gym, do this instead)","Belt Squat"]},
  {L:"D",n:"Hack Squat",t:"sec",cue:"Feet a little lower and narrower than you would on a press so the quads stay loaded at the bottom.",
   sw:["Front Squat","Goblet Squat","DB Sumo Squat"]},
  {L:"E",n:"Leg Extension",t:"iso",cue:"Pause and squeeze at the top. Toes slightly out biases the inner quad.",
   sw:["Sissy Squat"]},
  {L:"F",n:"Bulgarian Split Squat",t:"iso",cue:"Rear foot elevated. Short stride loads the quad, long stride loads the glute.",
   sw:["Forward Lunge","Reverse Lunge","Walking Lunge","Weighted Step-Up","Step-up"]},
  {L:"G",n:"Weighted Plank Hold",t:"core",cue:"30 to 45 seconds a set. Add weight each set and find the heaviest you can hold.",
   sw:["Bosu Plank","Ab Wheel Rollout"]}
 ]},

{d:"Wed", title:"Back",
 bands:["Band pull-aparts 2x20","Band lat pulldown 2x15","Band face pulls 2x15"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Pull-up (bodyweight)",t:"main",bw:true,r:"6-10",cue:"Bodyweight only. Full hang to chin over the bar, controlled lowering. Stop one or two reps before form breaks. When you hit the top of the range on every set, slow the lowering to three seconds before anything else.",
   sw:["Incline Pulldown","Neutral Grip Lat Pulldown","Assisted Pull-up"]},
  {L:"B",n:"Low Cable Row",t:"sec",cue:"Sit up high, on a plate or box, so you pull upward. Lean forward into every rep for the stretch, then come upright at the contraction.",
   sw:["Chest-Supported Row","Seated Machine Row"]},
  {L:"C",n:"Bent-Over Dumbbell Row",t:"sec",cue:"Torso angle fixed across every set. Drive the elbows back, not down.",
   sw:["Single Arm Dumbbell Row","Barbell Row"]},
  {L:"D",n:"Hammer Strength Pulldown",t:"sec",cue:"Hold the support bars rather than the handles, parallel grip. It puts the pull on the back instead of the biceps.",
   sw:["Close Grip Pulldown","Straight Arm Pulldown"]},
  {L:"E",n:"High Cable Reverse Fly",t:"iso",cue:"Stop just before the handles cross so tension never leaves.",
   sw:["Reverse Pec Deck","Bent-Over Rear Delt Raise"]},
  {L:"F",n:"Cable Face Pull",t:"iso",cue:"High elbows, external rotation at the end of the pull.",
   sw:["Band Face Pull"]},
  {L:"G",n:"Hanging Leg Raise",t:"core",cue:"Curl the pelvis up. Do not just swing the legs.",
   sw:["Roman Chair Leg Raise","Windshield Wiper"]}
 ]},

{d:"Thu", title:"Hamstrings & Calves",
 bands:["Banded glute bridge 2x20","Band monster walk 2x15","Bodyweight good mornings 1x15"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Elevated Romanian Deadlift",t:"main",cue:"Stand on plates or a platform for extra stretch. Lower to mid-shin, then pull through the glutes and squeeze at the top.",
   sw:["Stiff Leg Deadlift","Dumbbell RDL","Barbell Good Morning"]},
  {L:"B",n:"Lying Leg Curl",t:"main",cue:"Two seconds down on every rep. Hips stay on the pad.",
   sw:["Seated Leg Curl","Glute-Hamstring Raise","Banded Leg Curl"]},
  {L:"C",n:"Seated Leg Curl",t:"sec",cue:"A different hip angle than the lying curl, so it reaches the hamstring differently. Slow on the way back.",
   sw:["Lying Leg Curl","Banded Leg Curl"]},
  {L:"D",n:"Single-Leg Romanian Deadlift",t:"sec",cue:"Balance and asymmetry work under load. Own it at bodyweight before you add a dumbbell.",
   sw:["Barbell Hip Thrust","Glute-Hamstring Raise"]},
  {L:"E",n:"Standing Calf Raise",t:"iso",cue:"Full stretch at the bottom, pause for a count, full squeeze at the top.",
   sw:["Smith Machine Calf Raise","Single Leg Calf Raise"]},
  {L:"F",n:"Seated Calf Raise",t:"iso",cue:"Pause at the top and at the bottom. Three to four seconds in the stretch.",
   sw:["Standing Calf Raise","Donkey Calf Raise"]},
  {L:"G",n:"Donkey Calf Raise",t:"iso",cue:"Deep stretch, slow lowering. Pause at the bottom of every rep.",
   sw:["Single Leg Calf Raise"]},
  {L:"H",n:"Cable Rope Crunch",t:"core",cue:"Kneeling. Round the spine down, do not hinge at the hips.",
   sw:["Ab Crunch Machine","Decline Crunch"]}
 ]},

(function () { var f = JSON.parse(JSON.stringify(window.DAYS[3])); f.d = "Fri"; return f; })(),

{d:"Sat", title:"Arms",
 bands:["Band pushdowns 2x20","Band curls 2x20","Band pull-aparts 1x20"],
 cardio:WALK, cardioSwap:BIKE,
 ex:[
  {L:"A",n:"Close Grip Bench Press",t:"main",cue:"Hands just inside shoulder width, elbows tucked. On the Smith, stop at parallel rather than going below.",
   sw:["Weighted Dip","Smith Close Grip Press"]},
  {L:"B",n:"Chin-up (bodyweight)",t:"main",bw:true,r:"6-10",cue:"Underhand, shoulder width, bodyweight only. This is your second pull-up day of the week, so keep a rep or two in reserve. Squeeze the biceps at the top and lower under control.",
   sw:["Neutral Grip Pull-up","Underhand Lat Pulldown","Assisted Chin-up"]},
  {L:"C",n:"EZ Bar Drag Curl",t:"sec",cue:"Drag the bar straight up the body. Squeeze the shoulder blades, let the elbows slide back, hold the top hard.",
   sw:["Barbell Curl","Cable Curl"]},
  {L:"D",n:"Overhead Cable Tricep Extension",t:"sec",cue:"The stretched position is where the long head grows.",
   sw:["Overhead Dumbbell Extension","Lying Skull Crusher"]},
  {L:"E",n:"Tricep Rope Pushdown",t:"iso",cue:"Elbows pinned. Keep the weight out in front rather than driving it into your legs.",
   sw:["Straight Bar Pushdown","Banded Pushdown"]},
  {L:"F",n:"Preacher Curl",t:"iso",cue:"Do not lock out at the bottom. Keep the tension on.",
   sw:["Machine Preacher Curl","Incline Dumbbell Curl","Alternating Dumbbell Curl"]},
  {L:"G",n:"Wrist Curl and Reverse Wrist Curl",t:"iso",cue:"One set of each, back to back. Grip carries over to everything else in the week.",
   sw:["Farmer Carry"]},
  {L:"H",n:"Cable Wood Chop",t:"core",cue:"Rotate from the trunk, not the arms.",
   sw:["Russian DB Twist","Cable Side Crunch"]}
 ]},

{d:"Sun", title:"Rest", rest:"Full rest. An easy walk is fine if you want to move, but nothing structured."}
];

/* More options on each day, added to the swap lists of Phases 2 to 6 only. */
(function () {
  function addSw(day, name, list) {
    (day.ex || []).forEach(function (e) {
      if (e.n !== name) return;
      e.sw = e.sw || [];
      list.forEach(function (x) { if (x !== e.n && e.sw.indexOf(x) < 0) e.sw.push(x); });
    });
  }
  var D = window.DAYS_V2;
  addSw(D[0], "Incline Dumbbell Press", ["Incline Dumbbell Bench Press"]);
  addSw(D[0], "Seated Machine Chest Press", ["Seated Hammer Chest Press", "Flat Machine Bench Press"]);
  addSw(D[0], "Pec Deck Fly", ["Chest Fly"]);
  addSw(D[2], "Incline Pulldown", []);
  addSw(D[2], "Pull-up (bodyweight)", ["Medium Grip Lat Pulldown"]);
  addSw(D[2], "Low Cable Row", ["Seated Cable Row"]);
  addSw(D[2], "Hammer Strength Pulldown", ["Neutral Grip Lat Pulldown"]);
  addSw(D[3], "Seated Leg Curl", ["Unilateral Standing Leg Curl"]);
  addSw(D[3], "Lying Leg Curl", ["Unilateral Standing Leg Curl"]);
  addSw(D[4], "Dumbbell Lateral Raise", ["Dumbbell Lateral Raises"]);
  addSw(D[4], "Underhand Front Raise", ["Neutral Grip Dumbbell Front Raise"]);
  addSw(D[4], "Seated Dumbbell Press", ["Smith Machine Overhead Press"]);
  addSw(D[4], "Rear Delt Cable Fly", ["Rear Delt Row"]);
  addSw(D[5], "EZ Bar Drag Curl", ["Cable Curl"]);
  addSw(D[5], "Overhead Cable Tricep Extension", ["Cable Forward Tricep Extension"]);
  addSw(D[5], "Tricep Rope Pushdown", ["Tricep Pressdown"]);
  addSw(D[5], "Preacher Curl", ["Hammer Curl"]);
})();

/* ---------------------------------------------------------------------------------------------
   Accessory rotation, Phases 3 to 6. Starts on ROT_FROM so the week already under way is untouched.
   The main lifts never rotate, so records stay comparable from phase to phase.
     Set A (Phases 3 and 6): heavier, more stable choices; pin-loaded or cable isolation, because
                             Phase 3 adds drop sets. Phase 6 reuses it so Phase 3 numbers can be held.
     Set B (Phase 4):        machine and cable variations that are easier on joints as the cut starts.
     Set C (Phase 5):        dumbbell and single-side variations for the lower-volume phase.
   Phase 2 keeps the list above exactly as written. A slot with no entry for a set keeps its exercise.
   The app skips the rotation for any exercise the client has starred, and a swap the client chose
   ("just today" or "every time") always wins over it.
   --------------------------------------------------------------------------------------------- */
window.ROT_FROM = "2026-11-16";
window.ROT_SET = {ph3:"A", ph4:"B", ph5:"C", ph6:"A"};
(function () {
  var D = window.DAYS_V2;
  function rot(day, name, sets) {
    (day.ex || []).forEach(function (e) {
      if (e.n !== name) return;
      e.rot = sets; e.sw = e.sw || [];
      Object.keys(sets).forEach(function (k) { if (sets[k] !== e.n && e.sw.indexOf(sets[k]) < 0) e.sw.push(sets[k]); });
    });
  }
  /* Monday, Chest */
  rot(D[0], "Decline Press",              {A:"Weighted Dip", B:"Decline Barbell Press"});
  rot(D[0], "Seated Machine Chest Press", {A:"Seated Hammer Chest Press", B:"Standing Cable Press", C:"Flat Machine Press"});
  rot(D[0], "Pec Deck Fly",               {B:"Low to High Cable Fly", C:"Incline Dumbbell Fly"});
  rot(D[0], "Dumbbell Pullover",          {A:"Cable Pullover", C:"Cable Pullover"});
  /* Tuesday, Quads */
  rot(D[1], "Leg Press",                  {B:"Belt Squat", C:"Heels-Elevated Goblet Squat"});
  rot(D[1], "Hack Squat",                 {A:"Front Squat", C:"DB Sumo Squat"});
  rot(D[1], "Leg Extension",              {C:"Sissy Squat"});
  rot(D[1], "Bulgarian Split Squat",      {A:"Weighted Step-Up", B:"Reverse Lunge", C:"Walking Lunge"});
  /* Wednesday, Back */
  rot(D[2], "Low Cable Row",              {A:"Chest-Supported Row", B:"Seated Machine Row"});
  rot(D[2], "Bent-Over Dumbbell Row",     {A:"Barbell Row", B:"Single Arm Dumbbell Row"});
  rot(D[2], "Hammer Strength Pulldown",   {A:"Neutral Grip Lat Pulldown", B:"Close Grip Pulldown", C:"Straight Arm Pulldown"});
  rot(D[2], "High Cable Reverse Fly",     {A:"Reverse Pec Deck", C:"Bent-Over Rear Delt Raise"});
  rot(D[2], "Cable Face Pull",            {C:"Band Face Pull"});
  /* Thursday, Hamstrings and calves */
  rot(D[3], "Seated Leg Curl",            {B:"Unilateral Standing Leg Curl"});
  rot(D[3], "Single-Leg Romanian Deadlift", {A:"Barbell Hip Thrust", B:"Glute-Hamstring Raise"});
  rot(D[3], "Standing Calf Raise",        {A:"Smith Machine Calf Raise", C:"Single Leg Calf Raise"});
  rot(D[3], "Donkey Calf Raise",          {B:"Single Leg Calf Raise"});
  /* Friday, Shoulders */
  rot(D[4], "Dumbbell Lateral Raise",     {B:"Cable Lateral Raise", C:"Machine Lateral Raise"});
  rot(D[4], "Wide Grip Upright Row",      {B:"Cable Upright Row", C:"Dumbbell High Pull"});
  rot(D[4], "Rear Delt Cable Fly",        {A:"Rear Delt Row", B:"Reverse Pec Deck", C:"Bent-Over Rear Delt Raise"});
  rot(D[4], "Underhand Front Raise",      {A:"Cable Front Raise", B:"Plate Front Raise", C:"Neutral Grip Dumbbell Front Raise"});
  rot(D[4], "Seated Machine Lateral Raise", {C:"Banded Lateral Raise"});
  rot(D[4], "Barbell Shrug",              {A:"Trap Bar Shrug", B:"Dumbbell Shrug"});
  /* Saturday, Arms */
  rot(D[5], "EZ Bar Drag Curl",           {A:"Barbell Curl", B:"Cable Curl"});
  rot(D[5], "Overhead Cable Tricep Extension", {A:"Lying Skull Crusher", C:"Overhead Dumbbell Extension"});
  rot(D[5], "Tricep Rope Pushdown",       {A:"Straight Bar Pushdown", C:"Tricep Pressdown"});
  rot(D[5], "Preacher Curl",              {A:"Machine Preacher Curl", B:"Incline Dumbbell Curl", C:"Hammer Curl"});

  /* Main lifts that should not drop to the 3 to 4 rep strength option in Phases 3, 5 and 6.
     Low-rep work suits the barbell lifts. On dumbbells, a curl machine or the reverse hack it adds
     risk without adding strength, so these stay on the phase's higher-rep option. */
  function hyp(day, name) { (day.ex || []).forEach(function (e) { if (e.n === name) e.hyp = true; }); }
  hyp(D[0], "Incline Dumbbell Press");
  hyp(D[1], "Reverse Hack Squat");
  hyp(D[3], "Lying Leg Curl");
  hyp(D[4], "Seated Dumbbell Press");

  /* The conventional deadlift (and its trap bar and rack pull variants) is not used in any program, by decision.
     Romanian deadlift variations are a different hinge and stay. */
})();

/* Coaching cues for the rotated exercises. A slot's own cue only fits its own exercise. */
window.ROT_CUES = {
  "Weighted Dip":"Lean forward slightly so the chest takes the load. Lower until the shoulders are just below the elbows, no deeper. Bodyweight first; add load once you own 3 sets of 8.",
  "Seated Hammer Chest Press":"Seat height so the handles line up with mid-chest. Shoulder blades back against the pad, and stop just short of lockout.",
  "Cable Pullover":"Straight bar or rope, with a slight bend in the elbows that never changes. Pull from the lats, ribs down.",
  "Decline Barbell Press":"Bar to the lower chest. Use a spotter or safeties: getting out from under a decline bar alone is the risk.",
  "Standing Cable Press":"Staggered stance, cables at chest height. Press forward and slightly together, ribs down.",
  "Low to High Cable Fly":"Pulleys at the bottom. Sweep up and in to chin height with a slight bend in the elbows.",
  "Flat Machine Press":"Handles at mid-chest. Controlled lowering, stop just short of lockout.",
  "Incline Dumbbell Fly":"Low incline. Open until you feel the stretch across the chest and no further, then squeeze back up.",
  "Front Squat":"Elbows high, torso vertical. Easier on the spine than the low bar squat that opens the day.",
  "Weighted Step-Up":"Whole foot on the box. Drive through the top leg and lower slowly. Do not push off the floor foot.",
  "Belt Squat":"The load hangs from the hips, so the spine gets a break. Sit straight down, knees tracking over the toes.",
  "Reverse Lunge":"Step back, lower the back knee toward the floor, push through the front heel. Torso tall.",
  "Heels-Elevated Goblet Squat":"Heels on a plate or wedge, one dumbbell at the chest. Sit straight down and let the knees travel forward.",
  "DB Sumo Squat":"Wide stance, toes out, one dumbbell hanging between the legs. Knees track over the toes.",
  "Sissy Squat":"Hold a support. Knees travel forward, hips stay open, lean back as one line. Stop where the knees stay comfortable.",
  "Walking Lunge":"Long, even strides. Front heel down, back knee toward the floor, torso tall.",
  "Chest-Supported Row":"Chest stays on the pad. No body english.",
  "Barbell Row":"Hinge to about 45 degrees and keep that angle. Pull to the lower ribs, lower under control.",
  "Neutral Grip Lat Pulldown":"Palms facing each other. Pull the elbows down to your sides, chest up, no leaning back.",
  "Reverse Pec Deck":"Chest on the pad, arms long. Lead with the elbows and stop when the arms are in line with the shoulders.",
  "Seated Machine Row":"Chest tall against the pad. Pull the elbows back past the ribs and pause.",
  "Single Arm Dumbbell Row":"Hand and knee on the bench, flat back. Pull the elbow toward the hip, not the shoulder.",
  "Close Grip Pulldown":"Close handle, slight lean. Pull to the upper chest and squeeze the lats down.",
  "Straight Arm Pulldown":"Arms stay long. Sweep the bar from eye level to the thighs using the lats.",
  "Bent-Over Rear Delt Raise":"Hinge forward with light dumbbells. Lead with the elbows out to the side, no swinging.",
  "Band Face Pull":"Pull to the forehead with high elbows and finish with the hands apart.",
  "Unilateral Standing Leg Curl":"One leg at a time. Hips square, slow on the way down.",
  "Barbell Hip Thrust":"Two second hold at lockout, chin tucked.",
  "Glute-Hamstring Raise":"Hips straight. Lower under control and pull back up with the hamstrings. Use a band or a push off the floor until you own it.",
  "Smith Machine Calf Raise":"Balls of the feet on a plate or step. Full stretch at the bottom, pause, full squeeze at the top.",
  "Single Leg Calf Raise":"Hold a support for balance. Pause at the bottom and at the top.",
  "Cable Lateral Raise":"One arm at a time, cable across the body. Lead with the elbow to shoulder height.",
  "Machine Lateral Raise":"Pads above the elbows. Lift to shoulder height and lower slowly.",
  "Cable Upright Row":"Rope or wide bar. Elbows toward the ceiling, stop at elbow height. Drop it if the shoulder complains.",
  "Dumbbell High Pull":"Elbows lead, high and wide. Dumbbells to lower-chest height.",
  "Rear Delt Row":"Elbows flared wide, pull to the upper chest. Lighter than a normal row.",
  "Cable Front Raise":"Cable behind you. Raise to just above parallel and lower slowly.",
  "Plate Front Raise":"Hold the plate at nine and three. Raise to eye level, lower slowly.",
  "Neutral Grip Dumbbell Front Raise":"Thumbs up. Raise to just above parallel, no swinging.",
  "Banded Lateral Raise":"Stand on the band and lead with the elbows. The band is hardest at the top, so pause there.",
  "Trap Bar Shrug":"Straight up, pause at the top. No rolling.",
  "Dumbbell Shrug":"Straight up, pause at the top. No rolling.",
  "Barbell Curl":"Elbows pinned to your sides. No swinging from the hips.",
  "Cable Curl":"Elbows stay just in front of the hips. Constant tension, squeeze the top.",
  "Lying Skull Crusher":"Lower the bar to just behind the head, elbows pointing at the ceiling. The stretch is the point.",
  "Overhead Dumbbell Extension":"One dumbbell in both hands. Elbows point forward, lower behind the head for the stretch.",
  "Straight Bar Pushdown":"Elbows pinned. Press down, pause, return slowly.",
  "Tricep Pressdown":"Elbows pinned. Press down, pause, return slowly.",
  "Machine Preacher Curl":"Do not lock out at the bottom. Keep the tension on.",
  "Incline Dumbbell Curl":"Lie back on a 45 to 60 degree incline and let the arms hang. Curl without the elbows drifting forward.",
  "Hammer Curl":"Palms facing in. Elbows stay pinned to your sides.",
  "Incline Explosive Push-up":"Hands on a bench. Lower for two counts, then push hard enough that your hands leave it.",
  "Band-Resisted Push-up":"Band across the upper back. Lower for two counts, then push up fast.",
  "Explosive Pull-up":"Pull fast, aiming to bring the chest toward the bar. Lower under control.",
  "Dumbbell Swing":"One dumbbell in both hands. Snap the hips and let the arms just guide.",
  "Landmine Rotation":"Hold the bar end with both hands. Turn through the hips and sweep across, same reps each side.",
  "Jump Squat":"Quarter squat, then jump. Land soft and quiet, reset between reps.",
  "Broad Jump (stick the landing)":"Swing the arms and jump forward. Land soft and hold the landing for a second.",
  "Step-Up with Knee Drive":"Drive off the top leg and lift the other knee to hip height. Control the step down.",
  "Single-Arm Kettlebell Swing":"Same snap as the two-hand swing. Same reps each side.",
  "Skater Hop":"Hop sideways from one leg to the other. Land soft and hold for a second.",
  "Landmine Press":"One arm, half-kneeling or standing. Press up and slightly forward, ribs down.",
  "Landmine Row":"Hinge with a flat back. Pull the elbow to the hip, lower under control."
};

/* ---------------------------------------------------------------------------------------------
   PERSONAL OVERRIDE (coach login only; app.js checks the email). Everyone else keeps the shared plan.
   Goal: add a little muscle, keep what is there, and get leaner by 2026-12-30.
   Runs on Phases 3 and 4 from `from` to `until`; before that date, or after it, the shared program applies.
     - 6-day push / pull / legs, each muscle twice a week: a heavy day (A) and a volume day (B).
     - Accessory work runs at the phase's full set count (Phase 3: 4 secondary, 3 isolation; Phase 4: 3 and 3).
       It was trimmed to 3 and 2 until 2026-11-20, then put back to make the sessions harder.
     - Cardio: a separate PM session on all six lifting days (the weekly goal counts 6 sessions, not 4).
     - Daily targets a little under the shared 1,900 kcal; protein unchanged.
     - Deload week: one set fewer on everything, same weights.
   Exercises are copied from DAYS_V2 by name, so cues, swaps and the accessory rotation come along.
   No hip thrusts, trap bar work or deadlift variants for this login (see BANNED below).
   --------------------------------------------------------------------------------------------- */
window.PERSONAL = (function () {
  var V = window.DAYS_V2, missing = [];
  function find(n) {
    for (var i = 0; i < V.length; i++) for (var j = 0; j < (V[i].ex || []).length; j++) if (V[i].ex[j].n === n) return V[i].ex[j];
    return null;
  }
  function pick(n, o) {
    var s = find(n); if (!s) { missing.push(n); return null; }
    var e = JSON.parse(JSON.stringify(s)); delete e.only;
    if (o) Object.keys(o).forEach(function (k) { e[k] = o[k]; });
    return clean(e);
  }
  /* This login never gets hip thrusts, trap bar work or any deadlift variant, in a slot, a swap list or the rotation. */
  var BANNED = /hip thrust|trap bar|rack pull|^deadlift$/i;
  function clean(e) {
    if (e.sw) e.sw = e.sw.filter(function (n) { return !BANNED.test(n); });
    if (e.rot) Object.keys(e.rot).forEach(function (k) { if (BANNED.test(e.rot[k])) delete e.rot[k]; });
    return e;
  }
  function list(a) { return a.filter(Boolean); }
  var PM = "PM session, separate from lifting (a few hours later if you can): 35-40 min incline treadmill walk, 5 incline at 3.5 mph, holding 8 lb dumbbells. Aim for 10,000 steps across the day.";
  function day(d, title, src, ex, extra) {
    var o = {d: d, title: title, bands: JSON.parse(JSON.stringify((extra && extra.bands) || src.bands || [])), cardio: PM, cardioSwap: BIKE, ex: list(ex)};
    if (extra && extra.bosu) o.bosu = extra.bosu;
    if (extra && extra.cool) o.cool = extra.cool;
    return o;
  }
  /* Power opener: one fast, low-rep move at the top of each lifting day, done fresh. Logged like any other set. */
  function power(n, o) {
    var e = {L: "A", n: n, t: "core", s: 3, rest: "90 sec", tech: ""};
    Object.keys(o).forEach(function (k) { e[k] = o[k]; });
    return clean(e);
  }
  function more(e, names) {
    if (!e) return e;
    e.sw = e.sw || [];
    names.forEach(function (n) { if (n !== e.n && e.sw.indexOf(n) < 0) e.sw.push(n); });
    return clean(e);
  }
  var pallof = clean({L: "A", n: "Pallof Press", t: "core", s: 3, r: "10", tech: "",
    cue: "Stand side-on to the cable. Press straight out, hold one second, and do not let it pull you round. Same reps each side.",
    sw: ["Weighted Plank Hold", "Bosu Plank", "Ab Wheel Rollout"]});
  var cossack = clean({L: "A", n: "Cossack Squat", t: "iso", s: 3, r: "6", tech: "",
    cue: "Wide stance. Sit into one hip with the other leg straight and the toes up, slow down and quick up. Same reps each side. A light dumbbell at the chest is fine.",
    sw: ["Side Lunge", "Goblet Squat"]});
  var barbellRow = clean({L: "B", n: "Barbell Row", t: "main", hyp: true, s: 4,
    cue: (window.ROT_CUES || {})["Barbell Row"] || "Hinge to about 45 degrees and keep that angle. Pull to the lower ribs, lower under control.",
    sw: ["Chest-Supported Row", "Seated Machine Row", "Single Arm Dumbbell Row"]});
  /* Charles Glass's seated single-leg curl, replacing the Elevated Romanian Deadlift on Legs B (not liked). */
  var seatedSingleCurl = clean({L: "A", n: "Seated Single-Leg Curl", t: "main", hyp: true, s: 4,
    cue: "One leg at a time. Put a yoga block or rolled towel behind your back so you sit upright, and set the pad at the Achilles. Focus on the hamstring just behind the knee, and squeeze hard at the bottom of the curl.",
    sw: ["Seated Leg Curl", "Unilateral Standing Leg Curl", "Banded Leg Curl"]});
  var pullThrough = clean({L: "C", n: "Cable Pull-Through", t: "sec",
    cue: "Cable low, rope between the legs, facing away. Push the hips back with soft knees, then squeeze the glutes to stand tall. Ribs down.",
    sw: ["Dumbbell RDL", "Kettlebell Swing", "Glute Focused DB Step-Up"]});
  var days = [
    day("Mon", "Push A (heavy)", V[0], [
      power("Explosive Push-up", {bw: true, r: "5",
        cue: "Lower for two counts, then push hard enough that your hands leave the floor. Stop the set when the pushes slow down.",
        sw: ["Incline Explosive Push-up", "Band-Resisted Push-up"]}),
      pick("Barbell Bench Press", {hyp: true, cue: "Lower for two counts, bar to the lower chest, then press up fast. Stop just short of lockout."}),
      pick("Incline Dumbbell Press"),
      more(pick("Seated Dumbbell Press", {t: "sec", cue: "Lower for two counts, press up fast. Ribs down, glutes tight."}), ["Landmine Press"]),
      pick("Dumbbell Lateral Raise"),
      pick("Tricep Rope Pushdown"),
      pick("Cable Rope Crunch")], {
        bands: ["Band pull-aparts 2x20", "Band chest press 2x15", "Scapular push-ups 2x10", "Open books 1x8 each side"],
        cool: ["Doorway chest stretch 30 sec each side", "Thread the needle 30 sec each side", "Child's pose with reach 30 sec"]}),
    day("Tue", "Pull A (heavy)", V[2], [
      power("Dumbbell High Pull", {r: "5",
        cue: "Dumbbells at mid-thigh. Snap the hips and pull the elbows high and wide, then lower under control. Log the dumbbell weight.",
        sw: ["Explosive Pull-up", "Single-Arm Kettlebell Swing"]}),
      pick("Pull-up (bodyweight)"),
      barbellRow,
      pick("Low Cable Row"),
      pick("Hammer Strength Pulldown"),
      pick("EZ Bar Drag Curl", {t: "sec"}),
      pick("Hanging Leg Raise")], {
        bands: ["Band pull-aparts 2x20", "Band lat pulldown 2x15", "Dead hang 2x20 sec", "Cat-cow 1x8"],
        cool: ["Dead hang 30 sec", "Lat stretch on a rack 30 sec each side", "Cross-body shoulder stretch 30 sec each side"]}),
    day("Wed", "Legs A (quads, heavy)", V[1], [
      power("Box Jump", {bw: true, r: "4",
        cue: "Jump onto the box, land soft and quiet, stand tall, then step down. Reset every rep.",
        sw: ["Jump Squat", "Broad Jump (stick the landing)", "Step-Up with Knee Drive"]}),
      pick("Low Bar Back Squat", {n: "High Bar Back Squat", hyp: true, sw: ["Front Squat", "Smith Machine Back Squat", "Belt Squat", "Low Bar Back Squat"],
        cue: "Bar high on the traps, torso upright. Warm up thoroughly, lower for two counts to the same depth every set, then drive up fast."}),
      pick("Reverse Hack Squat"),
      pick("Leg Press"),
      pick("Leg Extension"),
      pick("Standing Calf Raise"),
      pallof], {
        bosu: V[1].bosu,
        bands: ["Mini band glute bridge 2x20", "Mini band lateral walk 2x15 each way", "Mini band squat 2x12", "Deep squat hold 2x30 sec"],
        cool: ["Couch stretch 45 sec each side", "Deep squat hold 45 sec", "Standing calf stretch 30 sec each side"]}),
    day("Thu", "Push B (volume)", V[0], [
      power("Fast Cable Wood Chop", {r: "5",
        cue: "Light weight. Turn through the hips and chop across fast, then control it back. Same reps each side.",
        sw: ["Landmine Rotation", "Cable Wood Chop"]}),
      pick("Decline Press", {t: "main", hyp: true}),
      pick("Close Grip Bench Press", {hyp: true}),
      pick("Seated Machine Chest Press"),
      pick("Overhead Cable Tricep Extension"),
      pick("Pec Deck Fly"),
      pick("Seated Machine Lateral Raise")], {
        bands: ["Band pull-aparts 2x20", "Band external rotation 2x15 each", "Mini band lateral raise 2x15", "Band shoulder dislocates 2x10"],
        cool: ["Doorway chest stretch 30 sec each side", "Overhead triceps stretch 30 sec each side", "Child's pose with reach 30 sec"]}),
    day("Fri", "Pull B (volume)", V[2], [
      power("Kettlebell Swing", {r: "10",
        cue: "Snap the hips and let the arms just guide. The bell floats to chest height. Stop when the snap slows.",
        sw: ["Single-Arm Kettlebell Swing", "Dumbbell Swing"]}),
      pick("Chin-up (bodyweight)"),
      more(pick("Bent-Over Dumbbell Row", {t: "main", hyp: true, s: 3, rot: null}), ["Landmine Row"]),   /* no Barbell Row rotation: Tuesday already has it */
      pick("Preacher Curl", {t: "sec"}),
      pick("Rear Delt Cable Fly"),
      pick("Cable Face Pull"),
      pick("Barbell Shrug")], {
        bands: ["Band pull-aparts 2x20", "Band face pulls 2x15", "Dead hang 2x20 sec", "Cat-cow 1x8"],
        cool: ["Dead hang 30 sec", "Lat stretch on a rack 30 sec each side", "Cross-body shoulder stretch 30 sec each side"]}),
    day("Sat", "Legs B (hamstrings, glutes)", V[3], [
      power("Lateral Bound", {r: "5",
        cue: "Push off one leg sideways, land on the other and stick it for a second. Eyes forward. Same reps each side.",
        sw: ["Broad Jump (stick the landing)", "Skater Hop"]}),
      seatedSingleCurl,
      pick("Lying Leg Curl"),
      pullThrough,
      pick("Bulgarian Split Squat", {t: "sec"}),
      cossack,
      pick("Seated Calf Raise")], {
        bands: ["Mini band glute bridge 2x20", "Mini band lateral walk 2x15 each way", "Mini band monster walk 2x15", "90/90 hip switches 1x8 each side"],
        cool: ["Seated forward fold 45 sec", "Pigeon stretch 45 sec each side", "90/90 hip stretch 30 sec each side"]}),
    {d: "Sun", title: "Rest", rest: "Full rest. An easy walk is fine if you want to move, but nothing structured."}
  ];
  if (missing.length && window.console) console.warn("PERSONAL split: exercises not found in DAYS_V2:", missing.join(", "));
  return {
    from: "2026-11-16", until: "2026-12-30", phases: ["ph3", "ph4"],
    targets: {k: 1800, p: 160, c: 165, f: 55},
    cardio: {perSession: "35-40 min", sessions: 6},
    /* PM session reminder: due 4 hours after the morning lift is finished, never later than 7:30 pm. */
    pm: {delayMin: 240, latest: "19:30"},
    deload: {from: "2026-12-07", to: "2026-12-13"},
    /* Calorie cycling: kcal added to (or taken from) the daily target by workout day, Mon..Sun. Sums to zero,
       so the weekly average stays at targets.k. Heavier leg and back days eat more; volume days and rest day eat less. */
    cycle: [0, 100, 200, -100, -100, 200, -300],
    /* Final 10 days (12/21 to 12/30): one set fewer on non-main work, 10 g more protein. */
    taper: {from: "2026-12-21", protein: 10},
    days: days
  };
})();
