// Runs a validator over the request body before the controller sees it.
// A validator returns { error } or { value }. The cleaned value is put on req.valid.
function validate(validator) {
  return (req, res, next) => {
    const { error, value } = validator(req.body || {});
    if (error) return res.status(400).json({ error });
    req.valid = value;
    next();
  };
}

module.exports = validate;
