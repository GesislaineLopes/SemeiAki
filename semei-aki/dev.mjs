import { spawn } from 'node:child_process';

const processes = [
  spawn(process.execPath, ['api/server.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'serve'], {
    stdio: 'inherit',
  }),
];
let shuttingDown = false;

function stopProcesses() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of processes) {
    if (child.exitCode === null) {
      child.kill();
    }
  }
}

process.on('SIGINT', stopProcesses);
process.on('SIGTERM', stopProcesses);
for (const child of processes) {
  child.on('error', (error) => {
    console.error('Não foi possível iniciar um dos serviços:', error);
    process.exitCode = 1;
    stopProcesses();
  });
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      process.exitCode = code ?? 1;
      stopProcesses();
    }
  });
}
