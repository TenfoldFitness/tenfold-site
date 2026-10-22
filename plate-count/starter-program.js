/* Starter program: 3 cycles x 4 weeks, 4 training days a week (Sun, Mon, Wed, Fri).
   Sun + Fri are the long sessions (about 75 min), Mon + Wed are the short ones (about 30 min).
   Beginner-friendly: machines and dumbbells, no barbell lifts, no drop sets, no supersets,
   no plyometrics. Rest between sets is built in and drives the rest timer in the app.
   Used only for accounts whose app_metadata.plate_track is "starter" (see starter-setup.sql).
   Tiers: main = big compound, sec = secondary compound, iso = single-joint, core = trunk.
   q* tiers are the 30-minute sessions: qmain, qacc, qcore. */

window.STARTER_PHASES = [
{id:"c1", name:"Cycle 1", sub:"Weeks 1-4 · Foundation", weeks:4, block:"build",
 targets:{k:2000,p:130,c:230,f:55},
 note:"Foundation. Learn each movement, find weights that feel challenging but controlled, and build the habit of showing up four days a week. Pick a weight where the last two reps of each set feel hard but your form stays clean. Write every number down, it is your starting line.",
 tech:"Go slow on the way down (about 2 seconds) and take the full rest between sets. Resting is part of the workout, not a break from it.",
 scheme:{
  main:{h:{w:"1-2",s:3,r:"12-15",rest:"90 sec"}},
  sec: {h:{w:"1",  s:3,r:"12-15",rest:"60 sec"}},
  iso: {h:{w:"0",  s:3,r:"15",   rest:"45 sec"}},
  core:{h:{w:"0",  s:3,r:"10-12",rest:"45 sec"}},
  qmain:{h:{w:"0", s:3,r:"12-15",rest:"60 sec"}},
  qacc: {h:{w:"0", s:3,r:"15",   rest:"45 sec"}},
  qcore:{h:{w:"0", s:2,r:"10-12",rest:"30 sec"}}}},

{id:"c2", name:"Cycle 2", sub:"Weeks 5-8 · Build", weeks:4, block:"build",
 targets:{k:2000,p:130,c:230,f:55},
 note:"Build. The movements are familiar now, so the weights go up and the reps come down a little. When you hit the top of the rep range on every set, add a small amount of weight next time.",
 tech:"Aim to beat last week's weight or reps on at least one exercise each session. Small steps add up fast.",
 scheme:{
  main:{h:{w:"1-2",s:4,r:"10-12",rest:"90 sec"}},
  sec: {h:{w:"1",  s:3,r:"10-12",rest:"60 sec"}},
  iso: {h:{w:"0",  s:3,r:"12-15",rest:"45 sec"}},
  core:{h:{w:"0",  s:3,r:"12-15",rest:"45 sec"}},
  qmain:{h:{w:"0", s:3,r:"10-12",rest:"60 sec"}},
  qacc: {h:{w:"0", s:3,r:"12-15",rest:"45 sec"}},
  qcore:{h:{w:"0", s:2,r:"12-15",rest:"30 sec"}}}},

{id:"c3", name:"Cycle 3", sub:"Weeks 9-12 · Strengthen", weeks:4, block:"build",
 targets:{k:2000,p:130,c:230,f:55},
 note:"Strengthen. These four weeks use your heaviest weights of the program with slightly longer rests so you can lift them well. You have earned this. Compare your numbers to Cycle 1 on the Progress tab and see how far you have come.",
 tech:"Longer rests on the heavy lifts are on purpose. Use all of them so every set is a strong one.",
 scheme:{
  main:{h:{w:"1-2",s:4,r:"8-10",rest:"2 min"}},
  sec: {h:{w:"1",  s:3,r:"10",  rest:"75 sec"}},
  iso: {h:{w:"0",  s:3,r:"12",  rest:"45 sec"}},
  core:{h:{w:"0",  s:3,r:"12-15",rest:"45 sec"}},
  qmain:{h:{w:"0", s:3,r:"8-10", rest:"75 sec"}},
  qacc: {h:{w:"0", s:3,r:"12",   rest:"45 sec"}},
  qcore:{h:{w:"0", s:2,r:"15",   rest:"30 sec"}}}}
];


/* Index 0 = Monday ... 6 = Sunday. */
window.STARTER_DAYS = [
{d:"Mon", title:"Upper Body Express · 30 min",
 bands:["2 min easy march or bike","Arm circles 10 each way","Band pull-aparts 1x15","Shoulder blade squeezes 1x10"],
 ex:[
  {L:"A",n:"Machine Chest Press",t:"qmain",cue:"Seat height so the handles line up with the middle of your chest. Press out smoothly, do not lock the elbows hard.",
   sw:["Dumbbell Bench Press","Incline Push-Up (hands on a bench)","Push-Up on Knees"]},
  {L:"B",n:"Seated Cable Row",t:"qmain",cue:"Sit tall, pull the handle to your belly button, squeeze your shoulder blades together for a beat.",
   sw:["Machine Row","One-Arm Dumbbell Row (hand on bench)","Band Row"]},
  {L:"C",n:"Dumbbell Lateral Raise",t:"qacc",cue:"Light weights. Lift to shoulder height, lead with your elbows, no swinging.",
   sw:["Cable Lateral Raise","Band Lateral Raise"]},
  {L:"D",n:"Dumbbell Hammer Curl",t:"qacc",cue:"Elbows stay pinned to your sides. Lower slowly.",
   sw:["Dumbbell Biceps Curl","Cable Curl","Band Curl"]},
  {L:"E",n:"Dead Bug",t:"qcore",cue:"Low back stays pressed into the floor. Move opposite arm and leg slowly.",
   sw:["Bird Dog","Forearm Plank"]}
 ]},

{d:"Tue", title:"Rest day", rest:"Rest day. Easy movement is welcome, like a walk, but nothing required. Your muscles do their growing today."},

{d:"Wed", title:"Lower Body Express · 30 min",
 bands:["2 min easy march or bike","Bodyweight squats 1x10","Glute bridges 1x12","Leg swings 10 each leg"],
 ex:[
  {L:"A",n:"Leg Press",t:"qmain",cue:"Feet shoulder-width, mid-platform. Lower until your knees are about 90 degrees and push through your whole foot. Do not lock out the knees.",
   sw:["Goblet Squat to a Box","Bodyweight Box Squat","Smith Machine Squat"]},
  {L:"B",n:"Dumbbell Glute Bridge",t:"qmain",cue:"Dumbbell on your hips. Drive through your heels, squeeze your glutes at the top, ribs down.",
   sw:["Bodyweight Glute Bridge","Banded Glute Bridge","Machine Hip Thrust"]},
  {L:"C",n:"Seated Leg Curl",t:"qacc",cue:"Curl smoothly, pause for a second, return slowly.",
   sw:["Lying Leg Curl","Banded Leg Curl"]},
  {L:"D",n:"Standing Calf Raise",t:"qacc",cue:"Pause at the top, slow lowering. Hold a rail for balance.",
   sw:["Seated Calf Raise","Leg Press Calf Raise"]},
  {L:"E",n:"Bird Dog",t:"qcore",cue:"Opposite arm and leg out, hips level. Slow and steady, pause for a second. Reps are per side.",
   sw:["Side Plank (knees bent, hold 20 to 30 sec)","Dead Bug"]}
 ]},

{d:"Thu", title:"Rest day", rest:"Rest day. A walk or some stretching is great if you feel like it."},

{d:"Fri", title:"Full Body B · 75 min",
 bands:["5 min easy bike or treadmill, or a short walk","Glute bridges 1x15","Bird dog 1x8 each side","Arm circles 10 each way","Bodyweight squats 1x10"],

 ex:[
  {L:"A",n:"Dumbbell Hip Thrust (back on a bench)",t:"main",cue:"Upper back on a bench, dumbbell across your hips. Drive up through your heels, squeeze your glutes for a full second at the top.",
   sw:["Dumbbell Glute Bridge (on the floor)","Machine Hip Thrust","Bodyweight Hip Thrust"]},
  {L:"B",n:"Seated Dumbbell Shoulder Press",t:"main",cue:"Back supported, ribs down. Press up until your arms are nearly straight and lower to ear level.",
   sw:["Machine Shoulder Press","Standing Band Press"]},
  {L:"C",n:"Leg Press",t:"sec",cue:"Mid-platform, full controlled range, no locking out the knees.",
   sw:["Goblet Squat","Bodyweight Box Squat"]},
  {L:"D",n:"Machine Row",t:"sec",cue:"Chest against the pad, pull your elbows back, squeeze, and lower slowly.",
   sw:["Seated Cable Row","One-Arm Dumbbell Row (hand on bench)","Band Row"]},
  {L:"E",n:"Triceps Rope Pushdown",t:"iso",cue:"Elbows pinned to your sides. Press down and slightly apart at the bottom.",
   sw:["Bench Dip (feet on the floor)","Band Pushdown","Dumbbell Overhead Triceps Extension"]},
  {L:"F",n:"Lying Leg Curl",t:"iso",cue:"Two seconds down on every rep.",
   sw:["Seated Leg Curl","Banded Leg Curl"]},
  {L:"G",n:"Pallof Press",t:"core",cue:"Cable or band at chest height, stand sideways. Press out and resist the pull. Reps are per side.",
   sw:["Dead Bug","Bird Dog"]},
  {L:"H",n:"Bird Dog",t:"core",cue:"Opposite arm and leg out, hips level. Slow and steady, pause for a second. Reps are per side.",
   sw:["Dead Bug","Forearm Plank"]}
 ]},

{d:"Sat", title:"Rest day", rest:"Rest day. If you want to move, take a walk. Weigh in this morning if you can: Saturday weigh-ins set your protein for next week."},

{d:"Sun", title:"Full Body A · 75 min",
 bands:["5 min easy bike or treadmill, or a short walk","Glute bridges 1x15","Bodyweight squats 1x12","Band pull-aparts 1x15","Cat-cow 1x8"],

 ex:[
  {L:"A",n:"Goblet Squat",t:"main",cue:"Hold one dumbbell at your chest. Sit down between your hips, chest tall, heels flat. Squat as deep as you comfortably can with good form.",
   sw:["Leg Press","Bodyweight Box Squat","Smith Machine Squat"]},
  {L:"B",n:"Dumbbell Bench Press",t:"main",cue:"Feet flat, shoulder blades pinched back. Lower to about chest level with control, press up without locking out hard.",
   sw:["Machine Chest Press","Incline Push-Up (hands on a bench)","Push-Up on Knees"]},
  {L:"C",n:"Lat Pulldown",t:"sec",cue:"Pull the bar to your upper chest, elbows down toward your pockets. Do not lean way back.",
   sw:["Assisted Pull-Up Machine","Band Pulldown","Neutral Grip Pulldown"]},
  {L:"D",n:"Dumbbell Romanian Deadlift",t:"sec",cue:"Soft knees, push your hips back like closing a car door, dumbbells slide down your thighs. Stop when you feel a hamstring stretch, then stand tall.",
   sw:["Cable Pull-Through","Banded Good Morning","Bodyweight Hip Hinge"]},
  {L:"E",n:"Dumbbell Lateral Raise",t:"iso",cue:"Light weights. Lift to shoulder height, lead with your elbows.",
   sw:["Cable Lateral Raise","Band Lateral Raise"]},
  {L:"F",n:"Dumbbell Biceps Curl",t:"iso",cue:"Elbows stay by your sides. Lower slowly.",
   sw:["Dumbbell Hammer Curl","Cable Curl","Band Curl"]},
  {L:"G",n:"Reverse Crunch",t:"core",cue:"Lie on your back, knees bent. Curl your hips off the floor using your lower belly, no swinging.",
   sw:["Forearm Plank (hold 20 to 40 sec)","Plank on Knees (hold 20 to 40 sec)"]},
  {L:"H",n:"Dead Bug",t:"core",cue:"Low back stays pressed into the floor. Move opposite arm and leg slowly. Reps are per side.",
   sw:["Bird Dog","Reverse Crunch"]}
 ]}
];
