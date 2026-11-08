/**
 * scripts/check-discord.mjs
 * Developer utility to verify Discord IPC pipe connection,
 * validate the Discord Application ID, and test handshake.
 */
import net from 'net';

const DEFAULT_DISCORD_APP_ID = '1567903090177343499';

const envId = process.env.DISCORD_CLIENT_ID;
const clientId = (envId && envId.trim()) || DEFAULT_DISCORD_APP_ID;

console.log('--- MyuJiku Discord RPC Checker ---');
console.log(`Checking Discord Application ID: ${clientId}`);

if (!clientId) {
  console.error('\x1b[31m[ERROR] Discord Application ID is missing!\x1b[0m');
  console.log('\nTo configure:');
  console.log('1. Go to https://discord.com/developers/applications');
  console.log('2. Select your Application');
  console.log('3. Copy the "Application ID" (Client ID)');
  console.log('4. Under Rich Presence -> Art Assets, upload "logo", "play", and "pause" assets.');
  process.exit(1);
}

console.log('\x1b[32m[OK]\x1b[0m Application ID is set.');
console.log('Attempting to connect to local Discord IPC pipes (discord-ipc-0 through 9)...');

async function testPipe(index) {
  const pipePath = `\\\\.\\pipe\\discord-ipc-${index}`;
  return new Promise((resolve) => {
    const socket = net.createConnection(pipePath, () => {
      // Send Handshake: Opcode 0
      const body = JSON.stringify({ v: 1, client_id: clientId });
      const bodyBuf = Buffer.from(body, 'utf-8');
      const packet = Buffer.alloc(8 + bodyBuf.length);
      packet.writeUInt32LE(0, 0); // Opcode 0
      packet.writeUInt32LE(bodyBuf.length, 4);
      bodyBuf.copy(packet, 8);
      socket.write(packet);
    });

    let received = false;
    const timeout = setTimeout(() => {
      if (!received) {
        socket.destroy();
        resolve(null);
      }
    }, 2000);

    socket.on('data', (data) => {
      received = true;
      clearTimeout(timeout);
      if (data.length >= 8) {
        const opcode = data.readUInt32LE(0);
        const len = data.readUInt32LE(4);
        const payloadStr = data.subarray(8, 8 + len).toString('utf-8');
        try {
          const json = JSON.parse(payloadStr);
          socket.end();
          resolve({ index, opcode, data: json });
          return;
        } catch {
          // ignore parse errors
        }
      }
      socket.end();
      resolve(null);
    });

    socket.on('error', () => {
      resolve(null);
    });
  });
}

let connected = false;
for (let i = 0; i < 10; i++) {
  const res = await testPipe(i);
  if (res) {
    connected = true;
    console.log(`\x1b[32m[SUCCESS]\x1b[0m Connected to \\\\.\\pipe\\discord-ipc-${res.index}!`);
    console.log(`Opcode: ${res.opcode} (${res.opcode === 1 ? 'READY DISPATCH' : res.opcode === 2 ? 'ERROR' : 'UNKNOWN'})`);
    if (res.data?.data?.user) {
      const u = res.data.data.user;
      console.log(`Discord User: ${u.username} (${u.global_name || u.username}) [ID: ${u.id}]`);
      if (u.avatar) {
        console.log(`Avatar URL: https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`);
      }
    } else {
      console.log('Response data:', JSON.stringify(res.data, null, 2));
    }
    break;
  }
}

if (!connected) {
  console.log('\x1b[33m[INFO]\x1b[0m No active Discord client responded on pipes 0-9.');
  console.log('Make sure Discord (Stable, PTB, or Canary) is running on this machine.');
}
