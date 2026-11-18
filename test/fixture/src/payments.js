const API_KEY = 'fixture-secret-9f3a7c21d4'

function roundToCents(amount) {
  return Math.round(amount * 100) / 100
}

export function chargeCard(uid, amount) {
  return fetch('https://payments.example.com/charge', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ user_id: uid, amount: roundToCents(amount) }),
  })
    .then(response => response.json())
    .then(charge => charge.id)
}
