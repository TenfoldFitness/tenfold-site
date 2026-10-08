/* 6-phase block, 4 weeks each, 24 weeks total.
   Phases 1-3 run in a surplus and build. Phases 4-6 run in a deficit and
   hold. Strength peaks in Phase 3, while fed, then volume steps down
   through the cut so the muscle built in the first half survives it.
   Tiers: main = heavy compound (strength or hypertrophy option),
   sec = loaded secondary, iso = isolation, core = trunk. */

window.PHASES = [
{id:"ph1", name:"Phase 1", sub:"Weeks 1-4", weeks:4, block:"build", cardio:"20 min",
 targets:{k:2100,p:140,c:258,f:56},
 note:"Foundation. Groove the movements, build work capacity, set your baselines. Pick a weight you could do two more reps with on the first working set and write everything down.",
 tech:"Two-step reps on A and B: pause just before the bottom, then pause again halfway up. It kills momentum and puts the work on the muscle.",
 scheme:{
   main:{h:{w:"2-3",s:3,r:"12-15",rest:"2-3 min"}, s:{w:"2-4",s:3,r:"8",rest:"3 min"}},
   sec: {h:{w:"1-2",s:3,r:"12-15",rest:"90 sec"}},
   iso: {h:{w:"1",  s:3,r:"15",   rest:"45-60 sec"}},
   core:{h:{w:"0",  s:3,r:"15-20",rest:"60 sec"}}}},

{id:"ph2", name:"Phase 2", sub:"Weeks 5-8", weeks:4, block:"build", cardio:"20 min",
 targets:{k:2100,p:140,c:258,f:56},
 note:"Volume. Reps down slightly, a set added to the compounds and secondaries. This is the phase that builds the tissue the next one will load.",
 tech:"Keep the two-step reps. Full range beats extra weight: if the load is shortening your range, it is too heavy.",
 scheme:{
   main:{h:{w:"2-3",s:4,r:"10-12",rest:"2-3 min"}, s:{w:"2-4",s:3,r:"6",rest:"3 min"}},
   sec: {h:{w:"1-2",s:4,r:"10-12",rest:"90 sec"}},
   iso: {h:{w:"1",  s:3,r:"12-15",rest:"45-60 sec"}},
   core:{h:{w:"0",  s:3,r:"15-20",rest:"60 sec"}}}},

{id:"ph3", name:"Phase 3", sub:"Weeks 9-12", weeks:4, block:"build", cardio:"20 min",
 targets:{k:2100,p:140,c:258,f:56},
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
  {L:"A",n:"Deadlift",t:"main",cue:"Reset every rep. Speed off the floor tells you whether the weight is right. Belt on for the working sets.",
   sw:["Trap Bar Deadlift","Rack Pull"]},
  {L:"B",n:"Incline Pulldown",t:"main",cue:"Chest on an incline bench facing the cable. Pull to the chest and lift the torso slightly into the squeeze.",
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
  {L:"A",n:"Deadlift",t:"main",cue:"Reset every rep. Speed off the floor tells you whether the weight is right. Belt on for the working sets.",
   sw:["Trap Bar Deadlift","Rack Pull"]},
  {L:"B",n:"Pull-up (bodyweight)",t:"main",bw:true,r:"6-10",cue:"Bodyweight only. Full hang to chin over the bar, controlled lowering. Stop one or two reps before form breaks. When you hit the top of the range on every set, slow the lowering to three seconds before anything else.",
   sw:["Incline Pulldown","Neutral Grip Lat Pulldown","Assisted Pull-up"]},
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
