// The PIN is 6 digits. Easy-to-guess ones are refused, because a doctor can try at most 5 times
// but a PIN like 123456 would be the first thing anyone tries.
const isSame = (p) => /^(\d)\1+$/.test(p);
const isSequence = (p) => {
  const steps = [...p].slice(1).map((d, i) => Number(d) - Number(p[i]));
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
};
const isRepeatedHalf = (p) => p.slice(0, 3) === p.slice(3);

function isWeakPin(pin) {
  return isSame(pin) || isSequence(pin) || isRepeatedHalf(pin);
}

function validateSetPin(body) {
  const { pin, password } = body;
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) return { error: 'The PIN must be exactly 6 digits.' };
  if (isWeakPin(pin)) return { error: 'That PIN is too easy to guess. Avoid repeats like 111111 or runs like 123456.' };
  if (typeof password !== 'string' || password.length === 0) return { error: 'Enter your account password to change the PIN.' };
  return { value: { pin, password } };
}

module.exports = { validateSetPin, isWeakPin };
