// Every record type the patient can keep. Add a new model here and it is picked up
// by the routes and by the dashboard summary counts.
module.exports = [
  require('./allergy'),
  require('./condition'),
  require('./visit'),
  require('./medication'),
  require('./labResult'),
];
