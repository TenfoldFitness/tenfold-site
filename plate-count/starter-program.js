/* Starter program: 3 cycles x 4 weeks, 4 training days a week (Sun, Mon, Wed, Fri).
   Sun + Fri are the long sessions (about 75 min), Mon + Wed are the short ones (about 30 min).
   Beginner-friendly: built around a cable machine, dumbbells and a straight bar (barbell), no drop sets, no supersets,
   no plyometrics. Rest between sets is built in and drives the rest timer in the app.
   Used only for accounts whose app_metadata.plate_track is "starter" (see starter-setup.sql).
   Tiers: main = big compound, sec = secondary compound, iso = single-joint, core = trunk.
   q* tiers are the 30-minute sessions: qmain, qacc, qcore. */

window.STARTER_PHASES = [
{id:"c1", name:"Cycle 1", sub:"Weeks 1-4 · Foundation", weeks:4, block:"build",
 targets:{k:2000,p:130,c:230,f:55},
 note:"Foundation. Learn each movement, find weights that feel challenging but controlled, and build the habit of showing up four days a week. Pick a weight where the last two reps of each set feel hard but your form stays clean. Write every number down, it is your starting line. You will use dumbbells, the cable machine and your straight bar, and every move has swaps that keep you on that equipment.",
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


/* Index 0 = Monday ... 6 = Sunday.
   Equipment assumed: a cable machine (high and low pulley, straight bar and handle), dumbbells and a straight bar (barbell),
   plus the floor. A flat bench is used only where she already benches; every bench move has a floor version in its swaps. */
window.STARTER_DAYS = [
{d:"Mon", title:"Upper Body Express · 30 min",
 bands:["2 min brisk walk or march in place","Arm circles 10 each way","Shoulder blade squeezes 1x10","Cat-cow 1x8"],
 ex:[
  {L:"A",n:"Dumbbell Bench Press",t:"qmain",cue:"Lie on the bench, feet flat, shoulder blades pinched back. Lower the dumbbells to chest level with control and press up without locking the elbows hard.",
   sw:["Barbell Bench Press","Dumbbell Floor Press (no bench needed)","Push-Up on Knees"]},
  {L:"B",n:"Cable Row",t:"qmain",cue:"Low pulley with a handle or straight bar. Sit or stand tall, pull to your belly button, squeeze your shoulder blades together for a beat, return slowly.",
   sw:["Bent-Over Dumbbell Row","Barbell Bent-Over Row","One-Arm Dumbbell Row (hand on bench)"]},
  {L:"C",n:"Dumbbell Lateral Raise",t:"qacc",cue:"Light weights. Lift to shoulder height, lead with your elbows, no swinging.",
   sw:["Cable Lateral Raise (one arm at a time)","Dumbbell Front Raise"]},
  {L:"D",n:"Dumbbell Hammer Curl",t:"qacc",cue:"Elbows stay pinned to your sides. Lower slowly.",
   sw:["Cable Curl (straight bar)","Dumbbell Biceps Curl","Barbell Curl"]},
  {L:"E",n:"Dead Bug",t:"qcore",cue:"Low back stays pressed into the floor. Move the opposite arm and leg slowly. Reps are per side.",
   sw:["Bird Dog","Forearm Plank (hold 20 to 30 sec)"]}
 ]},

{d:"Tue", title:"Rest day", rest:"Rest day. Easy movement is welcome, like a walk, but nothing required. Your muscles do their growing today."},

{d:"Wed", title:"Lower Body Express · 30 min",
 bands:["2 min brisk walk or march in place","Bodyweight squats 1x10","Glute bridges 1x12","Leg swings 10 each leg"],
 ex:[
  {L:"A",n:"Goblet Squat",t:"qmain",cue:"Hold one dumbbell at your chest. Sit down between your hips, chest tall, heels flat. Squat as deep as you comfortably can with good form.",
   sw:["Barbell Back Squat (only if you have a rack)","Dumbbell Sumo Squat","Bodyweight Box Squat"]},
  {L:"B",n:"Dumbbell Romanian Deadlift",t:"qmain",cue:"Soft knees, push your hips back like closing a car door, dumbbells slide down your thighs. Stop when you feel a hamstring stretch, then stand tall.",
   sw:["Barbell Romanian Deadlift","Cable Pull-Through","Bodyweight Hip Hinge"]},
  {L:"C",n:"Dumbbell Glute Bridge",t:"qacc",cue:"On the floor, dumbbell across your hips. Drive through your heels, squeeze your glutes at the top, ribs down.",
   sw:["Barbell Glute Bridge","Bodyweight Glute Bridge"]},
  {L:"D",n:"Dumbbell Calf Raise",t:"qacc",cue:"Dumbbells at your sides, rise onto your toes, pause at the top, lower slowly. Hold a rack or wall for balance.",
   sw:["Barbell Calf Raise","Bodyweight Calf Raise"]},
  {L:"E",n:"Bird Dog",t:"qcore",cue:"Opposite arm and leg out, hips level. Slow and steady, pause for a second. Reps are per side.",
   sw:["Dead Bug","Side Plank (knees bent, hold 20 to 30 sec)"]}
 ]},

{d:"Thu", title:"Rest day", rest:"Rest day. A walk or some stretching is great if you feel like it."},

{d:"Fri", title:"Full Body B · 75 min",
 bands:["5 min brisk walk or march in place","Glute bridges 1x15","Bird dog 1x8 each side","Arm circles 10 each way","Bodyweight squats 1x10"],
 ex:[
  {L:"A",n:"Dumbbell Hip Thrust (back on the bench)",t:"main",cue:"Upper back on the bench, dumbbell across your hips. Drive up through your heels and squeeze your glutes for a full second at the top.",
   sw:["Dumbbell Glute Bridge (on the floor)","Barbell Glute Bridge (on the floor)","Bodyweight Glute Bridge"]},
  {L:"B",n:"Standing Dumbbell Shoulder Press",t:"main",cue:"Feet hip-width, ribs down, glutes tight. Press until your arms are nearly straight and lower to ear level.",
   sw:["Barbell Overhead Press (standing)","One-Arm Dumbbell Press"]},
  {L:"C",n:"Dumbbell Reverse Lunge",t:"sec",cue:"Step back, lower your back knee toward the floor, push through the front heel to stand. Keep your chest tall. Reps are per leg.",
   sw:["Dumbbell Split Squat (hold a support)","Bodyweight Reverse Lunge","Goblet Squat"]},
  {L:"D",n:"Bent-Over Dumbbell Row",t:"sec",cue:"Hinge forward with a flat back, let the dumbbells hang, pull your elbows back and squeeze. Keep your torso angle the same on every rep.",
   sw:["Cable Row","Barbell Bent-Over Row","One-Arm Dumbbell Row (hand on bench)"]},
  {L:"E",n:"Cable Triceps Pushdown",t:"iso",cue:"High pulley with the straight bar. Elbows pinned to your sides. Press down, pause, return slowly.",
   sw:["Dumbbell Overhead Triceps Extension","Close-Grip Push-Up on Knees"]},
  {L:"F",n:"Cable Pull-Through",t:"iso",cue:"Low pulley with the rope or handle, face away. Push your hips back, then squeeze your glutes to stand tall. It is a hip hinge, not a squat.",
   sw:["Dumbbell Romanian Deadlift","Bodyweight Hip Hinge"]},
  {L:"G",n:"Cable Pallof Press",t:"core",cue:"Cable at chest height, stand sideways. Press out and resist the pull. Reps are per side.",
   sw:["Dead Bug","Bird Dog"]},
  {L:"H",n:"Bird Dog",t:"core",cue:"Opposite arm and leg out, hips level. Slow and steady, pause for a second. Reps are per side.",
   sw:["Dead Bug","Forearm Plank (hold 20 to 30 sec)"]}
 ]},

{d:"Sat", title:"Rest day", rest:"Rest day. If you want to move, take a walk. Weigh in this morning if you can: Saturday weigh-ins set your protein for next week."},

{d:"Sun", title:"Full Body A · 75 min",
 bands:["5 min brisk walk or march in place","Glute bridges 1x15","Bodyweight squats 1x12","Shoulder blade squeezes 1x10","Cat-cow 1x8"],
 ex:[
  {L:"A",n:"Goblet Squat",t:"main",cue:"Hold one dumbbell at your chest. Sit down between your hips, chest tall, heels flat. Squat as deep as you comfortably can with good form.",
   sw:["Barbell Back Squat (only if you have a rack)","Dumbbell Sumo Squat","Bodyweight Box Squat"]},
  {L:"B",n:"Dumbbell Bench Press",t:"main",cue:"Feet flat, shoulder blades pinched back. Lower to about chest level with control, press up without locking out hard.",
   sw:["Barbell Bench Press","Dumbbell Floor Press (no bench needed)","Push-Up on Knees"]},
  {L:"C",n:"Cable Lat Pulldown",t:"sec",cue:"High pulley with the straight bar. Kneel or sit, pull the bar to your upper chest with elbows down toward your pockets. Do not lean way back.",
   sw:["Cable Straight-Arm Pulldown","Bent-Over Dumbbell Row","Barbell Bent-Over Row"]},
  {L:"D",n:"Dumbbell Romanian Deadlift",t:"sec",cue:"Soft knees, push your hips back like closing a car door, dumbbells slide down your thighs. Stop when you feel a hamstring stretch, then stand tall.",
   sw:["Barbell Romanian Deadlift","Cable Pull-Through","Bodyweight Hip Hinge"]},
  {L:"E",n:"Dumbbell Lateral Raise",t:"iso",cue:"Light weights. Lift to shoulder height, lead with your elbows.",
   sw:["Cable Lateral Raise (one arm at a time)","Dumbbell Front Raise"]},
  {L:"F",n:"Dumbbell Biceps Curl",t:"iso",cue:"Elbows stay by your sides. Lower slowly.",
   sw:["Cable Curl (straight bar)","Dumbbell Hammer Curl","Barbell Curl"]},
  {L:"G",n:"Reverse Crunch",t:"core",cue:"Lie on your back, knees bent. Curl your hips off the floor using your lower belly, no swinging.",
   sw:["Forearm Plank (hold 20 to 40 sec)","Plank on Knees (hold 20 to 40 sec)"]},
  {L:"H",n:"Dead Bug",t:"core",cue:"Low back stays pressed into the floor. Move the opposite arm and leg slowly. Reps are per side.",
   sw:["Bird Dog","Forearm Plank (hold 20 to 30 sec)"]}
 ]}
];