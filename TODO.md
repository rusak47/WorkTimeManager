 - store/read data on/from disk
 - exclude breaks from total <- allow to select which tags to use (filtering)
 - allow to write notes while session is running <- early work tagging
 - add cancel session/or reset form on start?
 - save session instantly, yet open edit window
 - maybe allow multiple notes per session, i.e. array
 - fix settings history export <-> session linkage to changes
 - modify UI based on deepsite failed attempt
 - re-try modularity with deepsite
 - last session preview - alow to change layout to grid
 - limit recent session shows only today
 - check tab navigation while session is running 
 - generate work statistics by work subtags
 - statistic - missing refresh button
 - while session is running show when it was started
 - early tagging - select tag pressing on start session (1 tag button dropdown)
 - allow to enter custom tag on the filter
 - fly by tags or/and text in session view
 - delete in-session view
 - layout template to switch on the fly
 - add calendar view and official holidays
   fetch information about "Svētku dienas pēc mēnešiem" from https://rekini123.lv/svetku-dienas-2025/ and return result in json format
fetch infrormation about "1. Noteikt par svētku dienām:" and "2. Noteikt par atceres un atzīmējamām dienām:" from https://likumi.lv/doc.php?id=72608 and return result in such json format:

{
"January":[
{"date":"2025-01-01",
"description":"New Years day",
"type":"holiday"
},
{"2025-01-20",
"description":"1991. gada barikāžu aizstāvju atceres dienu",
"type":"memoriam"}
]
}

Completed:

 - package into electron as a standalone app
