# NEPSHOPWEB — local store

## Run it
1. Install Node.js 18+ from nodejs.org
2. Windows: double-click start.bat   |   Mac: double-click start.command   |   or run `node server.js` in a terminal here
3. Open http://localhost:8080

No `npm install` needed (zero dependencies).

## Accounts
- Customers register with any email (Gmail or other) + password.
- Admin: username `kewal`, password `kewal2836` (created on first run).
  Change before going live:  ADMIN_USER=myname ADMIN_PASS=strongpass node server.js
  (only used the first time; delete the `data` folder to re-create).

## AI assistant (NEPSHOP)
1. Create an account at console.anthropic.com, add a little credit, and create an API key (starts with `sk-ant-`).
2. Open `settings.env` in Notepad, paste the key after `ANTHROPIC_API_KEY=`, save.
3. Restart the server. The window should say "AI assistant: ON".
Never share this key or post it online. Without a key the chat still works and "connect to human" still reaches you.

## Data
Everything is saved in the `data/` folder (users, orders, chats, uploaded images). Back it up.
Passwords are stored hashed (scrypt), never in plain text.

## Going public later
Host this folder on a VPS/Render/Railway with HTTPS, set a strong ADMIN_PASS, and keep the
`data` folder on persistent storage. For automatic eSewa/Khalti payment, add their merchant
verification API in server.js (needs your merchant keys).
